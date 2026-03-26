'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatUsd } from '../_utils'
import { ASSET_COLORS, ASSET_COLOR_CLASSES, DEFAULT_ASSET_COLOR } from '../_constants'

interface AllocationItem {
  symbol: string
  value: number
  percentage: number
}

interface AllocationChartProps {
  data: AllocationItem[]
}

function getAssetColor(symbol: string): string {
  return ASSET_COLORS[symbol] ?? 'hsl(220, 10%, 50%)'
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: AllocationItem }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null
  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="font-medium">{item.symbol}</p>
      <p className="text-sm font-mono tabular-nums">{formatUsd(item.value)}</p>
      <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}% of portfolio</p>
    </div>
  )
}

export function AllocationChart({ data }: AllocationChartProps) {
  if (data.length === 0) return null

  const totalValue = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
        <CardDescription>Portfolio distribution by asset</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="symbol"
                  stroke="var(--background)"
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.symbol} fill={getAssetColor(entry.symbol)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.symbol} className="flex items-center gap-3">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${(ASSET_COLOR_CLASSES[item.symbol] ?? DEFAULT_ASSET_COLOR).solid}`}
                />
                <div>
                  <p className="text-sm font-medium">{item.symbol}</p>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {item.percentage.toFixed(1)}% · {formatUsd(item.value)}
                  </p>
                </div>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-medium font-mono tabular-nums">{formatUsd(totalValue)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
