import { describe, it, expect } from 'vitest'
import {
  CreatePositionSchema,
  UpdatePositionSchema,
  CreateTransactionSchema,
  CreateAlertSchema,
  CreateProfileSchema,
  CreatePortfolioSchema,
  CreateDcaScheduleSchema,
} from '../_schema'

describe('CreatePositionSchema', () => {
  it('accepts valid position data', () => {
    const result = CreatePositionSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      asset_type: 'ETF',
      symbol: 'VOO',
      quantity: 10,
      average_buy_price: 450.0,
    })
    expect(result.success).toBe(true)
  })

  it('uppercases symbol', () => {
    const result = CreatePositionSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      asset_type: 'Crypto',
      symbol: 'btc',
      quantity: 0.05,
      average_buy_price: 85000,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.symbol).toBe('BTC')
    }
  })

  it('rejects negative quantity', () => {
    const result = CreatePositionSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      asset_type: 'ETF',
      symbol: 'VOO',
      quantity: -5,
      average_buy_price: 450.0,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const quantityError = result.error.issues.find((i) => i.path[0] === 'quantity')
      expect(quantityError?.message).toBe('Quantity must be positive')
    }
  })

  it('rejects zero quantity', () => {
    const result = CreatePositionSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      asset_type: 'ETF',
      symbol: 'QQQ',
      quantity: 0,
      average_buy_price: 350.0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing symbol', () => {
    const result = CreatePositionSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      asset_type: 'ETF',
      symbol: '',
      quantity: 10,
      average_buy_price: 450.0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid asset type', () => {
    const result = CreatePositionSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      asset_type: 'Stock',
      symbol: 'AAPL',
      quantity: 10,
      average_buy_price: 150.0,
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional notes', () => {
    const result = CreatePositionSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      asset_type: 'ETF',
      symbol: 'VOO',
      quantity: 10,
      average_buy_price: 450.0,
      notes: 'Initial position',
    })
    expect(result.success).toBe(true)
  })
})

describe('UpdatePositionSchema', () => {
  it('requires id and allows partial fields', () => {
    const result = UpdatePositionSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 15,
    })
    expect(result.success).toBe(true)
  })

  it('rejects update without id', () => {
    const result = UpdatePositionSchema.safeParse({
      quantity: 15,
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateTransactionSchema', () => {
  it('accepts valid buy transaction', () => {
    const result = CreateTransactionSchema.safeParse({
      position_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Buy',
      quantity: 5,
      price: 450.0,
      fee: 0,
      executed_at: '2026-03-01',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative fee', () => {
    const result = CreateTransactionSchema.safeParse({
      position_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Sell',
      quantity: 3,
      price: 480.0,
      fee: -1,
      executed_at: '2026-03-15',
    })
    expect(result.success).toBe(false)
  })

  it('coerces date string to Date', () => {
    const result = CreateTransactionSchema.safeParse({
      position_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'DCA',
      quantity: 2,
      price: 460.0,
      executed_at: '2026-03-10T14:00:00Z',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.executed_at).toBeInstanceOf(Date)
    }
  })
})

describe('CreateAlertSchema', () => {
  it('accepts valid alert', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'BTC',
      asset_type: 'Crypto',
      condition: 'above',
      threshold: 100000,
    })
    expect(result.success).toBe(true)
  })

  it('defaults notification channels to in_app', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'VOO',
      asset_type: 'ETF',
      condition: 'below',
      threshold: 400,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notification_channels).toEqual(['in_app'])
    }
  })

  it('rejects invalid condition', () => {
    const result = CreateAlertSchema.safeParse({
      symbol: 'VOO',
      asset_type: 'ETF',
      condition: 'equals',
      threshold: 400,
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateProfileSchema', () => {
  it('accepts valid profile', () => {
    const result = CreateProfileSchema.safeParse({
      display_name: 'John Doe',
      base_currency: 'USD',
      country: 'Costa Rica',
      risk_tolerance: 'Medium-High',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing base currency', () => {
    const result = CreateProfileSchema.safeParse({
      display_name: 'Jane Doe',
      country: 'CR',
      risk_tolerance: 'Conservative',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid risk tolerance', () => {
    const result = CreateProfileSchema.safeParse({
      display_name: 'Test User',
      base_currency: 'USD',
      country: 'US',
      risk_tolerance: 'Very High',
    })
    expect(result.success).toBe(false)
  })
})

describe('CreatePortfolioSchema', () => {
  it('accepts valid portfolio', () => {
    const result = CreatePortfolioSchema.safeParse({
      name: 'My Retirement Fund',
      description: 'Long-term investments',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = CreatePortfolioSchema.safeParse({
      name: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateDcaScheduleSchema', () => {
  it('accepts valid DCA schedule', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'VOO',
      asset_type: 'ETF',
      amount: 500,
      frequency: 'Monthly',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid frequency', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'BTC',
      asset_type: 'Crypto',
      amount: 100,
      frequency: 'Yearly',
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
      symbol: 'QQQ',
      asset_type: 'ETF',
      amount: 0,
      frequency: 'Weekly',
    })
    expect(result.success).toBe(false)
  })
})
