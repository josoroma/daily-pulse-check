import { describe, it, expect } from 'vitest'
import { calculateSma, calculateEma, calculateMa, calculateMaCross } from '../moving-average'

const PRICES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

describe('calculateSma', () => {
  it('calculates simple moving average correctly', () => {
    // SMA of last 5 prices: (16+17+18+19+20)/5 = 18
    const result = calculateSma(PRICES, 5)
    expect(result.value).toBe(18)
    expect(result.type).toBe('sma')
    expect(result.period).toBe(5)
  })

  it('calculates SMA for full array', () => {
    // SMA of all 11 prices: (10+11+...+20)/11 = 15
    const result = calculateSma(PRICES, 11)
    expect(result.value).toBe(15)
  })

  it('handles period of 1', () => {
    const result = calculateSma(PRICES, 1)
    // Last 1 value = 20
    expect(result.value).toBe(20)
  })

  it('throws if not enough data', () => {
    expect(() => calculateSma([1, 2, 3], 5)).toThrow('SMA requires at least 5 data points, got 3')
  })

  it('works with exactly period data points', () => {
    const result = calculateSma([10, 20, 30], 3)
    expect(result.value).toBe(20)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateSma([10, 11, 13], 3)
    // (10+11+13)/3 = 11.333... → 11.33
    expect(result.value).toBe(11.33)
  })
})

describe('calculateEma', () => {
  it('returns EMA type and period', () => {
    const result = calculateEma(PRICES, 5)
    expect(result.type).toBe('ema')
    expect(result.period).toBe(5)
  })

  it('produces value between min and max of prices', () => {
    const result = calculateEma(PRICES, 5)
    expect(result.value).toBeGreaterThanOrEqual(10)
    expect(result.value).toBeLessThanOrEqual(20)
  })

  it('EMA weights recent prices more than SMA', () => {
    // For upward trending data, EMA should be higher than SMA
    const sma = calculateSma(PRICES, 5)
    const ema = calculateEma(PRICES, 5)
    expect(ema.value).toBeGreaterThanOrEqual(sma.value)
  })

  it('throws if not enough data', () => {
    expect(() => calculateEma([1, 2], 5)).toThrow('EMA requires at least 5 data points, got 2')
  })

  it('with single value and period=1, returns that value', () => {
    const result = calculateEma([42], 1)
    expect(result.value).toBe(42)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateEma(PRICES, 3)
    const decimals = result.value.toString().split('.')[1]
    expect(!decimals || decimals.length <= 2).toBe(true)
  })
})

describe('calculateMa', () => {
  it('delegates to SMA when type is sma', () => {
    const sma = calculateSma(PRICES, 5)
    const ma = calculateMa(PRICES, 5, 'sma')
    expect(ma).toEqual(sma)
  })

  it('delegates to EMA when type is ema', () => {
    const ema = calculateEma(PRICES, 5)
    const ma = calculateMa(PRICES, 5, 'ema')
    expect(ma).toEqual(ema)
  })
})

describe('calculateMaCross', () => {
  it('detects when short MA is above long MA (bullish)', () => {
    // Upward trend: short period MA should be above long period MA
    const result = calculateMaCross(PRICES, 3, 10)
    expect(result.isAbove).toBe(true)
    expect(result.shortMa.period).toBe(3)
    expect(result.longMa.period).toBe(10)
  })

  it('detects when short MA is below long MA (bearish)', () => {
    // Downward trend
    const downPrices = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10]
    const result = calculateMaCross(downPrices, 3, 10)
    expect(result.isAbove).toBe(false)
  })

  it('throws if short period >= long period', () => {
    expect(() => calculateMaCross(PRICES, 10, 5)).toThrow(
      'Short period (10) must be less than long period (5)',
    )
  })

  it('throws if short period equals long period', () => {
    expect(() => calculateMaCross(PRICES, 5, 5)).toThrow(
      'Short period (5) must be less than long period (5)',
    )
  })

  it('supports EMA crossover', () => {
    const result = calculateMaCross(PRICES, 3, 10, 'ema')
    expect(result.shortMa.type).toBe('ema')
    expect(result.longMa.type).toBe('ema')
  })

  it('returns proper structure', () => {
    const result = calculateMaCross(PRICES, 3, 10)
    expect(result).toHaveProperty('shortMa')
    expect(result).toHaveProperty('longMa')
    expect(result).toHaveProperty('isAbove')
    expect(result.shortMa).toHaveProperty('value')
    expect(result.shortMa).toHaveProperty('type')
    expect(result.shortMa).toHaveProperty('period')
  })
})
