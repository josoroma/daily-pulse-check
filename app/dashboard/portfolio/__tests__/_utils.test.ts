import { describe, it, expect } from 'vitest'
import {
  calculateUnrealizedPnL,
  calculateWeightedAverageCostBasis,
  calculateRealizedPnL,
  validateSellQuantity,
  calculateAllocations,
  calculateDrift,
  needsRebalancing,
  generateRebalanceSuggestions,
  formatUsd,
  formatPct,
  formatQuantity,
  getTimeRangeDays,
} from '../_utils'

// ============================================================
// Unrealized P&L
// ============================================================
describe('calculateUnrealizedPnL', () => {
  it('calculates profit when price goes up', () => {
    const result = calculateUnrealizedPnL(10, 450, 500)
    expect(result.costBasis).toBe(4500)
    expect(result.currentValue).toBe(5000)
    expect(result.pnl).toBe(500)
    expect(result.pnlPct).toBeCloseTo(11.11, 1)
  })

  it('calculates loss when price goes down', () => {
    const result = calculateUnrealizedPnL(10, 450, 400)
    expect(result.pnl).toBe(-500)
    expect(result.pnlPct).toBeCloseTo(-11.11, 1)
  })

  it('handles zero cost basis', () => {
    const result = calculateUnrealizedPnL(10, 0, 100)
    expect(result.costBasis).toBe(0)
    expect(result.currentValue).toBe(1000)
    expect(result.pnlPct).toBe(0)
  })

  it('handles fractional crypto quantities', () => {
    const result = calculateUnrealizedPnL(0.05, 85000, 90000)
    expect(result.costBasis).toBe(4250)
    expect(result.currentValue).toBe(4500)
    expect(result.pnl).toBe(250)
  })
})

// ============================================================
// Weighted Average Cost Basis
// ============================================================
describe('calculateWeightedAverageCostBasis', () => {
  it('calculates weighted average for a buy', () => {
    // 10 shares at $450, buying 5 more at $460
    const result = calculateWeightedAverageCostBasis(10, 450, 5, 460)
    expect(result).toBeCloseTo(453.33, 1)
  })

  it('returns new price when starting from zero', () => {
    const result = calculateWeightedAverageCostBasis(0, 0, 10, 450)
    expect(result).toBe(450)
  })

  it('returns 0 when total quantity is 0', () => {
    const result = calculateWeightedAverageCostBasis(0, 0, 0, 450)
    expect(result).toBe(0)
  })

  it('handles fractional quantities', () => {
    const result = calculateWeightedAverageCostBasis(0.05, 85000, 0.03, 90000)
    expect(result).toBeCloseTo(86875, 0)
  })
})

// ============================================================
// Realized P&L
// ============================================================
describe('calculateRealizedPnL', () => {
  it('calculates profit on sell', () => {
    // Sell 3 shares at $460, avg buy was $450, $1 fee
    const result = calculateRealizedPnL(3, 460, 450, 1)
    expect(result).toBe(29) // 3 * (460 - 450) - 1
  })

  it('calculates loss on sell', () => {
    const result = calculateRealizedPnL(3, 440, 450, 0)
    expect(result).toBe(-30) // 3 * (440 - 450)
  })

  it('handles zero fee', () => {
    const result = calculateRealizedPnL(5, 500, 450)
    expect(result).toBe(250)
  })
})

// ============================================================
// Oversell Prevention
// ============================================================
describe('validateSellQuantity', () => {
  it('allows valid sell', () => {
    expect(validateSellQuantity(10, 5)).toEqual({ valid: true })
  })

  it('allows selling entire position', () => {
    expect(validateSellQuantity(10, 10)).toEqual({ valid: true })
  })

  it('rejects overselling', () => {
    const result = validateSellQuantity(5, 10)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Insufficient quantity')
  })
})

// ============================================================
// Allocations
// ============================================================
describe('calculateAllocations', () => {
  it('calculates correct percentages', () => {
    const positions = [
      { symbol: 'VOO', current_value: 5000 },
      { symbol: 'QQQ', current_value: 2000 },
      { symbol: 'BTC', current_value: 3000 },
    ]
    const result = calculateAllocations(positions)
    expect(result).toHaveLength(3)
    expect(result[0]!.percentage).toBe(50)
    expect(result[1]!.percentage).toBe(20)
    expect(result[2]!.percentage).toBe(30)
  })

  it('returns empty for zero total', () => {
    expect(calculateAllocations([])).toEqual([])
  })
})

