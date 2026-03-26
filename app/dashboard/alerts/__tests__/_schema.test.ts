import { describe, it, expect } from 'vitest'
import { CreateAlertSchema, UpdateAlertSchema, SYMBOL_ASSET_MAP } from '../_schema'

// ============================================================
// CreateAlertSchema
// ============================================================

describe('CreateAlertSchema', () => {
  it('validates a valid price alert', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'VOO',
      condition: 'above',
      threshold: 470,
      notification_channels: ['in_app'],
      parameters: {},
    })
    expect(result.success).toBe(true)
  })

  it('validates a BTC below alert', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'BTC',
      condition: 'below',
      threshold: 80000,
      notification_channels: ['in_app', 'telegram'],
      parameters: {},
    })
    expect(result.success).toBe(true)
  })

  it('validates an RSI alert with parameters', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'QQQ',
      condition: 'rsi_above',
      threshold: 70,
      notification_channels: ['in_app'],
      parameters: { rsi_period: 14 },
    })
    expect(result.success).toBe(true)
  })

  it('validates an MA crossover alert', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'VOO',
      condition: 'ma_cross_below',
      threshold: 445,
      notification_channels: ['in_app'],
      parameters: { ma_period: 200, ma_type: 'SMA' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid symbol', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'AAPL',
      condition: 'above',
      threshold: 200,
      notification_channels: ['in_app'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative threshold', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'VOO',
      condition: 'above',
      threshold: -10,
      notification_channels: ['in_app'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects RSI threshold > 100', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'VOO',
      condition: 'rsi_above',
      threshold: 150,
      notification_channels: ['in_app'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty notification channels', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'VOO',
      condition: 'above',
      threshold: 470,
      notification_channels: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid condition', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'VOO',
      condition: 'unknown',
      threshold: 470,
      notification_channels: ['in_app'],
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// UpdateAlertSchema
// ============================================================

describe('UpdateAlertSchema', () => {
  it('validates updating status only', () => {
    const result = UpdateAlertSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'paused',
    })
    expect(result.success).toBe(true)
  })

  it('validates updating threshold', () => {
    const result = UpdateAlertSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      threshold: 500,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid id', () => {
    const result = UpdateAlertSchema.safeParse({
      id: 'not-a-uuid',
      status: 'active',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = UpdateAlertSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// SYMBOL_ASSET_MAP
// ============================================================

describe('SYMBOL_ASSET_MAP', () => {
  it('maps VOO and QQQ to ETF', () => {
    expect(SYMBOL_ASSET_MAP.VOO).toBe('ETF')
    expect(SYMBOL_ASSET_MAP.QQQ).toBe('ETF')
  })

  it('maps BTC to Crypto', () => {
    expect(SYMBOL_ASSET_MAP.BTC).toBe('Crypto')
  })
})
