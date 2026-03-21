import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchPrice, isUsingCachedData } from '@/lib/market/stocks'

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { symbol } = await params
    const price = await fetchPrice(symbol)
    const usingCached = await isUsingCachedData()

    return NextResponse.json({
      ...price,
      cachedData: usingCached,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch price'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
