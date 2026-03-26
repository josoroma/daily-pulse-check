'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatUsd } from '../_utils'
import { TIME_RANGES, type TimeRange } from '../_constants'
import { daysAgoCR } from '@/lib/date'

interface SnapshotPoint {
  date: string
  value: number
}

interface PerformanceChartProps {
  data: SnapshotPoint[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium font-mono tabular-nums">
        {formatUsd(payload[0]?.value ?? 0)}
      </p>
    </div>
  )
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const [range, setRange] = useState<TimeRange>('ALL')

  const filteredData = filterByRange(data, range)

  const firstValue = filteredData[0]?.value ?? 0
  const lastValue = filteredData[filteredData.length - 1]?.value ?? 0
  const changeAmount = lastValue - firstValue
  const changePct = firstValue > 0 ? (changeAmount / firstValue) * 100 : 0
  const isPositive = changeAmount >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Performance</CardTitle>
          <CardDescription>
            {isPositive ? '+' : ''}
            {formatUsd(changeAmount)}{' '}
            <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
              ({isPositive ? '+' : ''}
              {changePct.toFixed(2)}%)
            </span>
          </CardDescription>
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? 'hsl(160, 60%, 45%)' : 'hsl(0, 70%, 50%)'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? 'hsl(160, 60%, 45%)' : 'hsl(0, 70%, 50%)'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? 'hsl(160, 60%, 45%)' : 'hsl(0, 70%, 50%)'}
                strokeWidth={2}
                fill="url(#portfolioGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            Not enough data for the selected time range.
            {data.length === 0 && ' Portfolio snapshots will appear after your first day.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function filterByRange(data: SnapshotPoint[], range: TimeRange): SnapshotPoint[] {
  if (range === 'ALL' || data.length === 0) return data

  const daysMap: Record<Exclude<TimeRange, 'ALL'>, number> = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
  }

  const cutoffStr = daysAgoCR(daysMap[range])

  return data.filter((d) => d.date >= cutoffStr)
}
