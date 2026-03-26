import { describe, it, expect } from 'vitest'
import { formatAlertTelegram } from '../telegram'

describe('formatAlertTelegram', () => {
  it('formats title as bold HTML', () => {
    const result = formatAlertTelegram('Alert: VOO ↑', 'VOO has risen above $500')
    expect(result).toContain('<b>Alert: VOO ↑</b>')
  })

  it('includes body text', () => {
    const result = formatAlertTelegram('Alert: BTC ↓', 'BTC dropped below $90,000')
    expect(result).toContain('BTC dropped below $90,000')
  })

  it('escapes HTML entities in title', () => {
    const result = formatAlertTelegram('Price <$100 & >$50', 'Some body')
    expect(result).toContain('&lt;$100 &amp; &gt;$50')
  })

  it('escapes HTML entities in body', () => {
    const result = formatAlertTelegram('Title', 'MA: $445 < Price: $442')
    expect(result).toContain('$445 &lt; Price: $442')
  })

  it('separates title and body with newlines', () => {
    const result = formatAlertTelegram('Title', 'Body')
    expect(result).toBe('<b>Title</b>\n\nBody')
  })
})
