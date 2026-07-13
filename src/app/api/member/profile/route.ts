import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const supabase = createServerSupabaseClient()
  const { data: member, error } = await supabase
    .from('editors')
    .select('id, full_name, email, phone, avatar_url, roles, telegram_chat_id, telegram_linked_at, notification_preferences, quiet_hours_start, quiet_hours_end')
    .eq('id', session.user.id)
    .single()

  if (error || !member) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  return NextResponse.json({ member })
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}

  if (typeof body.full_name === 'string') update.full_name = body.full_name.trim()
  if (typeof body.email === 'string') update.email = body.email.trim().toLowerCase()
  if (typeof body.phone === 'string') update.phone = body.phone
  if (body.notification_preferences && typeof body.notification_preferences === 'object') {
    update.notification_preferences = body.notification_preferences
  }
  if (typeof body.quiet_hours_start === 'string') update.quiet_hours_start = body.quiet_hours_start
  if (typeof body.quiet_hours_end === 'string') update.quiet_hours_end = body.quiet_hours_end

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('editors').update(update).eq('id', session.user.id)
  if (error) return NextResponse.json({ error: 'Impossible de mettre à jour le profil.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
