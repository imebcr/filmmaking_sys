import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import { emailLayout } from '@/lib/email-layout'

const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null
const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Zidny <noreply@zidny.local>'
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const gmailUser = process.env.GMAIL_USER
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
const gmailTransport = gmailUser && gmailAppPassword
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailAppPassword } })
  : null

async function sendMail(to: string, subject: string, html: string) {
  // Gmail SMTP takes priority when configured — free, no domain needed, sends to any real recipient.
  if (gmailTransport) {
    try {
      const info = await gmailTransport.sendMail({ from: `Zidny <${gmailUser}>`, to, subject, html })
      console.log(`[Gmail] sent "${subject}" -> ${to} (id: ${info.messageId})`)
      return { data: info, error: null }
    } catch (err) {
      console.error(`\n[Gmail — send failed] ${subject} -> ${to}\n${err instanceof Error ? err.message : err}\n`)
      return { data: null, error: err }
    }
  }

  if (!resend) {
    // Neither Gmail nor Resend configured — print the email body so the link/token is still usable in dev.
    console.warn(`\n[Email — not configured, printing instead] ${subject} -> ${to}\n${html}\n`)
    return { skipped: true }
  }

  const result = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  })

  // The Resend SDK resolves (doesn't throw) on API-level rejections — e.g. the
  // sandbox sender can only deliver to the account's own verified address.
  // Without this check, a rejected send looks identical to a successful one.
  if (result.error) {
    console.error(`\n[Resend — send rejected] ${subject} -> ${to}\n${result.error.message}\n`)
  } else {
    console.log(`[Resend] sent "${subject}" -> ${to} (id: ${result.data?.id})`)
  }

  return result
}

export async function sendInvitationEmail(email: string, token: string, memberName: string) {
  const link = `${appUrl}/accept-invite?token=${encodeURIComponent(token)}`
  const subject = 'Invitation Zidny'
  return sendMail(email, subject, emailLayout({
    preheader: 'Votre invitation Zidny est prête — activez votre compte.',
    heading: `Bonjour ${memberName} 👋`,
    bodyHtml: `<p style="margin:0 0 8px;">Votre invitation à rejoindre l'espace membre Zidny est prête.</p><p style="margin:0;">Cliquez sur le bouton ci-dessous pour définir votre mot de passe et activer votre compte.</p>`,
    ctaLabel: 'Activer mon compte',
    ctaUrl: link,
  }))
}

export async function sendPasswordResetEmail(email: string, token: string, memberName: string) {
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`
  const subject = 'Réinitialisation de votre mot de passe Zidny'
  return sendMail(email, subject, emailLayout({
    preheader: 'Un changement de mot de passe a été demandé pour votre compte.',
    heading: `Bonjour ${memberName}`,
    bodyHtml: `<p style="margin:0;">Un changement de mot de passe a été demandé pour votre compte Zidny. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>`,
    ctaLabel: 'Définir un nouveau mot de passe',
    ctaUrl: link,
  }))
}

export async function sendProjectAssignedEmail(email: string, memberName: string, projectName: string, projectType: string, deadline: string | null, stageLabel: string) {
  const link = `${appUrl}/me`
  const subject = `Nouveau projet assigné — ${projectName}`
  return sendMail(email, subject, emailLayout({
    preheader: `Le projet ${projectName} vous a été assigné.`,
    heading: `Bonjour ${memberName}`,
    bodyHtml: `<p style="margin:0 0 8px;">Le projet <strong>${projectName}</strong> (${projectType}) vous a été assigné, actuellement à l'étape <strong>${stageLabel}</strong>.</p>${deadline ? `<p style="margin:0;">Échéance : <strong>${deadline}</strong></p>` : ''}`,
    ctaLabel: 'Voir mes projets',
    ctaUrl: link,
  }))
}

export async function sendDeadlineReminderEmail(email: string, memberName: string, projectName: string) {
  const link = `${appUrl}/me`
  const subject = `Rappel — échéance dans 24h : ${projectName}`
  return sendMail(email, subject, emailLayout({
    preheader: `${projectName} arrive à échéance dans moins de 24 heures.`,
    heading: `⏰ Rappel d'échéance`,
    bodyHtml: `<p style="margin:0;">Bonjour ${memberName}, le projet <strong>${projectName}</strong> arrive à échéance dans moins de 24 heures et n'a pas encore été livré.</p>`,
    ctaLabel: 'Ouvrir le projet',
    ctaUrl: link,
  }))
}

