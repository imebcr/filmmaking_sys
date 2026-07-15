// Minimal duplicate of src/lib/telegram.ts's sendTelegramMessage — this process is
// standalone (not part of the Next.js build), so it can't import across that boundary.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn(`[chat-server] (no bot token configured) -> ${chatId}: ${text}`)
    return
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (err) {
    console.error('[chat-server] Telegram send failed:', err.message)
  }
}

module.exports = { sendTelegramMessage }
