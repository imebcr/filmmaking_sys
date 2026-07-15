import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { getProjectAssigneeIds } from '@/lib/member-access'
import { notifyDeadline24h } from '@/lib/notifications'

/**
 * Meant to be hit hourly by Vercel Cron (or any external scheduler) —
 * this process has no persistent scheduler of its own, so wire this URL
 * into vercel.json `crons` or an OS cron with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  const { data: projects } = await supabase
    .from('projects')
    .select('id, client_name, deadline, stage')
    .neq('stage', 'delivered')
    .gte('deadline', today)
    .lte('deadline', in24h)

  let sent = 0
  for (const project of projects ?? []) {
    const memberIds = await getProjectAssigneeIds(project.id)
    for (const memberId of memberIds) {
      await notifyDeadline24h(memberId, project.client_name, project.id)
      sent++
    }
  }

  return NextResponse.json({ ok: true, projectsChecked: projects?.length ?? 0, notificationsSent: sent })
}
