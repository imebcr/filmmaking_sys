import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { hashPassword, hashToken } from '@/lib/member-security'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''
  const cguAccepted = Boolean(body?.cguAccepted)

  if (!token || password.length < 8 || password !== confirmPassword || !cguAccepted) {
    return NextResponse.json({ error: 'Données d’activation invalides.' }, { status: 400 })
  }

  const supabase = createServerSupabaseClient()
  const tokenHash = hashToken(token)

  const { data: member, error: memberError } = await supabase
    .from('editors')
    .select('*')
    .eq('invitation_token', tokenHash)
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Le lien d’activation est invalide. Demandez une nouvelle invitation.' }, { status: 404 })
  }

  const passwordHash = await hashPassword(password)
  const { error: updateError } = await supabase
    .from('editors')
    .update({
      password_hash: passwordHash,
      invitation_token: null,
      invitation_expires_at: null,
      account_status: 'active',
      cgu_accepted_at: new Date().toISOString(),
    })
    .eq('id', member.id)

  if (updateError) {
    return NextResponse.json({ error: 'Impossible d’activer le compte.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}