import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice, fetchCoinsMarkets } from '@/lib/market/crypto'
import type { CoinMarketData } from '@/lib/market/crypto'
import {
  getOrCreatePortfolio,
  getPositions,
  getTransactions,
  getPortfolioSnapshots,
} from './_actions'
import {
  calculateUnrealizedPnL,
  calculateAllocations,
  calculateDrift,
  needsRebalancing,
  generateRebalanceSuggestions,
  type PositionWithPnL,
  type TargetAllocation,
} from './_utils'
import { ASSET_COLORS, CRYPTO_COIN_IDS } from './_constants'
import { EmptyState } from './_components/empty-state'
import { PortfolioTabs } from './_components/portfolio-tabs'
import { ErrorToasts } from '../_components/error-toasts'

async function fetchCurrentPrices(symbols: Array<{ symbol: string; asset_type: string }>) {
  const prices: Record<string, number> = {}
  const sparklines: Record<string, number[] | null> = {}
  const failedSymbols: string[] = []

  const cryptoSymbols = symbols.filter(({ asset_type }) => asset_type === 'Crypto')
  const etfSymbols = symbols.filter(({ asset_type }) => asset_type === 'ETF')

  // Fetch crypto data in batch with sparklines
  const cryptoCoinIds = cryptoSymbols
    .map(({ symbol }) => CRYPTO_COIN_IDS[symbol])
    .filter((id): id is string => Boolean(id))

  const [cryptoResult, ...etfResults] = await Promise.allSettled([
    cryptoCoinIds.length > 0
      ? fetchCoinsMarkets(cryptoCoinIds)
      : Promise.resolve([] as CoinMarketData[]),
    ...etfSymbols.map(async ({ symbol }) => {
      const data = await fetchPrice(symbol)
      return { symbol, price: data.price }
    }),
  ])

  // Process crypto batch results
  if (cryptoResult.status === 'fulfilled') {
    const coinIdToSymbol = new Map<string, string>()
    for (const { symbol } of cryptoSymbols) {
      const coinId = CRYPTO_COIN_IDS[symbol]
      if (coinId) coinIdToSymbol.set(coinId, symbol)
    }
    for (const coin of cryptoResult.value as CoinMarketData[]) {
      const sym = coinIdToSymbol.get(coin.id)
      if (sym) {
        prices[sym] = coin.currentPrice
        sparklines[sym] = coin.sparkline7d
      }
    }
  } else {
    // Fallback: try individual Bitcoin fetch
    for (const { symbol } of cryptoSymbols) {
      try {
        const data = await fetchBitcoinPrice()
        prices[symbol] = data.priceUsd
      } catch {
        failedSymbols.push(symbol)
      }
    }
  }

  // Check for missing crypto symbols
  for (const { symbol } of cryptoSymbols) {
    if (!(symbol in prices)) failedSymbols.push(symbol)
  }

  // Process ETF results
  for (let i = 0; i < etfSymbols.length; i++) {
    const result = etfResults[i]
    if (!result) continue
    if (result.status === 'fulfilled') {
      const val = result.value as { symbol: string; price: number }
      prices[val.symbol] = val.price
    } else {
      const sym = etfSymbols[i]
      if (sym) failedSymbols.push(sym.symbol)
    }
  }

  return { prices, sparklines, failedSymbols }
}

export default async function PortfolioPage() {
  const portfolioResult = await getOrCreatePortfolio()
  const portfolio = portfolioResult.data ?? null

  const [rawPositions, transactions, snapshots] = await Promise.all([
    getPositions(),
    getTransactions(),
    getPortfolioSnapshots(null),
  ])

  if (!portfolio) {
    return (
      <div className="space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">Track your VOO, QQQ, and Bitcoin positions</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Unable to load portfolio. Please try again.
          </p>
        </div>
      </div>
    )
  }

  if (rawPositions.length === 0) {
    return (
      <div className="space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">Track your VOO, QQQ, and Bitcoin positions</p>
        </div>
        <EmptyState portfolioId={portfolio.id} />
      </div>
    )
  }

  // Fetch live prices for all held positions
  const uniqueAssets = Array.from(
    new Map(
      rawPositions.map((p) => [p.symbol, { symbol: p.symbol, asset_type: p.asset_type }]),
    ).values(),
  )
  const {
    prices: currentPrices,
    sparklines,
    failedSymbols,
  } = await fetchCurrentPrices(uniqueAssets)
  const errors: string[] =
    failedSymbols.length > 0 ? [`Live price failed for: ${failedSymbols.join(', ')}`] : []

  // Enrich positions with P&L
  const positions: PositionWithPnL[] = rawPositions.map((p) => {
    const currentPrice = currentPrices[p.symbol] ?? Number(p.average_buy_price)
    const { costBasis, currentValue, pnl, pnlPct } = calculateUnrealizedPnL(
      Number(p.quantity),
      Number(p.average_buy_price),
      currentPrice,
    )
    return {
      id: p.id,
      portfolio_id: p.portfolio_id,
      asset_type: p.asset_type as 'ETF' | 'Crypto',
      symbol: p.symbol,
      quantity: Number(p.quantity),
      average_buy_price: Number(p.average_buy_price),
      notes: p.notes ?? null,
      current_price: currentPrice,
      current_value: currentValue,
      cost_basis: costBasis,
      unrealized_pnl: pnl,
      unrealized_pnl_pct: pnlPct,
      sparkline7d: sparklines[p.symbol] ?? null,
    }
  })

  // Portfolio metrics
  const totalValue = positions.reduce((sum, p) => sum + p.current_value, 0)
  const totalCostBasis = positions.reduce((sum, p) => sum + p.cost_basis, 0)
  const totalPnl = totalValue - totalCostBasis
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0

  // Allocations
  const allocations = calculateAllocations(
    positions.map((p) => ({
      symbol: p.symbol,
      current_value: p.current_value,
      color: ASSET_COLORS[p.symbol],
    })),
  )

  // Drift & rebalancing
  const targetAllocations = (portfolio.target_allocations as TargetAllocation) ?? {}
  const hasTargets = Object.keys(targetAllocations).length > 0
  const driftItems = hasTargets ? calculateDrift(allocations, targetAllocations) : []
  const rebalanceNeeded = hasTargets && needsRebalancing(driftItems)
  const suggestions = hasTargets
    ? generateRebalanceSuggestions(driftItems, totalValue, currentPrices)
    : []

  const symbols = [...new Set(positions.map((p) => p.symbol))]

  return (
    <div className="space-y-6 px-4 py-8">
      {errors.length > 0 && <ErrorToasts errors={errors} />}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-muted-foreground">Track your VOO, QQQ, and Bitcoin positions</p>
      </div>

      <PortfolioTabs
        portfolioId={portfolio.id}
        positions={positions}
        totalValue={totalValue}
        totalCostBasis={totalCostBasis}
        totalPnl={totalPnl}
        totalPnlPct={totalPnlPct}
        allocations={allocations}
        transactions={transactions}
        snapshots={snapshots}
        symbols={symbols}
        targetAllocations={targetAllocations}
        driftItems={driftItems}
        rebalanceNeeded={rebalanceNeeded}
        suggestions={suggestions}
      />
    </div>
  )
}
