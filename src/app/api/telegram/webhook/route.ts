import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { sendTelegramMessage } from '@/lib/telegram'

/**
 * Telegram bot webhook — point your bot's webhook URL here
 * (https://api.telegram.org/bot<token>/setWebhook?url=<APP_URL>/api/telegram/webhook).
 * Handles the `/start <code>` linking flow from CDC §6.3.
 */
export async function POST(request: Request) {
  const update = await request.json().catch(() => null)
  const message = update?.message
  const text: string | undefined = message?.text
  const chatId: string | undefined = message?.chat?.id?.toString()

  if (!text || !chatId) return NextResponse.json({ ok: true })

  const match = text.trim().match(/^\/start\s+([A-Z0-9]{6})$/i)
  if (!match) {
    console.warn(`[telegram-webhook] chat ${chatId} sent a non-matching /start command: "${text}"`)
    await sendTelegramMessage(chatId, 'Envoyez /start suivi du code affiché dans votre profil Zidny pour lier votre compte.')
    return NextResponse.json({ ok: true })
  }

  const code = match[1].toUpperCase()
  const supabase = createServerSupabaseClient()
  const { data: member, error: lookupError } = await supabase
    .from('editors')
    .select('id, full_name, telegram_link_code, telegram_link_code_expires_at')
    .eq('telegram_link_code', code)
    .maybeSingle()

  if (lookupError) console.error(`[telegram-webhook] lookup failed for code ${code}:`, lookupError.message)

  if (!member || !member.telegram_link_code_expires_at || new Date(member.telegram_link_code_expires_at) < new Date()) {
    console.warn(`[telegram-webhook] code ${code} from chat ${chatId} is ${!member ? 'unknown' : 'expired'} (expires_at=${member?.telegram_link_code_expires_at ?? 'n/a'})`)
    await sendTelegramMessage(chatId, 'Ce code est invalide ou a expiré. Générez-en un nouveau depuis votre profil Zidny.')
    return NextResponse.json({ ok: true })
  }

  const { error: updateError } = await supabase
    .from('editors')
    .update({
      telegram_chat_id: chatId,
      telegram_linked_at: new Date().toISOString(),
      telegram_link_code: null,
      telegram_link_code_expires_at: null,
    })
    .eq('id', member.id)

  if (updateError) {
    console.error(`[telegram-webhook] failed to link chat ${chatId} to editor ${member.id}:`, updateError.message)
    await sendTelegramMessage(chatId, 'Une erreur est survenue côté serveur. Réessayez depuis votre profil Zidny.')
    return NextResponse.json({ ok: true })
  }

  console.log(`[telegram-webhook] linked chat ${chatId} to editor ${member.id} (${member.full_name})`)
  await sendTelegramMessage(chatId, `✅ Telegram lié avec succès, ${member.full_name}. Vous recevrez désormais vos notifications Zidny ici.`)
  return NextResponse.json({ ok: true })
}
