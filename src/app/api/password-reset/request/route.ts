import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { createRandomToken, expiresAt, hashToken } from '@/lib/member-security'
import { sendPasswordResetEmail } from '@/lib/mailer'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email) {
    return NextResponse.json({ error: 'Veuillez saisir une adresse e-mail.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const { data: member, error } = await supabase
    .from('editors')
    .select('id, full_name, email')
    .eq('email', email)
    .single()

  if (error || !member) {
    return NextResponse.json({ ok: true })
  }

  const token = createRandomToken()
  const tokenHash = hashToken(token)
  const resetExpiresAt = expiresAt(60)

  const { error: updateError } = await supabase
    .from('editors')
    .update({
      password_reset_token: tokenHash,
      password_reset_expires_at: resetExpiresAt,
    })
    .eq('id', member.id)

  if (updateError) {
    return NextResponse.json({ error: 'Impossible de préparer le lien de réinitialisation.' }, { status: 500 })
  }

  await sendPasswordResetEmail(member.email ?? email, token, member.full_name ?? 'membre')
  return NextResponse.json({ ok: true })
}