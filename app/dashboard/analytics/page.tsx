import { fetchHistory } from '@/lib/market/stocks'
import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { CRYPTO_COIN_IDS } from '@/app/dashboard/portfolio/_constants'
import { BENCHMARK_SYMBOL } from './_constants'
import {
  getAnalyticsPositions,
  getAnalyticsSnapshots,
  getAnalyticsTransactions,
  getDcaScheduleStats,
  getTransactionYears,
} from './_actions'
import {
  calculateTotalReturn,
  calculatePerAssetPerformance,
  calculateTWRR,
  calculateBenchmarkReturn,
  compareToBenchmark,
  aggregateMonthlyReport,
  aggregateYearlyReport,
  calculateDcaAdherence,
} from './_utils'
import { PerformanceSummary } from './_components/performance-summary'
import { PerAssetTable } from './_components/per-asset-table'
import { BenchmarkChart } from './_components/benchmark-chart'
import { AnalyticsReports } from './_components/analytics-reports'

async function fetchCurrentPrices(symbols: Array<{ symbol: string; asset_type: string }>) {
  const prices: Record<string, number> = {}

  const results = await Promise.allSettled(
    symbols.map(async ({ symbol, asset_type }) => {
      if (asset_type === 'Crypto') {
        const coinId = CRYPTO_COIN_IDS[symbol]
        if (!coinId) return { symbol, price: 0 }
        const data = await fetchBitcoinPrice()
        return { symbol, price: data.priceUsd }
      }
      const data = await fetchPrice(symbol)
      return { symbol, price: data.price }
    }),
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      prices[result.value.symbol] = result.value.price
    }
  }

  return prices
}

export default async function AnalyticsPage() {
  const currentYear = new Date().getFullYear()

  const [rawPositions, snapshots, transactions, availableYears] = await Promise.all([
    getAnalyticsPositions(),
    getAnalyticsSnapshots(null),
    getAnalyticsTransactions(),
    getTransactionYears(),
  ])

  // Fetch live prices for all held positions
  const uniqueAssets = Array.from(
    new Map(
      rawPositions.map((p) => [p.symbol, { symbol: p.symbol, asset_type: p.asset_type }]),
    ).values(),
  )
  const currentPrices = await fetchCurrentPrices(uniqueAssets)

  // Enrich positions with current prices
  const enrichedPositions = rawPositions.map((p) => ({
    symbol: p.symbol,
    asset_type: p.asset_type,
    quantity: Number(p.quantity),
    average_buy_price: Number(p.average_buy_price),
    currentPrice: currentPrices[p.symbol] ?? Number(p.average_buy_price),
  }))

  // Performance calculations
  const totalReturn = calculateTotalReturn(enrichedPositions)
  const perAsset = calculatePerAssetPerformance(enrichedPositions)

  // TWRR from snapshots
  const snapshotPoints = snapshots.map((s) => ({
    date: s.snapshot_date,
    totalValue: Number(s.total_value),
  }))

  const cashFlows = transactions
    .filter((t) => t.type === 'Buy' || t.type === 'DCA' || t.type === 'Sell')
    .map((t) => ({
      date: t.executed_at,
      amount:
        t.type === 'Sell'
          ? -(Number(t.quantity) * Number(t.price))
          : Number(t.quantity) * Number(t.price),
    }))

  const twrrPct = calculateTWRR(snapshotPoints, cashFlows)

  // Benchmark comparison — fetch VOO history for same period as snapshots
  let benchmark = null
  try {
    const history = await fetchHistory(BENCHMARK_SYMBOL, '1day', 365)
    const benchmarkPrices = history.values.map((v) => ({
      date: v.datetime,
      close: v.close,
    }))
    const benchmarkReturnPct = calculateBenchmarkReturn(benchmarkPrices)
    benchmark = compareToBenchmark(totalReturn.totalReturnPct, benchmarkReturnPct)
  } catch {
    // Benchmark data unavailable — show null state
  }

  // Benchmark chart data
  const portfolioChartData = snapshotPoints.map((s) => ({
    date: s.date,
    value: s.totalValue,
  }))

  let benchmarkChartData: Array<{ date: string; value: number }> = []
  try {
    const history = await fetchHistory(BENCHMARK_SYMBOL, '1day', 365)
    benchmarkChartData = history.values.map((v) => ({
      date: v.datetime,
      value: v.close,
    }))
  } catch {
    // Benchmark chart data unavailable
  }

  // Reports — current year
  const yearTxs = transactions.filter((t) => t.executed_at.startsWith(String(currentYear)))
  const yearSnapshots = snapshots.filter((s) => s.snapshot_date.startsWith(String(currentYear)))

  const positionSymbols = [...new Set(rawPositions.map((p) => p.symbol))]

  // Monthly reports for current year
  const monthlyReports = await Promise.all(
    Array.from({ length: 12 }, (_, i) => i + 1).map(async (month) => {
      const { scheduled, executed } = await getDcaScheduleStats(currentYear, month)
      const adherence = calculateDcaAdherence(scheduled, executed)
      const monthSnapshotPoints = yearSnapshots.map((s) => ({
        date: s.snapshot_date,
        totalValue: Number(s.total_value),
      }))
      const monthTxFormatted = yearTxs.map((t) => ({
        id: t.id,
        position_id: t.position_id,
        type: t.type,
        quantity: Number(t.quantity),
        price: Number(t.price),
        fee: Number(t.fee),
        executed_at: t.executed_at,
        notes: t.notes,
        position: t.position,
      }))

      return aggregateMonthlyReport(
        currentYear,
        month,
        monthSnapshotPoints,
        monthTxFormatted,
        adherence,
        positionSymbols,
      )
    }),
  )

  // Yearly report for current year
  const yearlyReport = aggregateYearlyReport(
    currentYear,
    yearSnapshots.map((s) => ({
      date: s.snapshot_date,
      totalValue: Number(s.total_value),
    })),
    yearTxs.map((t) => ({
      id: t.id,
      position_id: t.position_id,
      type: t.type,
      quantity: Number(t.quantity),
      price: Number(t.price),
      fee: Number(t.fee),
      executed_at: t.executed_at,
      notes: t.notes,
      position: t.position,
    })),
    totalReturn.totalCurrentValue,
    totalReturn.totalCostBasis,
  )

  return (
    <div className="space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Performance metrics, reports, and tax exports for your portfolio
        </p>
      </div>

      <PerformanceSummary totalReturn={totalReturn} twrrPct={twrrPct} benchmark={benchmark} />

      <PerAssetTable assets={perAsset} />

      <BenchmarkChart portfolioData={portfolioChartData} benchmarkData={benchmarkChartData} />

      <AnalyticsReports
        monthlyReports={monthlyReports}
        yearlyReport={yearlyReport}
        availableYears={availableYears}
        initialYear={currentYear}
      />
    </div>
  )
}
