import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchBitcoinPrice,
  fetchBitcoinHistory,
  fetchCoinHistoricalPrice,
  fetchCoinMarketChart,
  fetchCoinsMarkets,
} from '@/lib/market/crypto'

const ALLOWED_COIN_IDS = new Set(['bitcoin', 'ethereum', 'solana'])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coinId: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { coinId } = await params
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') ?? 'price'

    // Special route: batch markets data (coinId acts as comma-separated list)
    if (type === 'markets') {
      const ids = coinId.split(',').filter((id) => ALLOWED_COIN_IDS.has(id))
      if (ids.length === 0) {
        return NextResponse.json({ error: 'No valid coin IDs provided' }, { status: 400 })
      }
      const data = await fetchCoinsMarkets(ids)
      return NextResponse.json(data)
    }

    if (!ALLOWED_COIN_IDS.has(coinId)) {
      return NextResponse.json(
        { error: `Unsupported coin: ${coinId}. Allowed: ${[...ALLOWED_COIN_IDS].join(', ')}` },
        { status: 400 },
      )
    }

    // Historical price on a specific date (cost basis)
    if (type === 'historical-price') {
      const date = searchParams.get('date')
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { error: 'date parameter required in yyyy-MM-dd format' },
          { status: 400 },
        )
      }
      const data = await fetchCoinHistoricalPrice(coinId, date)
      return NextResponse.json(data)
    }

    // Market chart (performance over time)
    if (type === 'market-chart') {
      const days = parseInt(searchParams.get('days') ?? '90', 10)
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json({ error: 'days must be between 1 and 365' }, { status: 400 })
      }
      const interval = searchParams.get('interval') === 'daily' ? ('daily' as const) : undefined
      const data = await fetchCoinMarketChart(coinId, days, interval)
      return NextResponse.json(data)
    }

    // Legacy: Bitcoin-specific history
    if (type === 'history') {
      const days = parseInt(searchParams.get('days') ?? '90', 10)
      const history = await fetchBitcoinHistory(days)
      return NextResponse.json(history)
    }

    // Default: Bitcoin price
    if (coinId === 'bitcoin') {
      const price = await fetchBitcoinPrice()
      return NextResponse.json(price)
    }

    return NextResponse.json(
      { error: 'Use type=markets for non-Bitcoin price data' },
      { status: 400 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch crypto data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
