import { describe, it, expect } from 'vitest'
import {
  isScheduleDue,
  calculateDcaReturns,
  calculateLumpSumComparison,
  calculateCostBasisTrend,
  formatFrequencyLabel,
  type DcaSchedule,
  type DcaTransaction,
} from '../_utils'

// ============================================================
// isScheduleDue
// ============================================================

describe('isScheduleDue', () => {
  const baseSchedule: DcaSchedule = {
    id: '1',
    frequency: 'Daily',
    day_of_week: null,
    day_of_month: null,
    is_active: true,
    next_execution_at: null,
    created_at: '2026-01-01T00:00:00Z',
  }

  it('returns true for active daily schedule', () => {
    expect(isScheduleDue(baseSchedule, new Date('2026-03-22T12:00:00'))).toBe(true)
  })

  it('returns false for inactive schedule', () => {
    expect(
      isScheduleDue({ ...baseSchedule, is_active: false }, new Date('2026-03-22T12:00:00')),
    ).toBe(false)
  })

  it('returns true for weekly schedule on matching day', () => {
    // 2026-03-23 is a Monday (day 1)
    const schedule: DcaSchedule = {
      ...baseSchedule,
      frequency: 'Weekly',
      day_of_week: 1,
    }
    expect(isScheduleDue(schedule, new Date('2026-03-23T12:00:00'))).toBe(true)
  })

  it('returns false for weekly schedule on non-matching day', () => {
    // 2026-03-22 is a Sunday (day 0)
    const schedule: DcaSchedule = {
      ...baseSchedule,
      frequency: 'Weekly',
      day_of_week: 1, // Monday
    }
    expect(isScheduleDue(schedule, new Date('2026-03-22T12:00:00'))).toBe(false)
  })

  it('returns true for biweekly schedule on matching week', () => {
    // created_at: 2026-01-01 (Thursday)
    // Test on even weeks from creation
    const schedule: DcaSchedule = {
      ...baseSchedule,
      frequency: 'Biweekly',
      day_of_week: 4, // Thursday
      created_at: '2026-01-01T00:00:00Z',
    }
    // 2026-01-01 is week 0; 2026-01-15 is 2 weeks later
    expect(isScheduleDue(schedule, new Date('2026-01-01T12:00:00'))).toBe(true) // week 0 (even)
    expect(isScheduleDue(schedule, new Date('2026-01-15T12:00:00'))).toBe(true) // week 2 (even)
  })

  it('returns false for biweekly schedule on odd week', () => {
    const schedule: DcaSchedule = {
      ...baseSchedule,
      frequency: 'Biweekly',
      day_of_week: 4, // Thursday
      created_at: '2026-01-01T00:00:00Z',
    }
    // 2026-01-08 is 1 week later (odd)
    expect(isScheduleDue(schedule, new Date('2026-01-08T12:00:00'))).toBe(false)
  })

  it('returns true for monthly schedule on matching day', () => {
    const schedule: DcaSchedule = {
      ...baseSchedule,
      frequency: 'Monthly',
      day_of_month: 15,
    }
    expect(isScheduleDue(schedule, new Date('2026-03-15T12:00:00'))).toBe(true)
  })

  it('returns false for monthly schedule on non-matching day', () => {
    const schedule: DcaSchedule = {
      ...baseSchedule,
      frequency: 'Monthly',
      day_of_month: 15,
    }
    expect(isScheduleDue(schedule, new Date('2026-03-14T12:00:00'))).toBe(false)
  })

  it('returns false for weekly schedule with null day_of_week', () => {
    const schedule: DcaSchedule = {
      ...baseSchedule,
      frequency: 'Weekly',
      day_of_week: null,
    }
    expect(isScheduleDue(schedule, new Date('2026-03-23T12:00:00'))).toBe(false)
  })

  it('returns false for monthly schedule with null day_of_month', () => {
    const schedule: DcaSchedule = {
      ...baseSchedule,
      frequency: 'Monthly',
      day_of_month: null,
    }
    expect(isScheduleDue(schedule, new Date('2026-03-15T12:00:00'))).toBe(false)
  })
})

// ============================================================
// calculateDcaReturns
// ============================================================

describe('calculateDcaReturns', () => {
  it('returns zeros for empty transactions', () => {
    const result = calculateDcaReturns([])
    expect(result.totalInvested).toBe(0)
    expect(result.totalQuantity).toBe(0)
    expect(result.averageCostBasis).toBe(0)
    expect(result.transactionCount).toBe(0)
  })

  it('calculates returns for single transaction', () => {
    const txns: DcaTransaction[] = [
      { quantity: 10, price: 100, fee: 5, executed_at: '2026-01-01T00:00:00Z' },
    ]
    const result = calculateDcaReturns(txns)
    expect(result.totalInvested).toBe(1000)
    expect(result.totalQuantity).toBe(10)
    expect(result.averageCostBasis).toBe(100)
    expect(result.totalFees).toBe(5)
    expect(result.transactionCount).toBe(1)
  })

  it('calculates weighted average cost basis for multiple buys', () => {
    const txns: DcaTransaction[] = [
      { quantity: 10, price: 100, fee: 0, executed_at: '2026-01-01T00:00:00Z' },
      { quantity: 10, price: 200, fee: 0, executed_at: '2026-02-01T00:00:00Z' },
    ]
    const result = calculateDcaReturns(txns)
    expect(result.totalInvested).toBe(3000) // 1000 + 2000
    expect(result.totalQuantity).toBe(20)
    expect(result.averageCostBasis).toBe(150) // 3000 / 20
    expect(result.transactionCount).toBe(2)
  })

  it('accumulates fees', () => {
    const txns: DcaTransaction[] = [
      { quantity: 1, price: 100, fee: 2.5, executed_at: '2026-01-01T00:00:00Z' },
      { quantity: 1, price: 110, fee: 3.5, executed_at: '2026-02-01T00:00:00Z' },
    ]
    const result = calculateDcaReturns(txns)
    expect(result.totalFees).toBe(6)
  })
})

