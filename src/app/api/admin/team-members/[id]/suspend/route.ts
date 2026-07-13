import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const suspend = body?.suspend !== false

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('editors')
    .update({ account_status: suspend ? 'suspended' : 'active' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Impossible de mettre à jour le statut.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
