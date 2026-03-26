/**
 * Notification dispatcher — routes alerts to enabled channels.
 *
 * Channels: in_app (always), email (if enabled), telegram (if enabled + chat_id).
 * Channel preferences are stored on the user's profile.
 */

import { sendAlertEmail, type EmailResult } from './email'
import { sendTelegramMessage, formatAlertTelegram, type TelegramResult } from './telegram'

export type ChannelResults = {
  in_app: boolean
  email: EmailResult | null
  telegram: TelegramResult | null
}

export type UserChannelConfig = {
  email: string | null
  notification_email_enabled: boolean
  notification_telegram_enabled: boolean
  telegram_chat_id: string | null
}

/**
 * Dispatch a notification to all enabled channels for a user.
 *
 * In-app notifications are handled by the cron job (DB insert).
 * This function handles external channels (email, telegram).
 *
 * @param config - User's channel configuration from profile
 * @param title - Notification title
 * @param body - Notification body
 * @param channels - Channels requested by the alert (subset of user prefs)
 */
export async function dispatchNotification(
  config: UserChannelConfig,
  title: string,
  body: string,
  channels: string[] = ['in_app'],
): Promise<ChannelResults> {
  const results: ChannelResults = {
    in_app: true, // Always sent (handled via DB insert in cron)
    email: null,
    telegram: null,
  }

  const promises: Promise<void>[] = []

  // Email channel
  if (channels.includes('email') && config.notification_email_enabled && config.email) {
    promises.push(
      sendAlertEmail(config.email, title, body).then((result) => {
        results.email = result
      }),
    )
  }

  // Telegram channel
  if (
    channels.includes('telegram') &&
    config.notification_telegram_enabled &&
    config.telegram_chat_id
  ) {
    const message = formatAlertTelegram(title, body)
    promises.push(
      sendTelegramMessage(config.telegram_chat_id, message).then((result) => {
        results.telegram = result
      }),
    )
  }

  await Promise.allSettled(promises)

  return results
}

/**
 * Check if a user has any external notification channels configured.
 */
export function hasExternalChannels(config: UserChannelConfig): boolean {
  return (
    (config.notification_email_enabled && !!config.email) ||
    (config.notification_telegram_enabled && !!config.telegram_chat_id)
  )
}
