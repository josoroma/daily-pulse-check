'use client'

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CostBasisPoint } from '../_utils'
import { formatUsd } from '../_utils'
import { formatDateShort } from '@/lib/date'

interface DcaHistoryChartProps {
  costBasisTrend: CostBasisPoint[]
  currentPrice: number
  symbol: string
  assetColor: string
}

interface ChartDataPoint {
  date: string
  dateLabel: string
  averageCostBasis: number
  buyPrice: number | null
  totalInvested: number
}

export function DcaHistoryChart({
  costBasisTrend,
  currentPrice,
  symbol,
  assetColor,
}: DcaHistoryChartProps) {
  if (costBasisTrend.length === 0) return null

  const chartData: ChartDataPoint[] = costBasisTrend.map((point) => ({
    date: point.date,
    dateLabel: formatDateShort(point.date),
    averageCostBasis: point.averageCostBasis,
    buyPrice: point.totalInvested / point.totalQuantity,
    totalInvested: point.totalInvested,
  }))

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>DCA History — {symbol}</CardTitle>
          <CardDescription>
            Each point is a DCA buy. The line tracks your weighted average cost basis.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="costBasisGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={assetColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={assetColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              tickFormatter={(v: number) => `$${v.toLocaleString()}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const data = payload[0]?.payload as ChartDataPoint
                return (
                  <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3">
                    <p className="text-sm font-medium">{data.dateLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg Cost Basis:{' '}
                      <span className="font-mono tabular-nums">
                        {formatUsd(data.averageCostBasis)}
                      </span>
                    </p>
                    {data.buyPrice && (
                      <p className="text-xs text-muted-foreground">
                        Buy Price:{' '}
                        <span className="font-mono tabular-nums">{formatUsd(data.buyPrice)}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Total Invested:{' '}
                      <span className="font-mono tabular-nums">
                        {formatUsd(data.totalInvested)}
                      </span>
                    </p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="averageCostBasis"
              stroke={assetColor}
              strokeWidth={2}
              dot={false}
              name="Avg Cost Basis"
            />
            <Scatter dataKey="buyPrice" fill={assetColor} name="DCA Buy" r={5} />
            <ReferenceLine
              y={currentPrice}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{
                value: `Current: ${formatUsd(currentPrice)}`,
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
