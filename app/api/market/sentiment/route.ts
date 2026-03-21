import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCryptoFearGreed, fetchCryptoFearGreedHistory } from '@/lib/market/sentiment'

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
    const days = searchParams.get('days')

    if (days) {
      const history = await fetchCryptoFearGreedHistory(parseInt(days, 10))
      return NextResponse.json(history)
    }

    const current = await fetchCryptoFearGreed()
    return NextResponse.json(current)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sentiment data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
