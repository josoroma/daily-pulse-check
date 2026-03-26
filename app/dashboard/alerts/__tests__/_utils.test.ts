import { describe, it, expect } from 'vitest'
import {
  evaluatePriceAlert,
  evaluateRsiAlert,
  evaluateMaCrossAlert,
  evaluateMvrvAlert,
  getNotificationType,
} from '../_utils'

// ============================================================
// evaluatePriceAlert
// ============================================================

describe('evaluatePriceAlert', () => {
  const baseAlert = {
    symbol: 'VOO',
    condition: 'above',
    threshold: 470,
    status: 'active',
    last_triggered_at: null,
  }

  it('fires when price is above threshold', () => {
    const result = evaluatePriceAlert(baseAlert, 475)
    expect(result.fired).toBe(true)
    expect(result.message).toContain('VOO')
    expect(result.message).toContain('risen above')
    expect(result.message).toContain('$470')
  })

  it('fires when price equals threshold (above condition)', () => {
    const result = evaluatePriceAlert(baseAlert, 470)
    expect(result.fired).toBe(true)
  })

  it('does not fire when price is below threshold (above condition)', () => {
    const result = evaluatePriceAlert(baseAlert, 465)
    expect(result.fired).toBe(false)
  })

  it('fires when price is below threshold (below condition)', () => {
    const alert = { ...baseAlert, symbol: 'BTC', condition: 'below', threshold: 80000 }
    const result = evaluatePriceAlert(alert, 79500)
    expect(result.fired).toBe(true)
    expect(result.message).toContain('BTC')
    expect(result.message).toContain('dropped below')
    expect(result.message).toContain('$80,000')
    expect(result.message).toContain('$79,500')
  })

  it('fires when price equals threshold (below condition)', () => {
    const alert = { ...baseAlert, condition: 'below', threshold: 470 }
    const result = evaluatePriceAlert(alert, 470)
    expect(result.fired).toBe(true)
  })

  it('does not fire for paused alerts', () => {
    const alert = { ...baseAlert, status: 'paused' }
    const result = evaluatePriceAlert(alert, 500)
    expect(result.fired).toBe(false)
  })

  it('does not fire for triggered alerts', () => {
    const alert = { ...baseAlert, status: 'triggered' }
    const result = evaluatePriceAlert(alert, 500)
    expect(result.fired).toBe(false)
  })

  it('does not re-trigger already triggered alerts', () => {
    const alert = { ...baseAlert, last_triggered_at: '2026-03-20T10:00:00Z' }
    const result = evaluatePriceAlert(alert, 500)
    expect(result.fired).toBe(false)
  })

  it('returns empty message when not fired', () => {
    const result = evaluatePriceAlert(baseAlert, 400)
    expect(result.message).toBe('')
  })
})

// ============================================================
// evaluateRsiAlert
// ============================================================

describe('evaluateRsiAlert', () => {
  const baseAlert = {
    symbol: 'VOO',
    condition: 'rsi_below',
    threshold: 30,
    status: 'active',
    last_triggered_at: null,
  }

  it('fires RSI oversold alert when RSI drops below threshold', () => {
    const result = evaluateRsiAlert(baseAlert, 28.5)
    expect(result.fired).toBe(true)
    expect(result.message).toContain('oversold')
    expect(result.message).toContain('28.5')
  })

  it('fires RSI overbought alert when RSI exceeds threshold', () => {
    const alert = { ...baseAlert, symbol: 'QQQ', condition: 'rsi_above', threshold: 70 }
    const result = evaluateRsiAlert(alert, 72.3)
    expect(result.fired).toBe(true)
    expect(result.message).toContain('overbought')
    expect(result.message).toContain('72.3')
  })

  it('does not fire when RSI is within range', () => {
    const result = evaluateRsiAlert(baseAlert, 45)
    expect(result.fired).toBe(false)
  })

  it('does not fire for inactive alerts', () => {
    const alert = { ...baseAlert, status: 'paused' }
    const result = evaluateRsiAlert(alert, 20)
    expect(result.fired).toBe(false)
  })

  it('fires when RSI equals threshold (below condition)', () => {
    const result = evaluateRsiAlert(baseAlert, 30)
    expect(result.fired).toBe(true)
  })
})

// ============================================================
// evaluateMaCrossAlert
// ============================================================

describe('evaluateMaCrossAlert', () => {
  const baseAlert = {
    symbol: 'VOO',
    condition: 'ma_cross_below',
    threshold: 0,
    status: 'active',
    last_triggered_at: null,
    parameters: { ma_period: 200 },
  }

  it('fires when price crosses below MA', () => {
    const result = evaluateMaCrossAlert(baseAlert, 442, 445)
    expect(result.fired).toBe(true)
    expect(result.message).toContain('crossed below')
    expect(result.message).toContain('200-day MA')
    expect(result.message).toContain('$445')
    expect(result.message).toContain('$442')
  })

  it('fires when price crosses above MA', () => {
    const alert = { ...baseAlert, condition: 'ma_cross_above' }
    const result = evaluateMaCrossAlert(alert, 450, 445)
    expect(result.fired).toBe(true)
    expect(result.message).toContain('crossed above')
  })

  it('does not fire when price is above MA (below condition)', () => {
    const result = evaluateMaCrossAlert(baseAlert, 450, 445)
    expect(result.fired).toBe(false)
  })

  it('does not fire for already triggered alerts', () => {
    const alert = { ...baseAlert, last_triggered_at: '2026-03-20T10:00:00Z' }
    const result = evaluateMaCrossAlert(alert, 440, 445)
    expect(result.fired).toBe(false)
  })
})

// ============================================================
// evaluateMvrvAlert
// ============================================================

describe('evaluateMvrvAlert', () => {
  const baseAlert = {
    symbol: 'BTC',
    condition: 'mvrv_above',
    threshold: 6,
    status: 'active',
    last_triggered_at: null,
  }

  it('fires when MVRV Z-Score exceeds threshold', () => {
    const result = evaluateMvrvAlert(baseAlert, 6.2)
    expect(result.fired).toBe(true)
    expect(result.message).toContain('elevated')
    expect(result.message).toContain('6.2')
    expect(result.message).toContain('cycle tops')
  })

  it('fires MVRV below alert when Z-Score drops', () => {
    const alert = { ...baseAlert, condition: 'mvrv_below', threshold: 0 }
    const result = evaluateMvrvAlert(alert, -0.5)
    expect(result.fired).toBe(true)
    expect(result.message).toContain('low')
    expect(result.message).toContain('cycle bottoms')
  })

  it('does not fire when Z-Score is within range', () => {
    const result = evaluateMvrvAlert(baseAlert, 3.5)
    expect(result.fired).toBe(false)
  })
})

// ============================================================
// getNotificationType
// ============================================================

describe('getNotificationType', () => {
  it('returns price_alert for price conditions', () => {
    expect(getNotificationType('above')).toBe('price_alert')
    expect(getNotificationType('below')).toBe('price_alert')
  })

  it('returns indicator_alert for indicator conditions', () => {
    expect(getNotificationType('rsi_above')).toBe('indicator_alert')
    expect(getNotificationType('rsi_below')).toBe('indicator_alert')
    expect(getNotificationType('ma_cross_above')).toBe('indicator_alert')
    expect(getNotificationType('mvrv_above')).toBe('indicator_alert')
  })
})
