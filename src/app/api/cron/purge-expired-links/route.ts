import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

/** Daily hygiene job — nulls out client share tokens past their expiry (CDC §9). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('deliverables')
    .update({ client_share_token: null, client_share_expires_at: null })
    .lt('client_share_expires_at', new Date().toISOString())
    .not('client_share_token', 'is', null)
    .select('id')

  if (error) return NextResponse.json({ error: 'Échec de la purge.' }, { status: 500 })
  return NextResponse.json({ ok: true, purged: data?.length ?? 0 })
}
