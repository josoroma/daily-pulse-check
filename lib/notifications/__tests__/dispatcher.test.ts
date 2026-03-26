import { describe, it, expect } from 'vitest'
import { hasExternalChannels, type UserChannelConfig } from '../dispatcher'

describe('hasExternalChannels', () => {
  it('returns false when no external channels are configured', () => {
    const config: UserChannelConfig = {
      email: null,
      notification_email_enabled: false,
      notification_telegram_enabled: false,
      telegram_chat_id: null,
    }
    expect(hasExternalChannels(config)).toBe(false)
  })

  it('returns true when email is enabled with valid email', () => {
    const config: UserChannelConfig = {
      email: 'user@example.com',
      notification_email_enabled: true,
      notification_telegram_enabled: false,
      telegram_chat_id: null,
    }
    expect(hasExternalChannels(config)).toBe(true)
  })

  it('returns false when email is enabled but no email address', () => {
    const config: UserChannelConfig = {
      email: null,
      notification_email_enabled: true,
      notification_telegram_enabled: false,
      telegram_chat_id: null,
    }
    expect(hasExternalChannels(config)).toBe(false)
  })

  it('returns true when telegram is enabled with valid chat_id', () => {
    const config: UserChannelConfig = {
      email: null,
      notification_email_enabled: false,
      notification_telegram_enabled: true,
      telegram_chat_id: '123456789',
    }
    expect(hasExternalChannels(config)).toBe(true)
  })

  it('returns false when telegram is enabled but no chat_id', () => {
    const config: UserChannelConfig = {
      email: null,
      notification_email_enabled: false,
      notification_telegram_enabled: true,
      telegram_chat_id: null,
    }
    expect(hasExternalChannels(config)).toBe(false)
  })

  it('returns true when both channels are properly configured', () => {
    const config: UserChannelConfig = {
      email: 'user@example.com',
      notification_email_enabled: true,
      notification_telegram_enabled: true,
      telegram_chat_id: '123456789',
    }
    expect(hasExternalChannels(config)).toBe(true)
  })
})
