import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { notifyDailyRiskSummary } from '@/lib/notifications'

/** Meant to fire daily at 8h (Vercel Cron) — CDC §6.2 "Deadline projet < 3j → Admin, résumé quotidien 8h". */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  const { data: projects } = await supabase
    .from('projects')
    .select('client_name, deadline')
    .neq('stage', 'delivered')
    .gte('deadline', today)
    .lte('deadline', in3Days)

  const atRisk = (projects ?? []).map((p) => ({
    name: p.client_name,
    daysLeft: Math.ceil((new Date(p.deadline as string).getTime() - Date.now()) / 86_400_000),
  }))

  await notifyDailyRiskSummary(atRisk)
  return NextResponse.json({ ok: true, count: atRisk.length })
}