export async function sendDeliverableSubmittedEmail(email: string, memberName: string, projectName: string, version: number) {
  const link = `${appUrl}/pipeline`
  const subject = `Livraison à valider — ${projectName}`
  return sendMail(email, subject, emailLayout({
    preheader: `${memberName} a soumis une livraison pour ${projectName}.`,
    heading: 'Livraison à valider',
    bodyHtml: `<p style="margin:0;"><strong>${memberName}</strong> a soumis la version ${version} du livrable pour <strong>${projectName}</strong>.</p>`,
    ctaLabel: 'Ouvrir le pipeline',
    ctaUrl: link,
  }))
}

export async function sendDeliverableValidatedEmail(email: string, memberName: string, projectName: string, isFinalStage: boolean) {
  const link = `${appUrl}/me`
  const subject = `Livraison validée — ${projectName}`
  return sendMail(email, subject, emailLayout({
    preheader: `Votre livraison pour ${projectName} a été validée.`,
    heading: '✅ Livraison validée',
    bodyHtml: `<p style="margin:0 0 8px;">Bonjour ${memberName}, votre livraison pour <strong>${projectName}</strong> a été validée.</p>${isFinalStage ? '<p style="margin:0;color:#0A60AD;font-weight:600;">Le projet est maintenant clôturé.</p>' : ''}`,
    ctaLabel: 'Voir mes projets',
    ctaUrl: link,
  }))
}

export async function sendDeliverableRejectedEmail(email: string, memberName: string, projectName: string, reason: string, comment: string) {
  const link = `${appUrl}/me`
  const subject = `Livraison rejetée — ${projectName}`
  return sendMail(email, subject, emailLayout({
    preheader: `Votre livraison pour ${projectName} a été rejetée.`,
    heading: '❌ Livraison rejetée',
    bodyHtml: `<p style="margin:0 0 8px;">Bonjour ${memberName}, votre livraison pour <strong>${projectName}</strong> a été rejetée.</p><p style="margin:0 0 4px;"><strong>Motif :</strong> ${reason}</p>${comment ? `<p style="margin:0;"><strong>Commentaire :</strong> ${comment}</p>` : ''}`,
    ctaLabel: 'Reprendre le projet',
    ctaUrl: link,
  }))
}

export async function sendProjectReassignedEmail(email: string, memberName: string, projectName: string, isNewAssignee: boolean) {
  const link = `${appUrl}/me`
  const subject = isNewAssignee ? `Projet assigné — ${projectName}` : `Projet retiré — ${projectName}`
  return sendMail(email, subject, emailLayout({
    preheader: isNewAssignee ? `Le projet ${projectName} vous a été assigné.` : `Le projet ${projectName} vous a été retiré.`,
    heading: isNewAssignee ? 'Nouveau projet assigné' : 'Projet retiré',
    bodyHtml: `<p style="margin:0;">Bonjour ${memberName}, ${isNewAssignee ? `le projet <strong>${projectName}</strong> vous a été assigné.` : `le projet <strong>${projectName}</strong> vous a été retiré.`}</p>`,
    ctaLabel: 'Voir mes projets',
    ctaUrl: link,
  }))
}

export async function sendDailyRiskSummaryEmail(email: string, projects: Array<{ name: string; daysLeft: number }>) {
  const rows = projects
    .map((p) => `<tr><td style="padding:6px 0;border-bottom:1px solid #E8EBEF;color:#0C224B;font-size:13px;">${p.name}</td><td style="padding:6px 0;border-bottom:1px solid #E8EBEF;color:#0A60AD;font-size:13px;font-weight:600;text-align:right;">${p.daysLeft}j restants</td></tr>`)
    .join('')
  const subject = `Résumé quotidien — ${projects.length} projet(s) à risque`
  return sendMail(email, subject, emailLayout({
    preheader: `${projects.length} projet(s) approchent de leur échéance.`,
    heading: '📊 Résumé quotidien',
    bodyHtml: projects.length > 0
      ? `<p style="margin:0 0 12px;">Projets dont l'échéance est proche :</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
      : `<p style="margin:0;">Aucun projet à risque aujourd'hui.</p>`,
    ctaLabel: 'Ouvrir le dashboard',
    ctaUrl: `${appUrl}/dashboard`,
  }))
}
