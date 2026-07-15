import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { partFileSize } from '@/lib/deliverable-storage'
import { resolveUploaderIdentity, type UploaderIdentity } from '@/lib/upload-identity'

async function loadOwnedUploadingDeliverable(id: string, identity: UploaderIdentity) {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.from('deliverables').select('*').eq('id', id).single()
  if (!data || data.status !== 'uploading') return null
  if (!identity.privileged && data.submitted_by !== identity.editorId) return null
  return data
}

/** Returns the current byte offset written so far, so the client can resume after a cutout. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveUploaderIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const deliverable = await loadOwnedUploadingDeliverable(id, identity)
  if (!deliverable) return NextResponse.json({ error: 'Upload introuvable.' }, { status: 404 })

  const offset = await partFileSize(`${deliverable.file_path}.part`)
  return NextResponse.json({ offset })
}

/** Appends a chunk at the given offset. Rejects (409) if the offset doesn't match what's on disk, so the client re-syncs via GET. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await resolveUploaderIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const deliverable = await loadOwnedUploadingDeliverable(id, identity)
  if (!deliverable) return NextResponse.json({ error: 'Upload introuvable.' }, { status: 404 })

  const declaredOffset = Number(request.headers.get('x-upload-offset'))
  if (!Number.isFinite(declaredOffset)) return NextResponse.json({ error: 'En-tête X-Upload-Offset manquant.' }, { status: 400 })

  const partPath = `${deliverable.file_path}.part`
  const currentOffset = await partFileSize(partPath)
  if (currentOffset !== declaredOffset) {
    return NextResponse.json({ error: 'Décalage désynchronisé.', offset: currentOffset }, { status: 409 })
  }

  const chunk = Buffer.from(await request.arrayBuffer())
  await fs.appendFile(partPath, chunk)
  const newOffset = currentOffset + chunk.length

  return NextResponse.json({ offset: newOffset })
}
