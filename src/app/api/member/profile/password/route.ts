import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { hashPassword, verifyPassword } from '@/lib/member-security'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (newPassword.length < 8) return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })

  const supabase = createServerSupabaseClient()
  const { data: member } = await supabase.from('editors').select('password_hash').eq('id', session.user.id).single()
  if (!member?.password_hash || !(await verifyPassword(currentPassword, member.password_hash))) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 400 })
  }

  const passwordHash = await hashPassword(newPassword)
  const { error } = await supabase.from('editors').update({ password_hash: passwordHash }).eq('id', session.user.id)
  if (error) return NextResponse.json({ error: 'Impossible de mettre à jour le mot de passe.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
