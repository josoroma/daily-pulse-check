'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { todayCR, daysAgoCR } from '@/lib/date'
import { calculateUnrealizedPnL } from '@/app/dashboard/portfolio/_utils'
import { ASSET_COLORS, CRYPTO_COIN_IDS } from '@/app/dashboard/portfolio/_constants'
import { buildActivityFeed, computeDayChange } from '@/app/dashboard/_utils'
import type {
  ActivityItem,
  DashboardAllocation,
  DashboardData,
  DashboardMetrics,
  DashboardSnapshot,
} from '@/app/dashboard/_utils'

// ============================================================
// Dashboard data aggregator
// ============================================================

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return emptyDashboard(['Not authenticated'])
  }

  const errors: string[] = []

  // Parallel fetch: positions, snapshots, AI summary, recent transactions, notifications
  const [
    positionsResult,
    snapshotsResult,
    prevSnapshotResult,
    aiSummaryResult,
    txResult,
    notifResult,
  ] = await Promise.allSettled([
    supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('portfolio_snapshots')
      .select('snapshot_date, total_value')
      .eq('user_id', user.id)
      .gte('snapshot_date', daysAgoCR(30))
      .order('snapshot_date', { ascending: true }),
    supabase
      .from('portfolio_snapshots')
      .select('total_value')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(2),
    supabase
      .from('ai_summaries')
      .select('content')
      .eq('user_id', user.id)
      .eq('summary_date', todayCR())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('transactions')
      .select('id, type, quantity, price, executed_at, position:positions(symbol)')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .limit(5),
    supabase
      .from('notifications')
      .select('id, title, body, type, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Extract positions
  const positions = positionsResult.status === 'fulfilled' ? (positionsResult.value.data ?? []) : []

  // Fetch live prices for positions
  const uniqueAssets = Array.from(
    new Map(
      positions.map((p) => [p.symbol, { symbol: p.symbol, asset_type: p.asset_type }]),
    ).values(),
  )

  const { prices: currentPrices, btcData, failedSymbols } = await fetchLivePrices(uniqueAssets)
  if (failedSymbols.length > 0) {
    errors.push(`Live price failed for: ${failedSymbols.join(', ')}`)
  }

  // Calculate portfolio metrics
  let totalValue = 0
  let totalCostBasis = 0
  const allocationItems: Array<{ symbol: string; current_value: number; color: string }> = []

  for (const p of positions) {
    const currentPrice = currentPrices[p.symbol] ?? Number(p.average_buy_price)
    const { costBasis, currentValue } = calculateUnrealizedPnL(
      Number(p.quantity),
      Number(p.average_buy_price),
      currentPrice,
    )
    totalValue += currentValue
    totalCostBasis += costBasis
    allocationItems.push({
      symbol: p.symbol,
      current_value: currentValue,
      color: ASSET_COLORS[p.symbol] ?? 'hsl(220, 10%, 50%)',
    })
  }

  // Calculate allocations
  const allocations: DashboardAllocation[] =
    totalValue > 0
      ? allocationItems.map((item) => ({
          symbol: item.symbol,
          value: item.current_value,
          percentage: (item.current_value / totalValue) * 100,
          color: item.color,
        }))
      : []

  // Day change from snapshots
  let dayChangeAmount = 0
  let dayChangePct = 0
  if (prevSnapshotResult.status === 'fulfilled') {
    const rows = prevSnapshotResult.value.data ?? []
    const dayChange = computeDayChange(totalValue, rows)
    dayChangeAmount = dayChange.dayChangeAmount
    dayChangePct = dayChange.dayChangePct
  }

  // Snapshots for 30-day chart
  const snapshots: DashboardSnapshot[] =
    snapshotsResult.status === 'fulfilled'
      ? (snapshotsResult.value.data ?? []).map((s) => ({
          date: s.snapshot_date,
          value: Number(s.total_value),
        }))
      : []

  // AI summary
  const aiSummary =
    aiSummaryResult.status === 'fulfilled' ? (aiSummaryResult.value.data?.content ?? null) : null

  // Build activity feed
  const recentActivity = buildActivityFeed(
    txResult.status === 'fulfilled' ? (txResult.value.data ?? []) : [],
    notifResult.status === 'fulfilled' ? (notifResult.value.data ?? []) : [],
  )

  return {
    metrics: {
      totalValue,
      totalCostBasis,
      dayChangeAmount,
      dayChangePct,
      btcPrice: btcData?.priceUsd ?? 0,
      btcChange24h: btcData?.percentChange24h ?? 0,
    },
    allocations,
    snapshots,
    aiSummary,
    recentActivity,
    errors,
  }
}

// ============================================================
// Helpers
// ============================================================

async function fetchLivePrices(assets: Array<{ symbol: string; asset_type: string }>) {
  const prices: Record<string, number> = {}
  const failedSymbols: string[] = []
  let btcData: { priceUsd: number; percentChange24h: number } | null = null

  const results = await Promise.allSettled(
    assets.map(async ({ symbol, asset_type }) => {
      if (asset_type === 'Crypto') {
        const coinId = CRYPTO_COIN_IDS[symbol]
        if (!coinId) return { symbol, price: 0, isBtc: false }
        const data = await fetchBitcoinPrice()
        return { symbol, price: data.priceUsd, isBtc: symbol === 'BTC', btcData: data }
      }
      const data = await fetchPrice(symbol)
      return { symbol, price: data.price, isBtc: false }
    }),
  )

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      prices[result.value.symbol] = result.value.price
      if (result.value.isBtc && 'btcData' in result.value) {
        btcData = {
          priceUsd: result.value.btcData!.priceUsd,
          percentChange24h: result.value.btcData!.percentChange24h,
        }
      }
    } else {
      failedSymbols.push(assets[i].symbol)
    }
  }

  // If BTC wasn't in positions, fetch separately for the metric card
  if (!btcData) {
    try {
      const data = await fetchBitcoinPrice()
      btcData = { priceUsd: data.priceUsd, percentChange24h: data.percentChange24h }
    } catch {
      // BTC price unavailable — dashboard will show 0
    }
  }

  return { prices, btcData, failedSymbols }
}

function emptyDashboard(errors: string[]): DashboardData {
  return {
    metrics: {
      totalValue: 0,
      totalCostBasis: 0,
      dayChangeAmount: 0,
      dayChangePct: 0,
      btcPrice: 0,
      btcChange24h: 0,
    },
    allocations: [],
    snapshots: [],
    aiSummary: null,
    recentActivity: [],
    errors,
  }
}
