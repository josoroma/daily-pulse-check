'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'
import { Skeleton } from '@/components/ui/skeleton'

interface BenchmarkChartProps {
  portfolioData: Array<{ date: string; value: number }>
  benchmarkData: Array<{ date: string; value: number }>
}

export const BenchmarkChart = ({ portfolioData, benchmarkData }: BenchmarkChartProps) => {
  // Normalize both series to percentage returns from start
  const normalizeToReturns = (data: Array<{ date: string; value: number }>) => {
    if (data.length === 0) return []
    const startValue = data[0]!.value
    if (startValue <= 0) return data.map((d) => ({ date: d.date, return: 0 }))
    return data.map((d) => ({
      date: d.date,
      return: ((d.value - startValue) / startValue) * 100,
    }))
  }

  const portfolioReturns = normalizeToReturns(portfolioData)
  const benchmarkReturns = normalizeToReturns(benchmarkData)

  // Merge on date
  const dateSet = new Map<string, { portfolio?: number; benchmark?: number }>()
  for (const p of portfolioReturns) {
    const key = p.date.slice(0, 10)
    dateSet.set(key, { ...dateSet.get(key), portfolio: p.return })
  }
  for (const b of benchmarkReturns) {
    const key = b.date.slice(0, 10)
    dateSet.set(key, { ...dateSet.get(key), benchmark: b.return })
  }

  const merged = Array.from(dateSet.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      portfolio: vals.portfolio ?? null,
      benchmark: vals.benchmark ?? null,
    }))

  if (merged.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-1">
            <CardTitle>Portfolio vs Benchmark</CardTitle>
            <InfoTooltip text="Cumulative percentage return chart comparing your portfolio against the S&P 500 (VOO). Both series are normalized to start at 0% so you can see relative performance over time." />
          </div>
          <CardDescription>Performance comparison with S&P 500 (VOO)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            Need portfolio history data for benchmark comparison.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1">
          <CardTitle>Portfolio vs Benchmark</CardTitle>
          <InfoTooltip text="Cumulative percentage return chart comparing your portfolio against the S&P 500 (VOO). Both series are normalized to start at 0% so you can see relative performance over time." />
        </div>
        <CardDescription>Cumulative return comparison with S&P 500 (VOO)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={merged} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220, 70%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(220, 70%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: string) => {
                const d = new Date(v)
                return `${d.getMonth() + 1}/${d.getDate()}`
              }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value, name) => [
                `${Number(value ?? 0).toFixed(2)}%`,
                name === 'portfolio' ? 'Your Portfolio' : 'S&P 500 (VOO)',
              ]}
              labelFormatter={(label) => new Date(String(label)).toLocaleDateString()}
            />
            <Legend
              formatter={(value) => (value === 'portfolio' ? 'Your Portfolio' : 'S&P 500 (VOO)')}
            />
            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="hsl(160, 60%, 45%)"
              fill="url(#portfolioGradient)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="benchmark"
              stroke="hsl(220, 70%, 55%)"
              fill="url(#benchmarkGradient)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export const BenchmarkChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64 mt-1" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[300px] w-full" />
    </CardContent>
  </Card>
)
