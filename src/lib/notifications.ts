import { createServerSupabaseClient } from '@/lib/server-supabase'
import { sendTelegramMessage } from '@/lib/telegram'
import type { TeamMember } from '@/lib/types'
import {
  sendInvitationEmail,
  sendProjectAssignedEmail,
  sendDeadlineReminderEmail,
  sendDeliverableSubmittedEmail,
  sendDeliverableValidatedEmail,
  sendDeliverableRejectedEmail,
  sendProjectReassignedEmail,
  sendDailyRiskSummaryEmail,
} from '@/lib/mailer'

function isQuietHours(member: TeamMember): boolean {
  const now = new Date()
  const hh = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const start = (member.quiet_hours_start ?? '22:00:00').slice(0, 5)
  const end = (member.quiet_hours_end ?? '08:00:00').slice(0, 5)
  if (start <= end) return hh >= start && hh < end
  return hh >= start || hh < end
}

interface NotifyParams {
  recipientId: string
  eventType: string
  payload: Record<string, unknown>
  /** Critical events bypass channel preferences and quiet hours (CDC §6.1). */
  forced?: boolean
  sendEmail: (member: TeamMember) => Promise<unknown>
  telegramText?: (member: TeamMember) => string
}

/** Central notification dispatcher — logs every send to the `notifications` audit table. */
export async function notify(params: NotifyParams): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { data: member, error } = await supabase
    .from('editors')
    .select('*')
    .eq('id', params.recipientId)
    .single()

  if (error || !member) {
    console.warn(`[notify:${params.eventType}] no member found for id "${params.recipientId}" — nothing sent.`, error?.message ?? '')
    return
  }
  const m = member as TeamMember
  const prefs = (m.notification_preferences ?? {}) as { email?: boolean; telegram?: boolean }

  const channels: string[] = []

  const emailEnabled = params.forced || prefs.email !== false
  if (emailEnabled && m.email) {
    await params.sendEmail(m)
    channels.push('email')
  } else if (emailEnabled && !m.email) {
    console.warn(`[notify:${params.eventType}] ${m.full_name} (${m.id}) has no email set — email skipped.`)
  }

  const telegramAllowed = params.forced || (prefs.telegram !== false && !isQuietHours(m))
  if (telegramAllowed && m.telegram_chat_id && params.telegramText) {
    await sendTelegramMessage(m.telegram_chat_id, params.telegramText(m))
    channels.push('telegram')
  }

  if (channels.length === 0) {
    console.warn(`[notify:${params.eventType}] no channel available for ${m.full_name} (${m.id}) — nothing sent.`)
  }

  await supabase.from('notifications').insert({
    recipient_id: params.recipientId,
    event_type: params.eventType,
    channels,
    payload: params.payload,
    delivery_status: channels.length > 0 ? 'sent' : 'failed',
  })
}

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL
const ADMIN_TELEGRAM_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID

/**
 * Admin isn't a row in `editors` (admin auth is Supabase Auth, separate from
 * team members) — notified directly via ADMIN_NOTIFICATION_EMAIL /
 * ADMIN_TELEGRAM_CHAT_ID rather than through the per-member preference/quiet-hours logic.
 */
async function notifyAdmin(eventType: string, payload: Record<string, unknown>, sendEmail: () => Promise<unknown>, telegramText: string) {
  const supabase = createServerSupabaseClient()
  const channels: string[] = []

  if (ADMIN_EMAIL) {
    await sendEmail()
    channels.push('email')
  }
  if (ADMIN_TELEGRAM_CHAT_ID) {
    await sendTelegramMessage(ADMIN_TELEGRAM_CHAT_ID, telegramText)
    channels.push('telegram')
  }

  await supabase.from('notifications').insert({
    recipient_id: null,
    event_type: eventType,
    channels,
    payload,
    delivery_status: channels.length > 0 ? 'sent' : 'failed',
  })
}

export async function notifyInvitationSent(memberId: string, email: string, token: string, memberName: string) {
  await notify({
    recipientId: memberId,
    eventType: 'invitation_sent',
    payload: { email },
    forced: true,
    sendEmail: () => sendInvitationEmail(email, token, memberName),
  })
}

export async function notifyProjectAssigned(memberId: string, projectName: string, projectType: string, deadline: string | null) {
  await notify({
    recipientId: memberId,
    eventType: 'project_assigned',
    payload: { projectName, projectType, deadline },
    sendEmail: (m) => sendProjectAssignedEmail(m.email!, m.full_name, projectName, projectType, deadline),
    telegramText: (m) => `📋 Nouveau projet assigné : <b>${projectName}</b> (${projectType})${deadline ? `\nÉchéance : ${deadline}` : ''}\nBonjour ${m.full_name}`,
  })
}

export async function notifyDeadline24h(memberId: string, projectName: string) {
  await notify({
    recipientId: memberId,
    eventType: 'deadline_24h',
    payload: { projectName },
    forced: true,
    sendEmail: (m) => sendDeadlineReminderEmail(m.email!, m.full_name, projectName),
    telegramText: () => `⏰ Rappel : le projet <b>${projectName}</b> arrive à échéance dans moins de 24h.`,
  })
}

export async function notifyDeliverableSubmitted(memberName: string, projectName: string, version: number) {
  if (!ADMIN_EMAIL) return
  await notifyAdmin(
    'deliverable_submitted',
    { memberName, projectName, version },
    () => sendDeliverableSubmittedEmail(ADMIN_EMAIL, memberName, projectName, version),
    `📥 ${memberName} a soumis la v${version} pour <b>${projectName}</b>.`,
  )
}

export async function notifyDeliverableValidated(memberId: string, projectName: string, isFinalStage: boolean) {
  await notify({
    recipientId: memberId,
    eventType: 'deliverable_validated',
    payload: { projectName, isFinalStage },
    sendEmail: (m) => sendDeliverableValidatedEmail(m.email!, m.full_name, projectName, isFinalStage),
    telegramText: () => `✅ Livraison validée pour <b>${projectName}</b>.${isFinalStage ? ' Projet clôturé.' : ''}`,
  })
}

export async function notifyDeliverableRejected(memberId: string, projectName: string, reason: string, comment: string) {
  await notify({
    recipientId: memberId,
    eventType: 'deliverable_rejected',
    payload: { projectName, reason, comment },
    forced: true,
    sendEmail: (m) => sendDeliverableRejectedEmail(m.email!, m.full_name, projectName, reason, comment),
    telegramText: () => `❌ Livraison rejetée pour <b>${projectName}</b>.\nMotif : ${reason}${comment ? `\n${comment}` : ''}`,
  })
}

export async function notifyDailyRiskSummary(projects: Array<{ name: string; daysLeft: number }>) {
  if (!ADMIN_EMAIL) return
  await notifyAdmin(
    'deadline_summary',
    { count: projects.length },
    () => sendDailyRiskSummaryEmail(ADMIN_EMAIL, projects),
    `📊 Résumé quotidien : ${projects.length} projet(s) à risque.`,
  )
}

export async function notifyProjectReassigned(memberId: string, projectName: string, isNewAssignee: boolean) {
  await notify({
    recipientId: memberId,
    eventType: 'project_reassigned',
    payload: { projectName, isNewAssignee },
    sendEmail: (m) => sendProjectReassignedEmail(m.email!, m.full_name, projectName, isNewAssignee),
    telegramText: () => isNewAssignee ? `📋 Projet assigné : <b>${projectName}</b>.` : `↩️ Projet retiré : <b>${projectName}</b>.`,
  })
}