// ============================================================
// calculateLumpSumComparison
// ============================================================

describe('calculateLumpSumComparison', () => {
  it('returns zeros for empty transactions', () => {
    const result = calculateLumpSumComparison([], 100, 100)
    expect(result.dcaTotalInvested).toBe(0)
    expect(result.dcaAdvantage).toBe(0)
  })

  it('returns zeros when firstDayPrice is zero', () => {
    const txns: DcaTransaction[] = [
      { quantity: 1, price: 100, fee: 0, executed_at: '2026-01-01T00:00:00Z' },
    ]
    const result = calculateLumpSumComparison(txns, 110, 0)
    expect(result.lumpSumCurrentValue).toBe(0)
  })

  it('calculates DCA advantage when price drops then recovers', () => {
    // DCA bought at 100, then 80 — avg cost basis = 90
    // Lump sum bought all at 100
    // Current price: 110
    const txns: DcaTransaction[] = [
      { quantity: 1, price: 100, fee: 0, executed_at: '2026-01-01T00:00:00Z' },
      { quantity: 1.25, price: 80, fee: 0, executed_at: '2026-02-01T00:00:00Z' },
    ]
    const currentPrice = 110
    const firstDayPrice = 100

    const result = calculateLumpSumComparison(txns, currentPrice, firstDayPrice)

    // DCA: invested 100 + 100 = 200, owns 2.25 units, worth 247.50
    expect(result.dcaTotalInvested).toBe(200)
    expect(result.dcaCurrentValue).toBeCloseTo(247.5, 1)

    // Lump sum: invested 200 at $100, owns 2 units, worth 220
    expect(result.lumpSumCurrentValue).toBeCloseTo(220, 1)

    // DCA outperforms
    expect(result.dcaAdvantage).toBeGreaterThan(0)
  })

  it('calculates lump sum advantage when price only goes up', () => {
    // DCA bought at 100, then 120 — avg cost basis = ~109
    // Lump sum bought all at 100
    // Current price: 150
    const txns: DcaTransaction[] = [
      { quantity: 1, price: 100, fee: 0, executed_at: '2026-01-01T00:00:00Z' },
      { quantity: 0.833, price: 120, fee: 0, executed_at: '2026-02-01T00:00:00Z' },
    ]
    const currentPrice = 150
    const firstDayPrice = 100

    const result = calculateLumpSumComparison(txns, currentPrice, firstDayPrice)

    // Lump sum should outperform when price consistently rises
    expect(result.dcaAdvantage).toBeLessThan(0)
  })
})

// ============================================================
// calculateCostBasisTrend
// ============================================================

describe('calculateCostBasisTrend', () => {
  it('returns empty array for no transactions', () => {
    expect(calculateCostBasisTrend([])).toEqual([])
  })

  it('builds running average cost basis', () => {
    const txns: DcaTransaction[] = [
      { quantity: 10, price: 100, fee: 0, executed_at: '2026-01-01T00:00:00Z' },
      { quantity: 10, price: 200, fee: 0, executed_at: '2026-02-01T00:00:00Z' },
      { quantity: 10, price: 150, fee: 0, executed_at: '2026-03-01T00:00:00Z' },
    ]
    const trend = calculateCostBasisTrend(txns)

    expect(trend).toHaveLength(3)
    expect(trend[0]!.averageCostBasis).toBe(100) // Only first buy
    expect(trend[1]!.averageCostBasis).toBe(150) // (1000 + 2000) / 20
    expect(trend[2]!.averageCostBasis).toBe(150) // (1000 + 2000 + 1500) / 30
    expect(trend[2]!.totalInvested).toBe(4500)
    expect(trend[2]!.totalQuantity).toBe(30)
  })
})

// ============================================================
// formatFrequencyLabel
// ============================================================

describe('formatFrequencyLabel', () => {
  it('formats daily', () => {
    expect(formatFrequencyLabel('Daily', null, null)).toBe('Every day')
  })

  it('formats weekly with day', () => {
    expect(formatFrequencyLabel('Weekly', 1, null)).toBe('Every Mon')
  })

  it('formats biweekly with day', () => {
    expect(formatFrequencyLabel('Biweekly', 5, null)).toBe('Every other Fri')
  })

  it('formats monthly with day', () => {
    expect(formatFrequencyLabel('Monthly', null, 15)).toBe('Monthly on the 15th')
  })

  it('formats monthly 1st', () => {
    expect(formatFrequencyLabel('Monthly', null, 1)).toBe('Monthly on the 1st')
  })

  it('formats monthly 2nd', () => {
    expect(formatFrequencyLabel('Monthly', null, 2)).toBe('Monthly on the 2nd')
  })

  it('formats monthly 3rd', () => {
    expect(formatFrequencyLabel('Monthly', null, 3)).toBe('Monthly on the 3rd')
  })
})
