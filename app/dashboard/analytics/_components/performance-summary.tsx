'use client'

import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTooltip } from '@/components/info-tooltip'
import type { TotalReturn, BenchmarkComparison } from '../_utils'
import { formatUsd, formatPct } from '../_utils'

interface PerformanceSummaryProps {
  totalReturn: TotalReturn
  twrrPct: number
  benchmark: BenchmarkComparison | null
}

export const PerformanceSummary = ({
  totalReturn,
  twrrPct,
  benchmark,
}: PerformanceSummaryProps) => {
  const isPositive = totalReturn.totalReturn >= 0
  const isTwrrPositive = twrrPct >= 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Portfolio Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portfolio Value
            </CardTitle>
            <InfoTooltip text="Your portfolio's current total market value and cost basis. The difference between these two numbers is your unrealized profit or loss." />
          </div>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums font-mono">
            {formatUsd(totalReturn.totalCurrentValue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cost basis: {formatUsd(totalReturn.totalCostBasis)}
          </p>
        </CardContent>
      </Card>

      {/* Total Return */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Return
            </CardTitle>
            <InfoTooltip text="Absolute dollar gain or loss and the percentage return since you started investing. Calculated as (current value − cost basis)." />
          </div>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tabular-nums font-mono ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {formatUsd(totalReturn.totalReturn)}
          </div>
          <p className="text-xs mt-1">
            <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
              {formatPct(totalReturn.totalReturnPct)}
            </span>{' '}
            <span className="text-muted-foreground">all time</span>
          </p>
        </CardContent>
      </Card>

      {/* TWRR */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time-Weighted Return
            </CardTitle>
            <InfoTooltip text="Measures pure investment performance by removing the effect of deposits and withdrawals. The industry standard way to evaluate how well your asset picks performed regardless of timing." />
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold tabular-nums font-mono ${isTwrrPositive ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {formatPct(twrrPct)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pure investment performance</p>
        </CardContent>
      </Card>

      {/* Benchmark Comparison */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              vs S&P 500 (VOO)
            </CardTitle>
            <InfoTooltip text="Are you beating the market? Compares your time-weighted return against the S&P 500 ETF (VOO). Green means outperforming, red means you'd have done better in a passive index fund." />
          </div>
          {benchmark?.isOutperforming ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )}
        </CardHeader>
        <CardContent>
          {benchmark ? (
            <>
              <div
                className={`text-2xl font-bold tabular-nums font-mono ${benchmark.isOutperforming ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                {formatPct(benchmark.outperformancePct)}
              </div>
              <p className="text-xs mt-1">
                <span className="text-muted-foreground">
                  {benchmark.isOutperforming ? 'Outperforming' : 'Underperforming'} benchmark (
                  {formatPct(benchmark.benchmarkReturnPct)})
                </span>
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold tabular-nums font-mono text-muted-foreground/50">
                —
              </div>
              <p className="text-xs text-muted-foreground mt-1">Need more data for comparison</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const PerformanceSummarySkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    ))}
  </div>
)
