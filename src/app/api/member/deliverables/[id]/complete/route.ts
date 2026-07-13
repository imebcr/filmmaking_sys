import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { promises as fs } from 'fs'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { extractVideoMetadata } from '@/lib/deliverable-storage'
import { notifyDeliverableSubmitted } from '@/lib/notifications'
import path from 'path'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const supabase = createServerSupabaseClient()
  const { data: deliverable } = await supabase.from('deliverables').select('*, submitted_by_member:editors(full_name), project:projects(client_name)').eq('id', id).single()
  if (!deliverable || deliverable.submitted_by !== session.user.id || deliverable.status !== 'uploading') {
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
    const meta = await extractVideoMetadata(deliverable.file_path, path.dirname(deliverable.file_path))
    thumbnailPath = meta.thumbnailPath
    durationSeconds = meta.durationSeconds
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

  const memberName = (deliverable.submitted_by_member as { full_name?: string } | null)?.full_name ?? 'Un membre'
  const projectName = (deliverable.project as { client_name?: string } | null)?.client_name ?? 'Projet'
  await notifyDeliverableSubmitted(memberName, projectName, deliverable.version)

  return NextResponse.json({ ok: true, deliverable: updated })
}
