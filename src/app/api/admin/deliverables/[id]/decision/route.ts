import { NextResponse } from 'next/server'
import { requireAdminOrCommercial } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { createRandomToken, expiresAt } from '@/lib/member-security'
import { notifyDeliverableValidated, notifyDeliverableRejected } from '@/lib/notifications'
import { STAGES, DELIVERABLE_STAGES, type ProjectStage } from '@/lib/types'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminOrCommercial(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await params

  const body = await request.json().catch(() => null)
  const decision = body?.decision as 'validate' | 'reject' | undefined
  const rejectionReason = typeof body?.rejection_reason === 'string' ? body.rejection_reason : ''
  const rejectionComment = typeof body?.rejection_comment === 'string' ? body.rejection_comment : ''

  if (decision !== 'validate' && decision !== 'reject') {
    return NextResponse.json({ error: 'Décision invalide.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: deliverable } = await supabase.from('deliverables').select('*, project:projects(*)').eq('id', id).single()
  if (!deliverable) return NextResponse.json({ error: 'Livrable introuvable.' }, { status: 404 })
  if (deliverable.status !== 'submitted') {
    return NextResponse.json({ error: 'Ce livrable a déjà été traité.' }, { status: 409 })
  }

  const project = deliverable.project as { id: string; client_name: string; stage: ProjectStage; revision_count: number }
  const now = new Date().toISOString()
  const stageIndex = STAGES.indexOf(deliverable.stage as ProjectStage)

  if (decision === 'validate') {
    const isFinalStage = deliverable.stage === DELIVERABLE_STAGES[DELIVERABLE_STAGES.length - 1]
    const nextStage: ProjectStage = isFinalStage ? 'delivered' : STAGES[stageIndex + 1]

    let clientShareToken: string | null = null
    let clientShareExpiresAt: string | null = null
    if (isFinalStage) {
      clientShareToken = createRandomToken(16)
      clientShareExpiresAt = expiresAt(60 * 24 * 30) // 30 days
    }

    await supabase
      .from('deliverables')
      .update({
        status: 'validated',
        admin_reviewed_at: now,
        admin_decision_at: now,
        ...(clientShareToken ? { client_share_token: clientShareToken, client_share_expires_at: clientShareExpiresAt } : {}),
      })
      .eq('id', id)

    await supabase.from('projects').update({ stage: nextStage }).eq('id', project.id)

    if (deliverable.submitted_by) {
      await notifyDeliverableValidated(deliverable.submitted_by, project.client_name, isFinalStage)
    }

    return NextResponse.json({ ok: true, projectStage: nextStage, clientShareToken })
  }

  // reject
  if (!rejectionReason) return NextResponse.json({ error: 'Motif de rejet requis.' }, { status: 400 })

  const previousStage: ProjectStage = stageIndex > 0 ? STAGES[stageIndex - 1] : deliverable.stage

  await supabase
    .from('deliverables')
    .update({
      status: 'rejected',
      admin_reviewed_at: now,
      admin_decision_at: now,
      rejection_reason: rejectionReason,
      rejection_comment: rejectionComment,
    })
    .eq('id', id)

  await supabase
    .from('projects')
    .update({ stage: previousStage, revision_count: (project.revision_count ?? 0) + 1 })
    .eq('id', project.id)

  if (deliverable.submitted_by) {
    await notifyDeliverableRejected(deliverable.submitted_by, project.client_name, rejectionReason, rejectionComment)
  }

  return NextResponse.json({ ok: true, projectStage: previousStage })
}
