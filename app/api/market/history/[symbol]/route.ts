import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchHistory, isUsingCachedData } from '@/lib/market/stocks'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { symbol } = await params
    const searchParams = request.nextUrl.searchParams
    const interval = searchParams.get('interval') ?? '1day'
    const outputsize = parseInt(searchParams.get('outputsize') ?? '30', 10)

    const history = await fetchHistory(symbol, interval, outputsize)
    const usingCached = await isUsingCachedData()

    return NextResponse.json({
      ...history,
      cachedData: usingCached,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch history'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
