import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { createRandomToken, hashToken, expiresAt } from '@/lib/member-security'
import { sendPasswordResetEmail } from '@/lib/mailer'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await params

  const supabase = createServerSupabaseClient()
  const { data: member, error: fetchError } = await supabase.from('editors').select('id, full_name, email').eq('id', id).single()
  if (fetchError || !member?.email) return NextResponse.json({ error: 'Membre introuvable ou sans e-mail.' }, { status: 404 })

  const token = createRandomToken()
  const tokenHash = hashToken(token)
  const resetExpiresAt = expiresAt(60)

  const { error: updateError } = await supabase
    .from('editors')
    .update({ password_reset_token: tokenHash, password_reset_expires_at: resetExpiresAt })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: 'Impossible de préparer la réinitialisation.' }, { status: 500 })

  await sendPasswordResetEmail(member.email, token, member.full_name)
  return NextResponse.json({ ok: true })
}