// ============================================================
// Drift
// ============================================================
describe('calculateDrift', () => {
  it('calculates drift correctly', () => {
    const allocations = [
      { symbol: 'VOO', value: 4000, percentage: 40, color: '' },
      { symbol: 'BTC', value: 3500, percentage: 35, color: '' },
      { symbol: 'QQQ', value: 2500, percentage: 25, color: '' },
    ]
    const targets = { VOO: 50, BTC: 20, QQQ: 20, Cash: 10 }
    const drift = calculateDrift(allocations, targets)

    const vooDrift = drift.find((d) => d.symbol === 'VOO')
    expect(vooDrift?.driftPct).toBe(-10)

    const btcDrift = drift.find((d) => d.symbol === 'BTC')
    expect(btcDrift?.driftPct).toBe(15)

    const cashDrift = drift.find((d) => d.symbol === 'Cash')
    expect(cashDrift?.driftPct).toBe(-10)
  })
})

describe('needsRebalancing', () => {
  it('returns true when drift exceeds threshold', () => {
    const driftItems = [
      { symbol: 'VOO', targetPct: 50, actualPct: 40, driftPct: -10 },
      { symbol: 'BTC', targetPct: 20, actualPct: 35, driftPct: 15 },
    ]
    expect(needsRebalancing(driftItems, 5)).toBe(true)
  })

  it('returns false when drift is within threshold', () => {
    const driftItems = [
      { symbol: 'VOO', targetPct: 50, actualPct: 48, driftPct: -2 },
      { symbol: 'BTC', targetPct: 20, actualPct: 22, driftPct: 2 },
    ]
    expect(needsRebalancing(driftItems, 5)).toBe(false)
  })
})

describe('generateRebalanceSuggestions', () => {
  it('suggests buy/sell to restore targets', () => {
    const driftItems = [
      { symbol: 'VOO', targetPct: 50, actualPct: 40, driftPct: -10 },
      { symbol: 'BTC', targetPct: 20, actualPct: 30, driftPct: 10 },
    ]
    const suggestions = generateRebalanceSuggestions(driftItems, 10000, { VOO: 500, BTC: 90000 })

    const vooBuy = suggestions.find((s) => s.symbol === 'VOO')
    expect(vooBuy?.action).toBe('Buy')
    expect(vooBuy?.amountUsd).toBe(1000)
    expect(vooBuy?.units).toBe(2) // 1000 / 500

    const btcSell = suggestions.find((s) => s.symbol === 'BTC')
    expect(btcSell?.action).toBe('Sell')
    expect(btcSell?.amountUsd).toBe(1000)
  })
})

// ============================================================
// Formatting
// ============================================================
describe('formatUsd', () => {
  it('formats positive values', () => {
    expect(formatUsd(1234.56)).toBe('$1,234.56')
  })

  it('formats negative values', () => {
    expect(formatUsd(-500)).toBe('-$500.00')
  })

  it('formats zero', () => {
    expect(formatUsd(0)).toBe('$0.00')
  })
})

describe('formatPct', () => {
  it('formats positive with + sign', () => {
    expect(formatPct(11.11)).toBe('+11.11%')
  })

  it('formats negative', () => {
    expect(formatPct(-5.5)).toBe('-5.50%')
  })
})

describe('formatQuantity', () => {
  it('formats ETF quantities with up to 4 decimals', () => {
    const result = formatQuantity(10.5, 'ETF')
    expect(result).toContain('10.5')
  })

  it('formats crypto with up to 8 decimals', () => {
    const result = formatQuantity(0.00012345, 'Crypto')
    expect(result).toContain('0.00012345')
  })
})

describe('getTimeRangeDays', () => {
  it('returns correct days for each range', () => {
    expect(getTimeRangeDays('1W')).toBe(7)
    expect(getTimeRangeDays('1M')).toBe(30)
    expect(getTimeRangeDays('3M')).toBe(90)
    expect(getTimeRangeDays('6M')).toBe(180)
    expect(getTimeRangeDays('1Y')).toBe(365)
    expect(getTimeRangeDays('ALL')).toBeNull()
  })
})
