import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { extractVideoMetadata } from '@/lib/deliverable-storage'
import { notifyDeliverableSubmitted } from '@/lib/notifications'
import { resolveUploaderIdentity } from '@/lib/upload-identity'
import { createRandomToken, expiresAt } from '@/lib/member-security'
import { STAGES, DELIVERABLE_STAGES, type ProjectStage } from '@/lib/types'
import { STAGE_ROLES } from '@/lib/stage-rules'
import path from 'path'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveUploaderIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const supabase = createServerSupabaseClient()
  const { data: deliverable } = await supabase.from('deliverables').select('*, submitted_by_member:editors(full_name), project:projects(client_name, commercial_id, stage)').eq('id', id).single()
  if (!deliverable || deliverable.status !== 'uploading') {
    return NextResponse.json({ error: 'Upload introuvable.' }, { status: 404 })
  }
  if (!identity.privileged && deliverable.submitted_by !== identity.editorId) {
    return NextResponse.json({ error: 'Upload introuvable.' }, { status: 404 })
  }

  const partPath = `${deliverable.file_path}.part`
  const stat = await fs.stat(partPath).catch(() => null)
  if (!stat || stat.size !== deliverable.size_bytes) {
    return NextResponse.json({ error: 'Upload incomplet — taille reçue différente de la taille annoncée.' }, { status: 400 })
  }

  await fs.rename(partPath, deliverable.file_path)

  let thumbnailPath: string | null = null
  let durationSeconds: number | null = null
  if (deliverable.mime_type.startsWith('video/')) {
    try {
      const meta = await extractVideoMetadata(deliverable.file_path, path.dirname(deliverable.file_path))
      thumbnailPath = meta.thumbnailPath
      durationSeconds = meta.durationSeconds
    } catch (err) {
      console.error('[deliverables/complete] video metadata extraction failed, continuing without it:', err)
    }
  }

  const now = new Date().toISOString()
  const projectInfo = deliverable.project as { client_name?: string; commercial_id?: string | null; stage?: ProjectStage } | null

  // Admin/commercial submitting directly (e.g. on behalf of a member whose account is
  // inactive, or just as a shortcut) IS the review authority — skip the pending
  // "submitted" state and validate immediately, same as clicking "Valider" would.
  if (identity.privileged) {
    const stage = deliverable.stage as ProjectStage
    const isFinalStage = stage === DELIVERABLE_STAGES[DELIVERABLE_STAGES.length - 1]
    const stageIndex = STAGES.indexOf(stage)
    const nextStage: ProjectStage = isFinalStage ? 'delivered' : STAGES[stageIndex + 1]

    let clientShareToken: string | null = null
    let clientShareExpiresAt: string | null = null
    if (isFinalStage) {
      clientShareToken = createRandomToken(16)
      clientShareExpiresAt = expiresAt(60 * 24 * 30) // 30 days
    }

    const { data: updated, error } = await supabase
      .from('deliverables')
      .update({
        status: 'validated',
        submitted_at: now,
        admin_reviewed_at: now,
        admin_decision_at: now,
        thumbnail_path: thumbnailPath,
        duration_seconds: durationSeconds,
        ...(clientShareToken ? { client_share_token: clientShareToken, client_share_expires_at: clientShareExpiresAt } : {}),
      })
      .eq('id', id)
      .select()
      .single()

    if (error || !updated) return NextResponse.json({ error: 'Impossible de finaliser l’upload.' }, { status: 500 })

    // Only nudge the pipeline forward if this was uploaded for the project's actual
    // current stage — a backfilled deliverable for a stage already moved past shouldn't
    // touch project.stage at all.
    let stageComplete = false
    let needsAssignment = false
    if (stage === projectInfo?.stage) {
      const { data: pendingSiblings } = await supabase
        .from('deliverables')
        .select('id')
        .eq('project_id', deliverable.project_id)
        .eq('stage', stage)
        .eq('status', 'submitted')
      stageComplete = (pendingSiblings?.length ?? 0) === 0
      needsAssignment = stageComplete && !isFinalStage && (nextStage === 'editing' || Boolean(STAGE_ROLES[nextStage]))
      const willAdvance = stageComplete && !needsAssignment
      if (willAdvance) {
        await supabase.from('projects').update({ stage: nextStage }).eq('id', deliverable.project_id)
      }
    }

    return NextResponse.json({ ok: true, deliverable: updated, stageComplete, needsAssignment, nextStage })
  }

  const { data: updated, error } = await supabase
    .from('deliverables')
    .update({
      status: 'submitted',
      submitted_at: now,
      thumbnail_path: thumbnailPath,
      duration_seconds: durationSeconds,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) return NextResponse.json({ error: 'Impossible de finaliser l’upload.' }, { status: 500 })

  const memberName = (deliverable.submitted_by_member as { full_name?: string } | null)?.full_name ?? "L'administration"
  const projectName = projectInfo?.client_name ?? 'Projet'
  await notifyDeliverableSubmitted(memberName, projectName, deliverable.version, projectInfo?.commercial_id, deliverable.project_id)

  return NextResponse.json({ ok: true, deliverable: updated })
}
