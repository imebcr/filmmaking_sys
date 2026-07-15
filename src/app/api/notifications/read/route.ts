import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { resolveUploaderIdentity } from '@/lib/upload-identity'

export async function POST(request: Request) {
  const identity = await resolveUploaderIdentity(request)
  if (!identity?.editorId) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', identity.editorId)
    .is('read_at', null)

  if (error) return NextResponse.json({ error: 'Échec.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
