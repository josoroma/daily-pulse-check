import {
  fetchBlockHeight,
  fetchHashrate,
  fetchMempool,
  fetchDifficulty,
} from '@/lib/bitcoin/onchain'
import { calculateHalvingCountdown, calculateSupplyMetrics } from '@/lib/bitcoin/halving'
import { BitcoinMetricsLive } from './_components/bitcoin-metrics-live'
import { HalvingCountdown } from './_components/halving-countdown'
import { HalvingTimeline } from './_components/halving-timeline'
import { SupplyMetrics } from './_components/supply-metrics'
import { ErrorToasts } from '../_components/error-toasts'
import { Bitcoin } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** Fallback block height when the Mempool.space API is unreachable */
const FALLBACK_BLOCK_HEIGHT = 890_000

async function fetchOnchainData() {
  const errors: string[] = []
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

  if (blockHeight.status === 'rejected') errors.push('Block height data failed to load')
  if (hashrate.status === 'rejected') errors.push('Hashrate data failed to load')
  if (mempool.status === 'rejected') errors.push('Mempool data failed to load')
  if (difficulty.status === 'rejected') errors.push('Difficulty data failed to load')

  return {
    blockHeight: blockHeight.status === 'fulfilled' ? blockHeight.value : null,
    hashrate: hashrate.status === 'fulfilled' ? hashrate.value : null,
    mempool: mempool.status === 'fulfilled' ? mempool.value : null,
    difficulty: difficulty.status === 'fulfilled' ? difficulty.value : null,
    errors,
  }
}

export default async function BitcoinPage() {
  const { errors, ...onchain } = await fetchOnchainData()

  const currentHeight = onchain.blockHeight?.height ?? FALLBACK_BLOCK_HEIGHT
  const halvingCountdown = calculateHalvingCountdown(currentHeight)
  const supplyMetrics = calculateSupplyMetrics(currentHeight)

  return (
    <div className="space-y-6 px-4 py-8">
      {errors.length > 0 && <ErrorToasts errors={errors} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bitcoin className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold tracking-tight">Bitcoin Analytics</h1>
          </div>
          <p className="text-muted-foreground">
            Network metrics, halving data &amp; supply tracking
          </p>
        </div>
        <Link href="/dashboard/bitcoin/valuation">
          <Button variant="outline" size="sm">
            Valuation Models →
          </Button>
        </Link>
      </div>

      {/* Network metrics with auto-refresh */}
      <BitcoinMetricsLive initialData={onchain} />

      {/* Halving + Supply section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <HalvingCountdown data={halvingCountdown} />
        </div>
        <div className="col-span-3">
          <SupplyMetrics data={supplyMetrics} />
        </div>
      </div>

      {/* Halving History */}
      <HalvingTimeline />
    </div>
  )
}
