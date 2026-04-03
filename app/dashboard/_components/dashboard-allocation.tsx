'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PieChartIcon } from 'lucide-react'
import { InfoTooltip } from '@/components/info-tooltip'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  ASSET_COLOR_CLASSES,
  DEFAULT_ASSET_COLOR,
  ASSET_COLORS,
} from '@/app/dashboard/portfolio/_constants'
import type { DashboardAllocation } from '@/app/dashboard/_utils'

interface DashboardAllocationProps {
  data: DashboardAllocation[]
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: DashboardAllocation }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null
  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="font-medium">{item.symbol}</p>
      <p className="text-sm font-mono tabular-nums">{formatUsd(item.value)}</p>
      <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
    </div>
  )
}

export const DashboardAllocationChart = ({ data }: DashboardAllocationProps) => {
  if (data.length === 0) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center gap-1">
            <CardTitle>Allocation</CardTitle>
            <InfoTooltip text="How your portfolio is distributed across assets. Shows each holding's percentage of total value so you can check if you're balanced according to your strategy." />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <PieChartIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Add positions to see allocation breakdown.
            </p>
            <Link
              href="/dashboard/portfolio"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3')}
            >
              Add Position
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-1">
          <CardTitle>Allocation</CardTitle>
          <InfoTooltip text="How your portfolio is distributed across assets. Shows each holding's percentage of total value so you can check if you're balanced according to your strategy." />
        </div>
        <Link
          href="/dashboard/portfolio"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}
        >
          Details
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  nameKey="symbol"
                  stroke="var(--background)"
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.symbol}
                      fill={ASSET_COLORS[entry.symbol] ?? 'hsl(220, 10%, 50%)'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5">
            {data.map((item) => (
              <div key={item.symbol} className="flex items-center gap-2.5">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${(ASSET_COLOR_CLASSES[item.symbol] ?? DEFAULT_ASSET_COLOR).solid}`}
                />
                <div>
                  <p className="text-sm font-medium leading-none">{item.symbol}</p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {item.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
