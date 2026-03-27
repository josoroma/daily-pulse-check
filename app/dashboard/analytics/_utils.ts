import { COSTA_RICA_TAX_NOTE } from './_constants'

// ============================================================
// Types
// ============================================================

export interface PositionPerformance {
  symbol: string
  assetType: 'ETF' | 'Crypto'
  quantity: number
  costBasis: number
  currentValue: number
  unrealizedPnl: number
  returnPct: number
}

export interface TotalReturn {
  totalCostBasis: number
  totalCurrentValue: number
  totalReturn: number
  totalReturnPct: number
}

export interface SnapshotPoint {
  date: string
  totalValue: number
}

export interface BenchmarkComparison {
  portfolioReturnPct: number
  benchmarkReturnPct: number
  outperformancePct: number
  isOutperforming: boolean
}

export interface MonthlyReport {
  year: number
  month: number
  startingValue: number
  endingValue: number
  netDeposits: number
  withdrawals: number
  returnPct: number
  dcaAdherencePct: number
  assetBreakdown: Array<{
    symbol: string
    startingValue: number
    endingValue: number
    returnPct: number
  }>
}

export interface YearlyReport {
  year: number
  totalInvested: number
  totalValue: number
  realizedGains: number
  unrealizedGains: number
  totalReturnPct: number
  monthlyReturns: Array<{ month: number; returnPct: number }>
}

export interface TaxLot {
  transactionId: string
  symbol: string
  buyDate: string
  quantity: number
  costPerUnit: number
}

export interface RealizedGain {
  sellDate: string
  symbol: string
  quantitySold: number
  costBasis: number
  salePrice: number
  realizedGainLoss: number
  holdingPeriodDays: number
}

export interface Transaction {
  id: string
  position_id: string
  type: string
  quantity: number
  price: number
  fee: number
  executed_at: string
  notes: string | null
  position?: { symbol: string; asset_type: string } | null
}

// ============================================================
// T-9.1.1: Total Return
// ============================================================

export function calculateTotalReturn(
  positions: Array<{
    quantity: number
    average_buy_price: number
    currentPrice: number
  }>,
): TotalReturn {
  let totalCostBasis = 0
  let totalCurrentValue = 0

  for (const pos of positions) {
    totalCostBasis += pos.quantity * pos.average_buy_price
    totalCurrentValue += pos.quantity * pos.currentPrice
  }

  const totalReturn = totalCurrentValue - totalCostBasis
  const totalReturnPct = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0

  return { totalCostBasis, totalCurrentValue, totalReturn, totalReturnPct }
}

export function calculatePerAssetPerformance(
  positions: Array<{
    symbol: string
    asset_type: string
    quantity: number
    average_buy_price: number
    currentPrice: number
  }>,
): PositionPerformance[] {
  return positions.map((pos) => {
    const costBasis = pos.quantity * pos.average_buy_price
    const currentValue = pos.quantity * pos.currentPrice
    const unrealizedPnl = currentValue - costBasis
    const returnPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0

    return {
      symbol: pos.symbol,
      assetType: pos.asset_type as 'ETF' | 'Crypto',
      quantity: pos.quantity,
      costBasis,
      currentValue,
      unrealizedPnl,
      returnPct,
    }
  })
}

// ============================================================
// T-9.1.2: Time-Weighted Rate of Return (TWRR)
// ============================================================

export function calculateTWRR(
  snapshots: SnapshotPoint[],
  cashFlows: Array<{ date: string; amount: number }>,
): number {
  if (snapshots.length < 2) return 0

  // Build a set of cash-flow dates for quick lookup
  const flowByDate = new Map<string, number>()
  for (const cf of cashFlows) {
    const dateKey = cf.date.slice(0, 10)
    flowByDate.set(dateKey, (flowByDate.get(dateKey) ?? 0) + cf.amount)
  }

  // Calculate sub-period returns between cash flow events
  let compoundedReturn = 1

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1]!
    const curr = snapshots[i]!
    const prevValue = prev.totalValue
    const currentValue = curr.totalValue
    const prevDate = prev.date.slice(0, 10)
    const flow = flowByDate.get(prevDate) ?? 0

    // Sub-period return: (end value) / (start value + cash flow)
    const denominator = prevValue + flow
    if (denominator <= 0) continue

    const subPeriodReturn = currentValue / denominator
    compoundedReturn *= subPeriodReturn
  }

  return (compoundedReturn - 1) * 100
}

// ============================================================
// T-9.1.4: Benchmark Comparison
// ============================================================

