import { NextRequest, NextResponse } from 'next/server'
import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { fetchCryptoFearGreed } from '@/lib/market/sentiment'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Market Pre-fetch Cron — warms the cache before market hours.
 * Schedule: *\/5 * * * * (every 5 minutes)
 *
 * Calls fetch functions for the core watchlist so that
 * dashboard loads are instant from cache.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await Promise.allSettled([
    fetchPrice('VOO'),
    fetchPrice('QQQ'),
    fetchBitcoinPrice(),
    fetchCryptoFearGreed(),
  ])

  const summary = {
    voo: results[0]?.status === 'fulfilled' ? 'ok' : 'failed',
    qqq: results[1]?.status === 'fulfilled' ? 'ok' : 'failed',
    btc: results[2]?.status === 'fulfilled' ? 'ok' : 'failed',
    fearGreed: results[3]?.status === 'fulfilled' ? 'ok' : 'failed',
  }

  const successCount = results.filter((r) => r.status === 'fulfilled').length

  return NextResponse.json({
    prefetched: successCount,
    total: results.length,
    summary,
  })
}
