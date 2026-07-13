import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { promises as fs } from 'fs'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { partFileSize } from '@/lib/deliverable-storage'

async function loadOwnedUploadingDeliverable(id: string, memberId: string) {
  const supabase = createServerSupabaseClient()
  const { data } = await supabase.from('deliverables').select('*').eq('id', id).single()
  if (!data || data.submitted_by !== memberId || data.status !== 'uploading') return null
  return data
}

/** Returns the current byte offset written so far, so the client can resume after a cutout. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const deliverable = await loadOwnedUploadingDeliverable(id, session.user.id)
  if (!deliverable) return NextResponse.json({ error: 'Upload introuvable.' }, { status: 404 })

  const offset = await partFileSize(`${deliverable.file_path}.part`)
  return NextResponse.json({ offset })
}

/** Appends a chunk at the given offset. Rejects (409) if the offset doesn't match what's on disk, so the client re-syncs via GET. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const { id } = await params

  const deliverable = await loadOwnedUploadingDeliverable(id, session.user.id)
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
