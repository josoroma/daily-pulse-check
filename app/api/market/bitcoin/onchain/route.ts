import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchBlockHeight,
  fetchHashrate,
  fetchMempool,
  fetchDifficulty,
} from '@/lib/bitcoin/onchain'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hashratePromise = fetchHashrate()

    const [blockHeight, hashrate, mempool, difficulty] = await Promise.allSettled([
      fetchBlockHeight(),
      hashratePromise,
      fetchMempool(),
      hashratePromise.then(
        (h) => fetchDifficulty(h.currentDifficulty),
        () => fetchDifficulty(),
      ),
    ])

    return NextResponse.json({
      blockHeight: blockHeight.status === 'fulfilled' ? blockHeight.value : null,
      hashrate: hashrate.status === 'fulfilled' ? hashrate.value : null,
      mempool: mempool.status === 'fulfilled' ? mempool.value : null,
      difficulty: difficulty.status === 'fulfilled' ? difficulty.value : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch on-chain data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
