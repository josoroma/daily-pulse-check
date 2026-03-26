/**
 * RSI (Relative Strength Index) calculation.
 *
 * Uses Wilder's smoothing method (exponential moving average of gains/losses).
 * Default period is 14.
 */

export type RsiResult = {
  value: number
  period: number
}

/**
 * Calculate RSI from an array of closing prices (oldest first).
 *
 * @param prices - Array of closing prices, oldest first. Must have at least `period + 1` values.
 * @param period - RSI period (default: 14)
 * @returns RSI value between 0 and 100
 */
export function calculateRsi(prices: number[], period: number = 14): RsiResult {
  if (prices.length < period + 1) {
    throw new Error(`RSI requires at least ${period + 1} data points, got ${prices.length}`)
  }

  // Calculate price changes
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }

  // Initial average gain and loss (simple average of first `period` changes)
  let avgGain = 0
  let avgLoss = 0

  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      avgGain += changes[i]
    } else {
      avgLoss += Math.abs(changes[i])
    }
  }

  avgGain /= period
  avgLoss /= period

  // Wilder's smoothing for remaining changes
  for (let i = period; i < changes.length; i++) {
    const change = changes[i]
    const gain = change >= 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  // Calculate RS and RSI
  if (avgLoss === 0) {
    return { value: 100, period }
  }

  const rs = avgGain / avgLoss
  const rsi = 100 - 100 / (1 + rs)

  return { value: Math.round(rsi * 100) / 100, period }
}
