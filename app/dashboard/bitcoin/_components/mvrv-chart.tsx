'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'
import type { MvrvData } from '@/lib/bitcoin/valuation'

interface MvrvChartProps {
  data: MvrvData | null
}

export function MvrvChart({ data }: MvrvChartProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>MVRV Z-Score</CardTitle>
          <CardDescription>Market Value to Realized Value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            MVRV data unavailable
          </div>
        </CardContent>
      </Card>
    )
  }

  // Build a single-point display since we only have current data
  const zScore = data.zScore
  let zoneLabel = 'Fair Value'
  let zoneColor = 'text-amber-500'
  if (zScore < 0) {
    zoneLabel = 'Undervalued'
    zoneColor = 'text-emerald-500'
  } else if (zScore >= 6) {
    zoneLabel = 'Bubble Territory'
    zoneColor = 'text-rose-500'
  } else if (zScore >= 3) {
    zoneLabel = 'Overvalued'
    zoneColor = 'text-orange-500'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1">
          <CardTitle>MVRV Z-Score</CardTitle>
          <InfoTooltip text="MVRV Z-Score compares Bitcoin's market cap to its realized cap (the value of all coins at the price they last moved). Values below 0 (green) suggest undervaluation; above 6 (red) signals a potential bubble. Note: the realized cap shown here is an approximation (market cap × ~0.65) because true on-chain UTXO data requires a paid Glassnode or CoinMetrics subscription. Shown as a gauge because historical Z-Score time-series data is not available from the free CoinGecko API." />
        </div>
        <CardDescription>
          Market Value to Realized Value · MVRV Ratio: {data.mvrvRatio.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Current Z-Score hero display */}
        <div className="text-center py-4">
          <div className={`text-5xl font-bold font-mono tabular-nums ${zoneColor}`}>
            {zScore.toFixed(2)}
          </div>
          <p className={`text-sm font-medium mt-1 ${zoneColor}`}>{zoneLabel}</p>
        </div>

        {/* Z-Score gauge bar */}
        <div className="mt-4 space-y-2">
          <div className="relative h-4 rounded-full overflow-hidden flex">
            <div className="flex-1 bg-emerald-500/30" title="Undervalued (< 0)" />
            <div className="flex-1 bg-amber-500/30" title="Fair Value (0-3)" />
            <div className="flex-1 bg-orange-500/30" title="Overvalued (3-6)" />
            <div className="flex-1 bg-rose-500/30" title="Bubble (> 6)" />
            {/* Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-white rounded-full shadow-lg"
              style={{
                left: `${Math.max(0, Math.min(100, ((zScore + 2) / 10) * 100))}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Undervalued</span>
            <span>Fair</span>
            <span>Overvalued</span>
            <span>Bubble</span>
          </div>
        </div>

        {/* Market cap details */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Market Cap</p>
            <p className="text-sm font-bold font-mono tabular-nums mt-0.5">
              ${(data.marketCap / 1e12).toFixed(2)}T
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Realized Cap
              <InfoTooltip text="Estimated as ~65% of market cap. True realized cap requires on-chain UTXO data from Glassnode or CoinMetrics (paid)." />
            </p>
            <p className="text-sm font-bold font-mono tabular-nums mt-0.5">
              ${(data.realizedCap / 1e12).toFixed(2)}T
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
