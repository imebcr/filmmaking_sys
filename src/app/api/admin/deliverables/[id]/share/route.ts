import { NextResponse } from 'next/server'
import { requireAdminOrCommercial } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { createRandomToken, expiresAt } from '@/lib/member-security'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminOrCommercial(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const days = Number(body?.days) > 0 ? Number(body.days) : 30

  const token = createRandomToken(16)
  const tokenExpiresAt = expiresAt(60 * 24 * days)

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('deliverables')
    .update({ client_share_token: token, client_share_expires_at: tokenExpiresAt })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Impossible de générer le lien.' }, { status: 500 })

  return NextResponse.json({ url: `${appUrl}/share/${token}`, expiresAt: tokenExpiresAt })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminOrCommercial(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await params

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('deliverables')
    .update({ client_share_token: null, client_share_expires_at: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Impossible de révoquer le lien.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
