import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { extractVideoMetadata } from '@/lib/deliverable-storage'
import { notifyDeliverableSubmitted } from '@/lib/notifications'
import { resolveUploaderIdentity } from '@/lib/upload-identity'
import path from 'path'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveUploaderIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const supabase = createServerSupabaseClient()
  const { data: deliverable } = await supabase.from('deliverables').select('*, submitted_by_member:editors(full_name), project:projects(client_name, commercial_id)').eq('id', id).single()
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

  const { data: updated, error } = await supabase
    .from('deliverables')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      thumbnail_path: thumbnailPath,
      duration_seconds: durationSeconds,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) return NextResponse.json({ error: 'Impossible de finaliser l’upload.' }, { status: 500 })

  const memberName = (deliverable.submitted_by_member as { full_name?: string } | null)?.full_name ?? "L'administration"
  const projectInfo = deliverable.project as { client_name?: string; commercial_id?: string | null } | null
  const projectName = projectInfo?.client_name ?? 'Projet'
  await notifyDeliverableSubmitted(memberName, projectName, deliverable.version, projectInfo?.commercial_id)

  return NextResponse.json({ ok: true, deliverable: updated })
}
