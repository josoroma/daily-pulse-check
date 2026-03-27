import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchUsdCrcRate } from '@/lib/market/crypto'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rate = await fetchUsdCrcRate()
    return NextResponse.json({ rate })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch exchange rate'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
