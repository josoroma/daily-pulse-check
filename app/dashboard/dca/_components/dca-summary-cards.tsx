'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, BarChart3, Hash } from 'lucide-react'
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
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Invested
          </CardTitle>
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
          <CardTitle className="text-sm font-medium text-muted-foreground">Current Value</CardTitle>
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
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Cost Basis
          </CardTitle>
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
          <CardTitle className="text-sm font-medium text-muted-foreground">DCA Buys</CardTitle>
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
