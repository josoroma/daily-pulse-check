/**
 * Telegram Bot API integration for sending alert notifications.
 *
 * Requires TELEGRAM_BOT_TOKEN env var (from BotFather).
 * Users provide their chat_id via Settings → Notifications.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org'

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  return token
}

export type TelegramResult = {
  ok: boolean
  messageId?: number
  error?: string
}

/**
 * Send a text message to a Telegram chat.
 *
 * @param chatId - The Telegram chat ID of the recipient
 * @param text - Message text (supports Markdown v2 formatting)
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<TelegramResult> {
  const token = getBotToken()
  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })

  const data = (await response.json()) as {
    ok: boolean
    result?: { message_id: number }
    description?: string
  }

  if (!data.ok) {
    return { ok: false, error: data.description ?? 'Telegram API error' }
  }

  return { ok: true, messageId: data.result?.message_id }
}

/**
 * Format an alert notification for Telegram.
 */
export function formatAlertTelegram(title: string, body: string): string {
  return `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
