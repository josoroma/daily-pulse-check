import type { TimeRange } from './_constants'

// ============================================================
// Position P&L
// ============================================================

export interface PositionWithPnL {
  id: string
  portfolio_id: string
  asset_type: 'ETF' | 'Crypto'
  symbol: string
  quantity: number
  average_buy_price: number
  notes: string | null
  current_price: number
  current_value: number
  cost_basis: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
}

export function calculateUnrealizedPnL(
  quantity: number,
  averageBuyPrice: number,
  currentPrice: number,
): { costBasis: number; currentValue: number; pnl: number; pnlPct: number } {
  const costBasis = quantity * averageBuyPrice
  const currentValue = quantity * currentPrice
  const pnl = currentValue - costBasis
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
  return { costBasis, currentValue, pnl, pnlPct }
}

// ============================================================
// Cost Basis (Weighted Average)
// ============================================================

export function calculateWeightedAverageCostBasis(
  existingQuantity: number,
  existingAvgPrice: number,
  newQuantity: number,
  newPrice: number,
): number {
  const totalQuantity = existingQuantity + newQuantity
  if (totalQuantity <= 0) return 0
  return (existingQuantity * existingAvgPrice + newQuantity * newPrice) / totalQuantity
}

// ============================================================
// Realized P&L
// ============================================================

export function calculateRealizedPnL(
  sellQuantity: number,
  sellPrice: number,
  averageBuyPrice: number,
  fee: number = 0,
): number {
  return sellQuantity * (sellPrice - averageBuyPrice) - fee
}

// ============================================================
// Oversell Prevention
// ============================================================

export function validateSellQuantity(
  currentQuantity: number,
  sellQuantity: number,
): { valid: boolean; error?: string } {
  if (sellQuantity > currentQuantity) {
    return { valid: false, error: 'Insufficient quantity' }
  }
  return { valid: true }
}

// ============================================================
// Allocation
// ============================================================

export interface AllocationItem {
  symbol: string
  value: number
  percentage: number
  color: string
}

export function calculateAllocations(
  positions: Array<{ symbol: string; current_value: number; color?: string }>,
): AllocationItem[] {
  const totalValue = positions.reduce((sum, p) => sum + p.current_value, 0)
  if (totalValue <= 0) return []

  return positions.map((p) => ({
    symbol: p.symbol,
    value: p.current_value,
    percentage: (p.current_value / totalValue) * 100,
    color: p.color ?? 'hsl(220, 10%, 50%)',
  }))
}

// ============================================================
// Drift & Rebalancing
// ============================================================

export interface TargetAllocation {
  [symbol: string]: number // percentage, e.g. { VOO: 50, QQQ: 20, BTC: 20, Cash: 10 }
}

export interface DriftItem {
  symbol: string
  targetPct: number
  actualPct: number
  driftPct: number
}

export function calculateDrift(
  allocations: AllocationItem[],
  targets: TargetAllocation,
): DriftItem[] {
  const allSymbols = new Set([...allocations.map((a) => a.symbol), ...Object.keys(targets)])

  return Array.from(allSymbols).map((symbol) => {
    const actual = allocations.find((a) => a.symbol === symbol)
    const targetPct = targets[symbol] ?? 0
    const actualPct = actual?.percentage ?? 0
    return {
      symbol,
      targetPct,
      actualPct,
      driftPct: actualPct - targetPct,
    }
  })
}

export function needsRebalancing(driftItems: DriftItem[], threshold: number = 5): boolean {
  return driftItems.some((d) => Math.abs(d.driftPct) > threshold)
}

export interface RebalanceSuggestion {
  symbol: string
  action: 'Buy' | 'Sell' | 'Hold'
  amountUsd: number
  units: number
}

export function generateRebalanceSuggestions(
  driftItems: DriftItem[],
  totalValue: number,
  currentPrices: Record<string, number>,
): RebalanceSuggestion[] {
  return driftItems
    .filter((d) => Math.abs(d.driftPct) > 0.5)
    .map((d) => {
      const targetValue = (d.targetPct / 100) * totalValue
      const actualValue = (d.actualPct / 100) * totalValue
      const amountUsd = targetValue - actualValue
      const price = currentPrices[d.symbol] ?? 1
      const units = Math.abs(amountUsd) / price

      return {
        symbol: d.symbol,
        action:
          amountUsd > 0 ? ('Buy' as const) : amountUsd < 0 ? ('Sell' as const) : ('Hold' as const),
        amountUsd: Math.abs(amountUsd),
        units,
      }
    })
    .filter((s) => s.action !== 'Hold')
}

// ============================================================
// Formatting Helpers
// ============================================================

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatQuantity(value: number, assetType: 'ETF' | 'Crypto'): string {
  const maxDecimals = assetType === 'Crypto' ? 8 : 4
  return value.toFixed(maxDecimals).replace(/\.?0+$/, '') || '0'
}

// ============================================================
// Time Range Helpers
// ============================================================

export function getTimeRangeDays(range: TimeRange): number | null {
  switch (range) {
    case '1W':
      return 7
    case '1M':
      return 30
    case '3M':
      return 90
    case '6M':
      return 180
    case '1Y':
      return 365
    case 'ALL':
      return null
  }
}
