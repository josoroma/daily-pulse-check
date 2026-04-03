'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, BarChart3, Hash } from 'lucide-react'
import { InfoTooltip } from '@/components/info-tooltip'
import { formatUsd, formatPct } from '../_utils'

interface DcaSummaryCardsProps {
  totalInvested: number
  currentValue: number
  averageCostBasis: number
  transactionCount: number
  symbol: string
}

export function DcaSummaryCards({
  totalInvested,
  currentValue,
  averageCostBasis,
  transactionCount,
  symbol,
}: DcaSummaryCardsProps) {
  const returnPct = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0
  const pnl = currentValue - totalInvested

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invested
            </CardTitle>
            <InfoTooltip text="The cumulative amount you've put into this asset through DCA purchases. Each scheduled buy adds to this total." />
          </div>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">
            {formatUsd(totalInvested)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {transactionCount} DCA buys of {symbol}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Value
            </CardTitle>
            <InfoTooltip text="What your DCA holdings are worth today at current market prices. Compare against Total Invested to see your profit or loss." />
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">{formatUsd(currentValue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className={pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
              {formatPct(returnPct)}
            </span>{' '}
            return
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Cost Basis
            </CardTitle>
            <InfoTooltip text="Your weighted average purchase price across all DCA buys. A lower average than the current price means your DCA strategy is profitable." />
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">
            {formatUsd(averageCostBasis)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Weighted average price</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">DCA Buys</CardTitle>
            <InfoTooltip text="How many individual DCA purchases have been executed for this asset. More buys means better cost averaging across different price levels." />
          </div>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">{transactionCount}</div>
          <p className="text-xs text-muted-foreground mt-1">Total executions</p>
        </CardContent>
      </Card>
    </div>
  )
}
