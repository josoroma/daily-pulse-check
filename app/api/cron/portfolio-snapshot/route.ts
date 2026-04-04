import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice, fetchCoinsMarkets } from '@/lib/market/crypto'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Portfolio Snapshot Cron — runs daily after US market close.
 * Schedule: 0 2 * * * (02:00 UTC / 8:00 PM Costa Rica)
 *
 * For each user portfolio, fetches live asset prices and records
 * a daily snapshot into `portfolio_snapshots`.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]!

  // Load all positions grouped by portfolio
  const { data: positions, error: posError } = await supabase
    .from('positions')
    .select('id, user_id, portfolio_id, symbol, asset_type, quantity, average_buy_price')

  if (posError) {
    return NextResponse.json({ error: posError.message }, { status: 500 })
  }

  if (!positions || positions.length === 0) {
    return NextResponse.json({ processed: 0, snapshots: 0 })
  }

  // Group positions by portfolio
  const portfolioMap = new Map<string, { user_id: string; positions: typeof positions }>()

  for (const pos of positions) {
    const existing = portfolioMap.get(pos.portfolio_id)
    if (existing) {
      existing.positions.push(pos)
    } else {
      portfolioMap.set(pos.portfolio_id, {
        user_id: pos.user_id,
        positions: [pos],
      })
    }
  }

  // Collect unique symbols by asset type
  const etfSymbols = new Set<string>()
  const cryptoIds = new Set<string>()

  for (const pos of positions) {
    if (pos.asset_type === 'ETF') {
      etfSymbols.add(pos.symbol.toUpperCase())
    } else if (pos.asset_type === 'Crypto') {
      cryptoIds.add(pos.symbol.toLowerCase())
    }
  }

  // Fetch all prices in parallel
  const priceMap = new Map<string, number>()

  const pricePromises: Array<Promise<void>> = []

  for (const symbol of etfSymbols) {
    pricePromises.push(
      fetchPrice(symbol)
        .then((result) => {
          priceMap.set(symbol.toUpperCase(), result.price)
        })
        .catch(() => {
          // Price unavailable — skip
        }),
    )
  }

  // Bitcoin is special — fetchBitcoinPrice returns USD price directly
  if (cryptoIds.has('bitcoin') || cryptoIds.has('btc')) {
    pricePromises.push(
      fetchBitcoinPrice()
        .then((result) => {
          priceMap.set('BTC', result.priceUsd)
          priceMap.set('BITCOIN', result.priceUsd)
        })
        .catch(() => {}),
    )
  }

  // Batch fetch other crypto prices
  const otherCrypto = [...cryptoIds].filter((id) => id !== 'bitcoin' && id !== 'btc')
  if (otherCrypto.length > 0) {
    pricePromises.push(
      fetchCoinsMarkets(otherCrypto)
        .then((coins) => {
          for (const coin of coins) {
            priceMap.set(coin.symbol.toUpperCase(), coin.currentPrice)
          }
        })
        .catch(() => {}),
    )
  }

  await Promise.all(pricePromises)

  // Build snapshots per portfolio
  const snapshots: Array<{
    user_id: string
    portfolio_id: string
    snapshot_date: string
    total_value: number
    positions_data: Array<{
      symbol: string
      asset_type: string
      quantity: number
      price: number
      value: number
    }>
  }> = []

  for (const [portfolioId, portfolio] of portfolioMap) {
    let totalValue = 0
    const positionsData: Array<{
      symbol: string
      asset_type: string
      quantity: number
      price: number
      value: number
    }> = []

    for (const pos of portfolio.positions) {
      const lookupKey = pos.symbol.toUpperCase()
      const price = priceMap.get(lookupKey)
      if (price == null) continue

      const quantity = Number(pos.quantity)
      const value = quantity * price
      totalValue += value

      positionsData.push({
        symbol: pos.symbol,
        asset_type: pos.asset_type,
        quantity,
        price,
        value,
      })
    }

    if (positionsData.length > 0) {
      snapshots.push({
        user_id: portfolio.user_id,
        portfolio_id: portfolioId,
        snapshot_date: today,
        total_value: Math.round(totalValue * 100) / 100,
        positions_data: positionsData,
      })
    }
  }

  if (snapshots.length === 0) {
    return NextResponse.json({ processed: portfolioMap.size, snapshots: 0 })
  }

  // Upsert snapshots (unique on portfolio_id + snapshot_date)
  const { error: upsertError } = await supabase
    .from('portfolio_snapshots')
    .upsert(snapshots, { onConflict: 'portfolio_id,snapshot_date' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    processed: portfolioMap.size,
    snapshots: snapshots.length,
    date: today,
  })
}
