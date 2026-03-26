import type { AlertRow } from './_schema'

// ============================================================
// Alert Evaluation
// ============================================================

export type EvaluationResult = {
  fired: boolean
  message: string
}

/**
 * Evaluate a price alert against the current price.
 * Returns whether the alert should fire and the notification message.
 */
export function evaluatePriceAlert(
  alert: Pick<AlertRow, 'symbol' | 'condition' | 'threshold' | 'status' | 'last_triggered_at'>,
  currentPrice: number,
): EvaluationResult {
  // Only active alerts can fire
  if (alert.status !== 'active') {
    return { fired: false, message: '' }
  }

  // Already triggered alerts don't re-fire
  if (alert.last_triggered_at) {
    return { fired: false, message: '' }
  }

  const { symbol, condition, threshold } = alert
  const formattedPrice = formatPrice(currentPrice, symbol)
  const formattedThreshold = formatPrice(threshold, symbol)

  switch (condition) {
    case 'above':
      if (currentPrice >= threshold) {
        return {
          fired: true,
          message: `${symbol} has risen above ${formattedThreshold} (current: ${formattedPrice})`,
        }
      }
      return { fired: false, message: '' }

    case 'below':
      if (currentPrice <= threshold) {
        return {
          fired: true,
          message: `${symbol} has dropped below ${formattedThreshold} (current: ${formattedPrice})`,
        }
      }
      return { fired: false, message: '' }

    default:
      return { fired: false, message: '' }
  }
}

/**
 * Evaluate an RSI-based alert.
 */
export function evaluateRsiAlert(
  alert: Pick<AlertRow, 'symbol' | 'condition' | 'threshold' | 'status' | 'last_triggered_at'>,
  currentRsi: number,
): EvaluationResult {
  if (alert.status !== 'active' || alert.last_triggered_at) {
    return { fired: false, message: '' }
  }

  const { symbol, condition, threshold } = alert

  switch (condition) {
    case 'rsi_above':
      if (currentRsi >= threshold) {
        return {
          fired: true,
          message: `${symbol} RSI is overbought at ${currentRsi.toFixed(1)}`,
        }
      }
      return { fired: false, message: '' }

    case 'rsi_below':
      if (currentRsi <= threshold) {
        return {
          fired: true,
          message: `${symbol} RSI is oversold at ${currentRsi.toFixed(1)}`,
        }
      }
      return { fired: false, message: '' }

    default:
      return { fired: false, message: '' }
  }
}

/**
 * Evaluate a moving average crossover alert.
 */
export function evaluateMaCrossAlert(
  alert: Pick<AlertRow, 'symbol' | 'condition' | 'threshold' | 'status' | 'last_triggered_at'>,
  currentPrice: number,
  movingAverage: number,
): EvaluationResult {
  if (alert.status !== 'active' || alert.last_triggered_at) {
    return { fired: false, message: '' }
  }

  const { symbol, condition } = alert
  const formattedPrice = formatPrice(currentPrice, symbol)
  const formattedMa = formatPrice(movingAverage, symbol)
  const period = (alert as AlertRow).parameters?.ma_period ?? 200

  switch (condition) {
    case 'ma_cross_above':
      if (currentPrice >= movingAverage) {
        return {
          fired: true,
          message: `${symbol} has crossed above its ${period}-day MA (MA: ${formattedMa}, Price: ${formattedPrice})`,
        }
      }
      return { fired: false, message: '' }

    case 'ma_cross_below':
      if (currentPrice <= movingAverage) {
        return {
          fired: true,
          message: `${symbol} has crossed below its ${period}-day MA (MA: ${formattedMa}, Price: ${formattedPrice})`,
        }
      }
      return { fired: false, message: '' }

    default:
      return { fired: false, message: '' }
  }
}

/**
 * Evaluate an MVRV Z-Score alert (Bitcoin only).
 */
export function evaluateMvrvAlert(
  alert: Pick<AlertRow, 'symbol' | 'condition' | 'threshold' | 'status' | 'last_triggered_at'>,
  currentZScore: number,
): EvaluationResult {
  if (alert.status !== 'active' || alert.last_triggered_at) {
    return { fired: false, message: '' }
  }

  const { condition, threshold } = alert

  switch (condition) {
    case 'mvrv_above':
      if (currentZScore >= threshold) {
        return {
          fired: true,
          message: `BTC MVRV Z-Score is elevated at ${currentZScore.toFixed(1)} — historically near cycle tops`,
        }
      }
      return { fired: false, message: '' }

    case 'mvrv_below':
      if (currentZScore <= threshold) {
        return {
          fired: true,
          message: `BTC MVRV Z-Score is low at ${currentZScore.toFixed(1)} — historically near cycle bottoms`,
        }
      }
      return { fired: false, message: '' }

    default:
      return { fired: false, message: '' }
  }
}

// ============================================================
// Helpers
// ============================================================

function formatPrice(value: number, symbol: string): string {
  if (symbol === 'BTC') {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Determine the notification type based on the alert condition.
 */
export function getNotificationType(condition: string): string {
  if (
    condition.startsWith('rsi_') ||
    condition.startsWith('ma_cross_') ||
    condition.startsWith('mvrv_')
  ) {
    return 'indicator_alert'
  }
  return 'price_alert'
}
