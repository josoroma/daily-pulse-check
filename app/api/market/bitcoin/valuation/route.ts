import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchMvrvZScore,
  fetchS2FData,
  fetchRainbowData,
  fetchBtcPriceHistory,
} from '@/lib/bitcoin/valuation'

/**
 * GET /api/market/bitcoin/valuation
 *
 * Query params:
 *   ?model=mvrv   — MVRV Z-Score only
 *   ?model=s2f    — Stock-to-Flow only
 *   ?model=rainbow — Rainbow Price Band only
 *   (none)        — all three models in a single response
 *
 * Auth: requires a valid Supabase session.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const model = request.nextUrl.searchParams.get('model')

    if (model === 'mvrv') {
      const data = await fetchMvrvZScore()
      return NextResponse.json(data)
    }

    if (model === 's2f') {
      const data = await fetchS2FData()
      return NextResponse.json(data)
    }

    if (model === 'rainbow') {
      const data = await fetchRainbowData()
      return NextResponse.json(data)
    }

    // Fetch all models — share price history to avoid duplicate CoinGecko calls
    const priceHistory = await fetchBtcPriceHistory().catch(() => undefined)

    const [mvrv, s2f, rainbow] = await Promise.allSettled([
      fetchMvrvZScore(priceHistory),
      fetchS2FData(priceHistory),
      fetchRainbowData(priceHistory),
    ])

    return NextResponse.json({
      mvrv: mvrv.status === 'fulfilled' ? mvrv.value : null,
      s2f: s2f.status === 'fulfilled' ? s2f.value : null,
      rainbow: rainbow.status === 'fulfilled' ? rainbow.value : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch valuation data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
