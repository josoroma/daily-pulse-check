import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { formatUsd, formatPct } from '../_utils'

interface TotalValueCardProps {
  totalValue: number
  totalCostBasis: number
  dayChangeAmount: number
  dayChangePct: number
}

export function TotalValueCard({
  totalValue,
  totalCostBasis,
  dayChangeAmount,
  dayChangePct,
}: TotalValueCardProps) {
  const unrealizedPnl = totalValue - totalCostBasis
  const unrealizedPnlPct = totalCostBasis > 0 ? (unrealizedPnl / totalCostBasis) * 100 : 0
  const isDayPositive = dayChangeAmount >= 0
  const isPnLPositive = unrealizedPnl >= 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">{formatUsd(totalValue)}</div>
        </CardContent>
      </Card>

      {/* 24h Change */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">24h Change</CardTitle>
          {isDayPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tabular-nums font-mono ${isDayPositive ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {formatUsd(dayChangeAmount)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className={isDayPositive ? 'text-emerald-500' : 'text-rose-500'}>
              {formatPct(dayChangePct)}
            </span>{' '}
            today
          </p>
        </CardContent>
      </Card>

      {/* Unrealized P&L */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unrealized P&L
          </CardTitle>
          {isPnLPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tabular-nums font-mono ${isPnLPositive ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {formatUsd(unrealizedPnl)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className={isPnLPositive ? 'text-emerald-500' : 'text-rose-500'}>
              {formatPct(unrealizedPnlPct)}
            </span>{' '}
            total return
          </p>
        </CardContent>
      </Card>

      {/* Cost Basis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cost Basis</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">
            {formatUsd(totalCostBasis)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Total invested</p>
        </CardContent>
      </Card>
    </div>
  )
}
