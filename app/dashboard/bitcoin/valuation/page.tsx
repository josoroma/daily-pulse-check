import {
  fetchMvrvZScore,
  fetchS2FData,
  fetchRainbowData,
  fetchBtcPriceHistory,
} from '@/lib/bitcoin/valuation'
import { MvrvChart } from '../_components/mvrv-chart'
import { S2FChart } from '../_components/s2f-chart'
import { RainbowChart } from '../_components/rainbow-chart'
import { ErrorToasts } from '../../_components/error-toasts'
import { Bitcoin } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

async function fetchValuationData() {
  const errors: string[] = []
  // Fetch price history once, share across S2F and Rainbow (same CoinGecko endpoint)
  const priceHistory = await fetchBtcPriceHistory().catch(() => undefined)

  const [mvrv, s2f, rainbow] = await Promise.allSettled([
    fetchMvrvZScore(priceHistory),
    fetchS2FData(priceHistory),
    fetchRainbowData(priceHistory),
  ])

  if (mvrv.status === 'rejected') errors.push('MVRV Z-Score data failed to load')
  if (s2f.status === 'rejected') errors.push('Stock-to-Flow data failed to load')
  if (rainbow.status === 'rejected') errors.push('Rainbow model data failed to load')

  return {
    mvrv: mvrv.status === 'fulfilled' ? mvrv.value : null,
    s2f: s2f.status === 'fulfilled' ? s2f.value : null,
    rainbow: rainbow.status === 'fulfilled' ? rainbow.value : null,
    errors,
  }
}

export default async function ValuationPage() {
  const { mvrv, s2f, rainbow, errors } = await fetchValuationData()

  return (
    <div className="space-y-6 px-4 py-8">
      {errors.length > 0 && <ErrorToasts errors={errors} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bitcoin className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold tracking-tight">Valuation Models</h1>
          </div>
          <p className="text-muted-foreground">
            MVRV Z-Score, Stock-to-Flow &amp; Rainbow Price Bands
          </p>
        </div>
        <Link href="/dashboard/bitcoin">
          <Button variant="outline" size="sm">
            ← Network Metrics
          </Button>
        </Link>
      </div>

      {/* MVRV Z-Score */}
      <MvrvChart data={mvrv} />

      {/* Stock-to-Flow */}
      <S2FChart data={s2f} />

      {/* Rainbow Chart */}
      <RainbowChart data={rainbow} />
    </div>
  )
}
