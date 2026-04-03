import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchBccrIndicator,
  fetchExchangeRateHistory,
  BCCR_INDICATORS,
  type BccrIndicatorId,
} from '@/lib/market/bccr'

const VALID_INDICATORS = Object.keys(BCCR_INDICATORS) as BccrIndicatorId[]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    // Fetch exchange rate history
    if (type === 'exchange-history') {
      const days = parseInt(searchParams.get('days') ?? '30', 10)
      if (days < 1 || days > 365) {
        return NextResponse.json({ error: 'Days must be between 1 and 365' }, { status: 400 })
      }
      const history = await fetchExchangeRateHistory(days)
      return NextResponse.json(history)
    }

    // Fetch all macro indicators at once
    if (type === 'indicators') {
      const results = await Promise.allSettled(VALID_INDICATORS.map((id) => fetchBccrIndicator(id)))

      const indicators = results
        .filter(
          (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchBccrIndicator>>> =>
            r.status === 'fulfilled',
        )
        .map((r) => r.value)

      return NextResponse.json(indicators)
    }

    return NextResponse.json(
      { error: 'Invalid type parameter. Use "indicators" or "exchange-history"' },
      { status: 400 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch BCCR data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
