import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { createRandomToken, hashToken, expiresAt } from '@/lib/member-security'
import { notifyInvitationSent } from '@/lib/notifications'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await params

  const supabase = createServerSupabaseClient()
  const { data: member, error: fetchError } = await supabase.from('editors').select('id, full_name, email').eq('id', id).single()
  if (fetchError || !member) return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 })
  if (!member.email) return NextResponse.json({ error: 'Ce membre n’a pas d’adresse e-mail.' }, { status: 400 })

  const token = createRandomToken()
  const tokenHash = hashToken(token)
  const tokenExpiresAt = expiresAt(60 * 24 * 7) // 7 days

  const { error: updateError } = await supabase
    .from('editors')
    .update({ invitation_token: tokenHash, invitation_expires_at: tokenExpiresAt, account_status: 'invited' })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: 'Impossible de préparer l’invitation.' }, { status: 500 })

  await notifyInvitationSent(id, member.email, token, member.full_name)
  return NextResponse.json({ ok: true })
}
