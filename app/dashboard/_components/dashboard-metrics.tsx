'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Bitcoin } from 'lucide-react'
import { useCurrency } from '@/app/dashboard/_hooks'
import type { DashboardMetrics } from '@/app/dashboard/_utils'

interface DashboardMetricsProps {
  metrics: DashboardMetrics
}

function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export const DashboardMetricsCards = ({ metrics }: DashboardMetricsProps) => {
  const { format } = useCurrency()
  const { totalValue, totalCostBasis, dayChangeAmount, dayChangePct, btcPrice, btcChange24h } =
    metrics

  const unrealizedPnl = totalValue - totalCostBasis
  const unrealizedPnlPct = totalCostBasis > 0 ? (unrealizedPnl / totalCostBasis) * 100 : 0
  const isDayPositive = dayChangeAmount >= 0
  const isPnlPositive = unrealizedPnl >= 0
  const isBtcPositive = btcChange24h >= 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">{format(totalValue)}</div>
          {totalValue > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Across all positions</p>
          )}
        </CardContent>
      </Card>

      {/* Day Change */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Day Change</CardTitle>
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
            {dayChangeAmount !== 0 ? format(dayChangeAmount) : '—'}
          </div>
          {dayChangeAmount !== 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className={isDayPositive ? 'text-emerald-500' : 'text-rose-500'}>
                {formatPct(dayChangePct)}
              </span>{' '}
              today
            </p>
          )}
        </CardContent>
      </Card>

      {/* Total Return */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Return</CardTitle>
          {isPnlPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tabular-nums font-mono ${isPnlPositive ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {totalCostBasis > 0 ? format(unrealizedPnl) : '—'}
          </div>
          {totalCostBasis > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className={isPnlPositive ? 'text-emerald-500' : 'text-rose-500'}>
                {formatPct(unrealizedPnlPct)}
              </span>{' '}
              unrealized
            </p>
          )}
        </CardContent>
      </Card>

      {/* BTC Price */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">BTC Price</CardTitle>
          <Bitcoin className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">
            {btcPrice > 0
              ? `$${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : '—'}
          </div>
          {btcPrice > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className={isBtcPositive ? 'text-emerald-500' : 'text-rose-500'}>
                {formatPct(btcChange24h)}
              </span>{' '}
              24h
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
