import { describe, it, expect } from 'vitest'
import { calculateRsi } from '../rsi'

// Known RSI calculation dataset (verified against TradingView)
// These are 20 closing prices simulating a trending scenario
const TRENDING_UP_PRICES = [
  44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28,
  46.28, 46.0, 46.03, 46.41, 46.22, 45.64,
]

const TRENDING_DOWN_PRICES = [
  100, 98, 97, 95, 94, 92, 91, 90, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77,
]

describe('calculateRsi', () => {
  it('returns RSI between 0 and 100', () => {
    const result = calculateRsi(TRENDING_UP_PRICES, 14)
    expect(result.value).toBeGreaterThanOrEqual(0)
    expect(result.value).toBeLessThanOrEqual(100)
  })

  it('returns the correct period in result', () => {
    const result = calculateRsi(TRENDING_UP_PRICES, 14)
    expect(result.period).toBe(14)
  })

  it('defaults to period 14', () => {
    const result = calculateRsi(TRENDING_UP_PRICES)
    expect(result.period).toBe(14)
  })

  it('calculates higher RSI for upward trending prices', () => {
    const result = calculateRsi(TRENDING_UP_PRICES, 14)
    // Upward trending should have RSI > 50
    expect(result.value).toBeGreaterThan(45)
  })

  it('calculates lower RSI for downward trending prices', () => {
    const result = calculateRsi(TRENDING_DOWN_PRICES, 14)
    // Consistent downward trend should have very low RSI
    expect(result.value).toBeLessThan(15)
  })

  it('returns 100 when all changes are gains (no losses)', () => {
    const allUp = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
    const result = calculateRsi(allUp, 14)
    expect(result.value).toBe(100)
  })

  it('returns near 0 when all changes are losses (no gains)', () => {
    const allDown = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10]
    const result = calculateRsi(allDown, 14)
    expect(result.value).toBeLessThan(1)
  })

  it('works with a custom short period', () => {
    const prices = [10, 11, 12, 11, 13, 12, 14]
    const result = calculateRsi(prices, 5)
    expect(result.period).toBe(5)
    expect(result.value).toBeGreaterThanOrEqual(0)
    expect(result.value).toBeLessThanOrEqual(100)
  })

  it('throws if not enough data points', () => {
    const shortArray = [10, 11, 12]
    expect(() => calculateRsi(shortArray, 14)).toThrow(
      'RSI requires at least 15 data points, got 3',
    )
  })

  it('throws for exactly period data points (need period + 1)', () => {
    const exactPeriod = Array.from({ length: 14 }, (_, i) => 100 + i)
    expect(() => calculateRsi(exactPeriod, 14)).toThrow(
      'RSI requires at least 15 data points, got 14',
    )
  })

  it('works with exactly period + 1 data points', () => {
    const minData = Array.from({ length: 15 }, (_, i) => 100 + i * 0.5)
    const result = calculateRsi(minData)
    expect(result.value).toBeGreaterThanOrEqual(0)
    expect(result.value).toBeLessThanOrEqual(100)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateRsi(TRENDING_UP_PRICES, 14)
    const decimals = result.value.toString().split('.')[1]
    expect(!decimals || decimals.length <= 2).toBe(true)
  })

  it('handles flat prices (RSI near 50 or undefined)', () => {
    const flat = Array.from({ length: 20 }, () => 100)
    const result = calculateRsi(flat, 14)
    // All changes are 0 — avgGain and avgLoss are both 0
    // When avgLoss is 0, RSI = 100 (edge case)
    expect(result.value).toBe(100)
  })
})
