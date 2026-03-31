'use client'

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
import { buttonVariants } from '@/components/ui/button'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { DashboardSnapshot } from '@/app/dashboard/_utils'

interface DashboardPerformanceProps {
  data: DashboardSnapshot[]
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
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

export const DashboardPerformance = ({ data }: DashboardPerformanceProps) => {
  const firstValue = data[0]?.value ?? 0
  const lastValue = data[data.length - 1]?.value ?? 0
  const changeAmount = lastValue - firstValue
  const changePct = firstValue > 0 ? (changeAmount / firstValue) * 100 : 0
  const isPositive = changeAmount >= 0

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Performance</CardTitle>
          {data.length > 1 && (
            <CardDescription>
              {isPositive ? '+' : ''}
              {formatUsd(changeAmount)}{' '}
              <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                ({isPositive ? '+' : ''}
                {changePct.toFixed(2)}%)
              </span>{' '}
              last 30 days
            </CardDescription>
          )}
        </div>
        <Link
          href="/dashboard/portfolio"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="dashPerformanceGradient" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? 'hsl(160, 60%, 45%)' : 'hsl(0, 70%, 50%)'}
                strokeWidth={2}
                fill="url(#dashPerformanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Portfolio snapshots will appear here after your first day.
            </p>
            <Link
              href="/dashboard/portfolio"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3')}
            >
              Go to Portfolio
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
