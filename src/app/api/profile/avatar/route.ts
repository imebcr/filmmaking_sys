import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { resolveProfileIdentity } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { DELIVERABLES_ROOT } from '@/lib/deliverable-storage'

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png' } as const
const MAX_BYTES = 5 * 1024 * 1024
const AVATARS_DIR = path.join(path.dirname(DELIVERABLES_ROOT), 'avatars')

// Deliberately NOT under /api/member/* — see src/app/api/profile/route.ts.
export async function POST(request: Request) {
  const identity = await resolveProfileIdentity(request)
  if (!identity) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('avatar')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image trop volumineuse (max 5 Mo).' }, { status: 413 })

  const ext = ALLOWED[file.type as keyof typeof ALLOWED]
  if (!ext) return NextResponse.json({ error: 'Format non supporté (JPEG ou PNG uniquement).' }, { status: 400 })

  await fs.mkdir(AVATARS_DIR, { recursive: true })
  const filename = `${identity.editorId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(AVATARS_DIR, filename), buffer)

  const avatarUrl = `/api/avatars/${filename}`
  const supabase = createServerSupabaseClient()
  await supabase.from('editors').update({ avatar_url: avatarUrl }).eq('id', identity.editorId)

  return NextResponse.json({ avatarUrl })
}
