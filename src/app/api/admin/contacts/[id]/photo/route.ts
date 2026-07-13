import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { DELIVERABLES_ROOT } from '@/lib/deliverable-storage'

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png' } as const
const MAX_BYTES = 5 * 1024 * 1024
const PHOTOS_DIR = path.join(path.dirname(DELIVERABLES_ROOT), 'contact-photos')

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await params

  const form = await request.formData().catch(() => null)
  const file = form?.get('photo')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image trop volumineuse (max 5 Mo).' }, { status: 413 })

  const ext = ALLOWED[file.type as keyof typeof ALLOWED]
  if (!ext) return NextResponse.json({ error: 'Format non supporté (JPEG ou PNG uniquement).' }, { status: 400 })

  await fs.mkdir(PHOTOS_DIR, { recursive: true })
  const filename = `${id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(PHOTOS_DIR, filename), buffer)

  const photoUrl = `/api/contact-photos/${filename}`
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('contacts').update({ photo_url: photoUrl }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Impossible d’enregistrer la photo.' }, { status: 500 })

  return NextResponse.json({ photoUrl })
}
