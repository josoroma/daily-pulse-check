/**
 * Email notifications via Resend API.
 *
 * Requires RESEND_API_KEY env var.
 * Sends from a configured sender address (RESEND_FROM_EMAIL).
 */

const RESEND_API_BASE = 'https://api.resend.com'

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  return key
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'alerts@finance.local'
}

export type EmailResult = {
  ok: boolean
  id?: string
  error?: string
}

/**
 * Send an alert notification email.
 *
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param body - Plain text body (also used as HTML fallback)
 */
export async function sendAlertEmail(
  to: string,
  subject: string,
  body: string,
): Promise<EmailResult> {
  const apiKey = getApiKey()

  const response = await fetch(`${RESEND_API_BASE}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromEmail(),
      to: [to],
      subject,
      html: formatAlertEmailHtml(subject, body),
      text: body,
    }),
  })

  const data = (await response.json()) as {
    id?: string
    message?: string
    statusCode?: number
  }

  if (!response.ok) {
    return { ok: false, error: data.message ?? `Resend API error: ${response.status}` }
  }

  return { ok: true, id: data.id }
}

/**
 * Format alert notification as simple HTML email.
 */
function formatAlertEmailHtml(title: string, body: string): string {
  const escapedTitle = escapeHtml(title)
  const escapedBody = escapeHtml(body)

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #10b981;">${escapedTitle}</h2>
  <p style="font-size: 16px; line-height: 1.5; color: #374151;">${escapedBody}</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">
    This alert was sent from your Finance Dashboard.
    <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL ?? '')}/dashboard/alerts" style="color: #10b981;">
      View your alerts
    </a>
  </p>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
