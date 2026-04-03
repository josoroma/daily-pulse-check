'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/info-tooltip'
import type { LumpSumComparison } from '../_utils'
import { formatUsd, formatPct } from '../_utils'

interface DcaVsLumpsumProps {
  comparison: LumpSumComparison
  symbol: string
}

export function DcaVsLumpsum({ comparison, symbol }: DcaVsLumpsumProps) {
  const {
    dcaTotalInvested,
    dcaCurrentValue,
    dcaReturnPct,
    lumpSumCurrentValue,
    lumpSumReturnPct,
    dcaAdvantage,
  } = comparison

  if (dcaTotalInvested === 0) return null

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="flex items-center gap-1">
            <CardTitle>DCA vs Lump Sum — {symbol}</CardTitle>
            <InfoTooltip text="Side-by-side comparison of your DCA approach versus investing the same total amount on day one. Shows which strategy would have produced better returns for this specific asset and time period." />
          </div>
          <CardDescription>
            Comparing your DCA strategy against investing the same total on day one.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* DCA Result */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">DCA Strategy</h4>
              <Badge
                variant="outline"
                className={
                  dcaAdvantage >= 0
                    ? 'text-emerald-400 bg-emerald-400/10 border-transparent'
                    : 'text-rose-400 bg-rose-400/10 border-transparent'
                }
              >
                {dcaAdvantage >= 0 ? 'Winner' : 'Underperformed'}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Invested</span>
                <span className="font-mono tabular-nums">{formatUsd(dcaTotalInvested)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Value</span>
                <span className="font-mono tabular-nums">{formatUsd(dcaCurrentValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return</span>
                <span
                  className={`font-mono tabular-nums ${dcaReturnPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  {formatPct(dcaReturnPct)}
                </span>
              </div>
            </div>
          </div>

          {/* Lump Sum Result */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Lump Sum</h4>
              <Badge
                variant="outline"
                className={
                  dcaAdvantage < 0
                    ? 'text-emerald-400 bg-emerald-400/10 border-transparent'
                    : 'text-amber-400 bg-amber-400/10 border-transparent'
                }
              >
                {dcaAdvantage < 0 ? 'Winner' : 'Trailing'}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Invested</span>
                <span className="font-mono tabular-nums">{formatUsd(dcaTotalInvested)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Value</span>
                <span className="font-mono tabular-nums">{formatUsd(lumpSumCurrentValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return</span>
                <span
                  className={`font-mono tabular-nums ${lumpSumReturnPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  {formatPct(lumpSumReturnPct)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Advantage Summary */}
        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-sm text-muted-foreground">
            DCA {dcaAdvantage >= 0 ? 'outperformed' : 'underperformed'} lump sum by{' '}
            <span
              className={`font-mono tabular-nums font-medium ${dcaAdvantage >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {formatPct(Math.abs(dcaAdvantage))}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
