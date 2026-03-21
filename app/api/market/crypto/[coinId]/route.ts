import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchBitcoinPrice, fetchBitcoinHistory } from '@/lib/market/crypto'

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

    if (coinId !== 'bitcoin') {
      return NextResponse.json({ error: 'Only bitcoin is supported' }, { status: 400 })
    }

    if (type === 'history') {
      const days = parseInt(searchParams.get('days') ?? '90', 10)
      const history = await fetchBitcoinHistory(days)
      return NextResponse.json(history)
    }

    const price = await fetchBitcoinPrice()
    return NextResponse.json(price)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch crypto data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
