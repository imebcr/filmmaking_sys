const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * Sends a Telegram message via the Zidny bot.
 * No-ops (logs) when TELEGRAM_BOT_TOKEN isn't configured, so local dev
 * and environments without a provisioned bot don't crash.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<{ ok: boolean }> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn(`[Telegram] (no bot token configured) -> ${chatId}: ${text}`)
    return { ok: false }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    const json = await res.json().catch(() => null)
    return { ok: Boolean(json?.ok) }
  } catch (err) {
    console.error('[Telegram] send failed', err)
    return { ok: false }
  }
}
