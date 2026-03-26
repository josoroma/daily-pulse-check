/**
 * Moving average calculations: SMA and EMA.
 */

export type MaType = 'sma' | 'ema'

export type MaResult = {
  value: number
  type: MaType
  period: number
}

export type MaCrossResult = {
  shortMa: MaResult
  longMa: MaResult
  /** true when short MA is above long MA */
  isAbove: boolean
}

/**
 * Calculate Simple Moving Average.
 *
 * @param prices - Array of closing prices, oldest first. Must have at least `period` values.
 * @param period - Number of periods to average
 */
export function calculateSma(prices: number[], period: number): MaResult {
  if (prices.length < period) {
    throw new Error(`SMA requires at least ${period} data points, got ${prices.length}`)
  }

  const slice = prices.slice(-period)
  const sum = slice.reduce((acc, val) => acc + val, 0)
  const value = Math.round((sum / period) * 100) / 100

  return { value, type: 'sma', period }
}

/**
 * Calculate Exponential Moving Average.
 *
 * @param prices - Array of closing prices, oldest first. Must have at least `period` values.
 * @param period - Number of periods
 */
export function calculateEma(prices: number[], period: number): MaResult {
  if (prices.length < period) {
    throw new Error(`EMA requires at least ${period} data points, got ${prices.length}`)
  }

  const multiplier = 2 / (period + 1)

  // Start with SMA of first `period` values as the seed
  let ema = prices.slice(0, period).reduce((acc, val) => acc + val, 0) / period

  // Apply EMA formula for remaining values
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }

  return { value: Math.round(ema * 100) / 100, type: 'ema', period }
}

/**
 * Calculate moving average based on type.
 */
export function calculateMa(prices: number[], period: number, type: MaType): MaResult {
  return type === 'sma' ? calculateSma(prices, period) : calculateEma(prices, period)
}

/**
 * Detect MA crossover between short and long periods.
 *
 * @param prices - Array of closing prices, oldest first
 * @param shortPeriod - Short MA period (e.g. 50)
 * @param longPeriod - Long MA period (e.g. 200)
 * @param type - MA type (sma or ema)
 */
export function calculateMaCross(
  prices: number[],
  shortPeriod: number,
  longPeriod: number,
  type: MaType = 'sma',
): MaCrossResult {
  if (shortPeriod >= longPeriod) {
    throw new Error(`Short period (${shortPeriod}) must be less than long period (${longPeriod})`)
  }

  const shortMa = calculateMa(prices, shortPeriod, type)
  const longMa = calculateMa(prices, longPeriod, type)

  return {
    shortMa,
    longMa,
    isAbove: shortMa.value > longMa.value,
  }
}
