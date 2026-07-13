import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { memberHasAccessToProject } from '@/lib/member-access'
import { allowedMimeTypesForRoles, deliverableDir, ensureDir, MAX_UPLOAD_BYTES } from '@/lib/deliverable-storage'
import path from 'path'

/**
 * Starts a resumable upload: creates the Deliverable row (status=uploading)
 * and an empty .part file on disk. The client then PATCHes chunks to
 * /api/member/deliverables/[id]/chunk and finally POSTs /complete.
 * This is a simplified offset-based resumable protocol (not the tus.io wire
 * format) chosen to avoid pulling in an external upload server — it gives
 * the same practical guarantee CDC §7.3 asks for: resume after a network cutout.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const projectId = body?.project_id as string | undefined
  const stage = body?.stage as string | undefined
  const filename = body?.filename as string | undefined
  const mimeType = body?.mime_type as string | undefined
  const sizeBytes = Number(body?.size_bytes)
  const notes = typeof body?.notes === 'string' ? body.notes : ''

  if (!projectId || !stage || !filename || !mimeType || !Number.isFinite(sizeBytes)) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (limite 5 Go).' }, { status: 413 })
  }

  const hasAccess = await memberHasAccessToProject(session.user.id, projectId)
  if (!hasAccess) return NextResponse.json({ error: 'Projet non assigné.' }, { status: 403 })

  const supabase = createServerSupabaseClient()
  const { data: member } = await supabase.from('editors').select('roles').eq('id', session.user.id).single()
  const allowedMimes = allowedMimeTypesForRoles(member?.roles ?? [])
  if (!allowedMimes.includes(mimeType)) {
    return NextResponse.json({ error: 'Format de fichier non autorisé pour votre rôle.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('deliverables')
    .select('version')
    .eq('project_id', projectId)
    .eq('stage', stage)
    .order('version', { ascending: false })
    .limit(1)
  const version = (existing?.[0]?.version ?? 0) + 1

  const dir = deliverableDir(projectId, stage, version)
  await ensureDir(dir)
  const filePath = path.join(dir, filename)

  const { data: row, error } = await supabase
    .from('deliverables')
    .insert({
      project_id: projectId,
      stage,
      version,
      submitted_by: session.user.id,
      file_path: filePath,
      size_bytes: sizeBytes,
      mime_type: mimeType,
      status: 'uploading',
      notes,
    })
    .select()
    .single()

  if (error || !row) return NextResponse.json({ error: 'Impossible de démarrer l’upload.' }, { status: 500 })

  return NextResponse.json({ deliverableId: row.id, offset: 0 })
}
