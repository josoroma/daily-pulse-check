import { describe, it, expect } from 'vitest'
import { CreateDcaScheduleSchema, UpdateDcaScheduleSchema } from '../_schema'

describe('CreateDcaScheduleSchema', () => {
  const validBase = {
    portfolio_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    symbol: 'VOO',
    asset_type: 'ETF' as const,
    amount: 100,
  }

  it('validates a daily schedule without day fields', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Daily',
    })
    expect(result.success).toBe(true)
  })

  it('validates a weekly schedule with day_of_week', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Weekly',
      day_of_week: 1, // Monday
    })
    expect(result.success).toBe(true)
  })

  it('rejects weekly schedule without day_of_week', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Weekly',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Day of week is required')
    }
  })

  it('validates a biweekly schedule with day_of_week', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Biweekly',
      day_of_week: 5, // Friday
    })
    expect(result.success).toBe(true)
  })

  it('rejects biweekly schedule without day_of_week', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Biweekly',
    })
    expect(result.success).toBe(false)
  })

  it('validates a monthly schedule with day_of_month', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Monthly',
      day_of_month: 15,
    })
    expect(result.success).toBe(true)
  })

  it('rejects monthly schedule without day_of_month', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Monthly',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Day of month is required')
    }
  })

  it('uppercases symbol', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      symbol: 'btc',
      frequency: 'Daily',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.symbol).toBe('BTC')
    }
  })

  it('rejects zero amount', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      amount: 0,
      frequency: 'Daily',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      amount: -50,
      frequency: 'Daily',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid frequency', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Yearly',
    })
    expect(result.success).toBe(false)
  })

  it('rejects day_of_week out of range', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Weekly',
      day_of_week: 7,
    })
    expect(result.success).toBe(false)
  })

  it('rejects day_of_month out of range', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      frequency: 'Monthly',
      day_of_month: 32,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty symbol', () => {
    const result = CreateDcaScheduleSchema.safeParse({
      ...validBase,
      symbol: '',
      frequency: 'Daily',
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateDcaScheduleSchema', () => {
  it('requires id', () => {
    const result = UpdateDcaScheduleSchema.safeParse({
      amount: 200,
    })
    expect(result.success).toBe(false)
  })

  it('validates partial update with only amount', () => {
    const result = UpdateDcaScheduleSchema.safeParse({
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      amount: 200,
    })
    expect(result.success).toBe(true)
  })

  it('validates toggling is_active', () => {
    const result = UpdateDcaScheduleSchema.safeParse({
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      is_active: false,
    })
    expect(result.success).toBe(true)
  })

  it('validates update with new frequency and day', () => {
    const result = UpdateDcaScheduleSchema.safeParse({
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      frequency: 'Monthly',
      day_of_month: 1,
    })
    expect(result.success).toBe(true)
  })
})
