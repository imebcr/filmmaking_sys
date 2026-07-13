import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { hashPassword, hashToken } from '@/lib/member-security'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''

  if (!token || password.length < 8 || password !== confirmPassword) {
    return NextResponse.json({ error: 'Données de réinitialisation invalides.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const tokenHash = hashToken(token)
  const { data: member, error: memberError } = await supabase
    .from('editors')
    .select('*')
    .eq('password_reset_token', tokenHash)
    .gt('password_reset_expires_at', new Date().toISOString())
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Le lien de réinitialisation est invalide ou expiré.' }, { status: 404 })
  }

  const passwordHash = await hashPassword(password)
  const { error: updateError } = await supabase
    .from('editors')
    .update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires_at: null,
    })
    .eq('id', member.id)

  if (updateError) {
    return NextResponse.json({ error: 'Impossible de mettre à jour le mot de passe.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}