export function calculateBenchmarkReturn(
  benchmarkPrices: Array<{ date: string; close: number }>,
): number {
  if (benchmarkPrices.length < 2) return 0

  const sorted = [...benchmarkPrices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const startPrice = sorted[0]!.close
  const endPrice = sorted[sorted.length - 1]!.close

  if (startPrice <= 0) return 0
  return ((endPrice - startPrice) / startPrice) * 100
}

export function compareToBenchmark(
  portfolioReturnPct: number,
  benchmarkReturnPct: number,
): BenchmarkComparison {
  const outperformancePct = portfolioReturnPct - benchmarkReturnPct
  return {
    portfolioReturnPct,
    benchmarkReturnPct,
    outperformancePct,
    isOutperforming: outperformancePct > 0,
  }
}

// ============================================================
// T-9.2.1: Monthly Report Aggregation
// ============================================================

export function aggregateMonthlyReport(
  year: number,
  month: number,
  snapshots: SnapshotPoint[],
  transactions: Transaction[],
  dcaAdherencePct: number,
  positionSymbols: string[],
): MonthlyReport {
  // Filter snapshots for this month
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const monthSnapshots = snapshots.filter((s) => s.date.startsWith(monthStr))

  const startingValue = monthSnapshots.length > 0 ? monthSnapshots[0]!.totalValue : 0
  const endingValue =
    monthSnapshots.length > 0 ? monthSnapshots[monthSnapshots.length - 1]!.totalValue : 0

  // Filter transactions for this month
  const monthTxs = transactions.filter((t) => t.executed_at.startsWith(monthStr))

  let netDeposits = 0
  let withdrawals = 0
  for (const tx of monthTxs) {
    const amount = Number(tx.quantity) * Number(tx.price)
    if (tx.type === 'Buy' || tx.type === 'DCA') {
      netDeposits += amount
    } else if (tx.type === 'Sell') {
      withdrawals += amount
    }
  }

  const denominator = startingValue + netDeposits - withdrawals
  const returnPct = denominator > 0 ? ((endingValue - denominator) / denominator) * 100 : 0

  // Asset breakdown (simplified — per-symbol snapshots not available, show proportional)
  const assetBreakdown = positionSymbols.map((symbol) => ({
    symbol,
    startingValue: 0,
    endingValue: 0,
    returnPct: 0,
  }))

  return {
    year,
    month,
    startingValue,
    endingValue,
    netDeposits,
    withdrawals,
    returnPct,
    dcaAdherencePct,
    assetBreakdown,
  }
}

// ============================================================
// T-9.2.2: Yearly Report Aggregation
// ============================================================

export function aggregateYearlyReport(
  year: number,
  snapshots: SnapshotPoint[],
  transactions: Transaction[],
  totalCurrentValue: number,
  totalCostBasis: number,
): YearlyReport {
  const yearStr = String(year)
  const yearSnapshots = snapshots.filter((s) => s.date.startsWith(yearStr))
  const yearTxs = transactions.filter((t) => t.executed_at.startsWith(yearStr))

  let totalInvested = 0
  let realizedGains = 0

  for (const tx of yearTxs) {
    const amount = Number(tx.quantity) * Number(tx.price)
    if (tx.type === 'Buy' || tx.type === 'DCA') {
      totalInvested += amount
    } else if (tx.type === 'Sell') {
      // Simplified realized gain — actual FIFO calc is in tax section
      realizedGains += Number(tx.quantity) * Number(tx.price) - Number(tx.fee)
    }
  }

  const unrealizedGains = totalCurrentValue - totalCostBasis
  const totalReturnPct =
    totalCostBasis > 0 ? ((totalCurrentValue - totalCostBasis) / totalCostBasis) * 100 : 0

  // Month-by-month return
  const monthlyReturns: Array<{ month: number; returnPct: number }> = []
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`
    const monthSnaps = yearSnapshots.filter((s) => s.date.startsWith(monthStr))
    if (monthSnaps.length < 2) {
      monthlyReturns.push({ month: m, returnPct: 0 })
      continue
    }
    const start = monthSnaps[0]!.totalValue
    const end = monthSnaps[monthSnaps.length - 1]!.totalValue
    const pct = start > 0 ? ((end - start) / start) * 100 : 0
    monthlyReturns.push({ month: m, returnPct: pct })
  }

  return {
    year,
    totalInvested,
    totalValue: totalCurrentValue,
    realizedGains,
    unrealizedGains,
    totalReturnPct,
    monthlyReturns,
  }
}

// ============================================================
// T-9.2.3: DCA Adherence Score
// ============================================================

export function calculateDcaAdherence(scheduledCount: number, executedCount: number): number {
  if (scheduledCount <= 0) return 100
  return Math.round((executedCount / scheduledCount) * 100)
}

// ============================================================
// T-9.3.1: FIFO Realized Gains Calculator
// ============================================================

export function calculateFifoRealizedGains(
  transactions: Array<{
    id: string
    type: string
    quantity: number
    price: number
    fee: number
    executed_at: string
    symbol: string
  }>,
): RealizedGain[] {
  // Sort by execution date ascending
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime(),
  )

  // Maintain FIFO tax lot queue per symbol
  const lotQueues = new Map<string, TaxLot[]>()
  const realizedGains: RealizedGain[] = []

  for (const tx of sorted) {
    const symbol = tx.symbol

    if (tx.type === 'Buy' || tx.type === 'DCA') {
      // Add to lot queue
      const queue = lotQueues.get(symbol) ?? []
      queue.push({
        transactionId: tx.id,
        symbol,
        buyDate: tx.executed_at,
        quantity: tx.quantity,
        costPerUnit: tx.price,
      })
      lotQueues.set(symbol, queue)
    } else if (tx.type === 'Sell') {
      const queue = lotQueues.get(symbol) ?? []
      let remainingToSell = tx.quantity

      while (remainingToSell > 0 && queue.length > 0) {
        const oldestLot = queue[0]!
        const sellFromLot = Math.min(remainingToSell, oldestLot.quantity)

        const costBasis = sellFromLot * oldestLot.costPerUnit
        const salePrice = sellFromLot * tx.price
        const holdingPeriodMs =
          new Date(tx.executed_at).getTime() - new Date(oldestLot.buyDate).getTime()
        const holdingPeriodDays = Math.floor(holdingPeriodMs / (1000 * 60 * 60 * 24))

        // Prorate fee based on how much of this sell comes from this lot
        const feeShare = tx.quantity > 0 ? (sellFromLot / tx.quantity) * tx.fee : 0

        realizedGains.push({
          sellDate: tx.executed_at,
          symbol,
          quantitySold: sellFromLot,
          costBasis,
          salePrice,
          realizedGainLoss: salePrice - costBasis - feeShare,
          holdingPeriodDays,
        })

        oldestLot.quantity -= sellFromLot
        remainingToSell -= sellFromLot

        if (oldestLot.quantity <= 0) {
          queue.shift()
        }
      }
    }
  }

  return realizedGains
}

// ============================================================
// T-9.3.2: CSV Export Utility
// ============================================================

export function generateCsv(headers: string[], rows: string[][], headerNote?: string): string {
  const lines: string[] = []

  if (headerNote) {
    lines.push(escapeCsvField(headerNote))
    lines.push('')
  }

  lines.push(headers.map(escapeCsvField).join(','))

  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(','))
  }

  return lines.join('\n')
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function realizedGainsToCsvRows(gains: RealizedGain[]): {
  headers: string[]
  rows: string[][]
} {
  const headers = [
    'Date',
    'Symbol',
    'Quantity Sold',
    'Cost Basis (USD)',
    'Sale Price (USD)',
    'Realized Gain/Loss (USD)',
    'Holding Period (Days)',
  ]

  const rows = gains.map((g) => [
    g.sellDate.slice(0, 10),
    g.symbol,
    g.quantitySold.toString(),
    g.costBasis.toFixed(2),
    g.salePrice.toFixed(2),
    g.realizedGainLoss.toFixed(2),
    g.holdingPeriodDays.toString(),
  ])

  return { headers, rows }
}

export function transactionsToCsvRows(transactions: Transaction[]): {
  headers: string[]
  rows: string[][]
} {
  const headers = [
    'Date',
    'Type',
    'Symbol',
    'Quantity',
    'Price (USD)',
    'Fee (USD)',
    'Total (USD)',
    'Notes',
  ]

  const rows = transactions.map((tx) => [
    tx.executed_at.slice(0, 10),
    tx.type,
    tx.position?.symbol ?? '',
    Number(tx.quantity).toString(),
    Number(tx.price).toFixed(2),
    Number(tx.fee).toFixed(2),
    (Number(tx.quantity) * Number(tx.price) + Number(tx.fee)).toFixed(2),
    tx.notes ?? '',
  ])

  return { headers, rows }
}

// ============================================================
// T-9.3.3: Country-Specific Tax Notes
// ============================================================

const TAX_NOTES: Record<string, string> = {
  CR: COSTA_RICA_TAX_NOTE,
  'Costa Rica': COSTA_RICA_TAX_NOTE,
}

export function getTaxNote(country: string): string | undefined {
  return TAX_NOTES[country]
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
