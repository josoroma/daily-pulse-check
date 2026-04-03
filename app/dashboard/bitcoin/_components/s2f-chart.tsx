'use client'

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'
import type { S2FData } from '@/lib/bitcoin/valuation'

interface S2FChartProps {
  data: S2FData | null
}

function S2FTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="text-xs font-mono tabular-nums"
          style={{ color: entry.color }}
        >
          {entry.name}: $
          {entry.value?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'}
        </p>
      ))}
    </div>
  )
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function S2FChart({ data }: S2FChartProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock-to-Flow Model</CardTitle>
          <CardDescription>S2F model price vs actual price</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            S2F data unavailable
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sample data points to prevent rendering thousands of points
  const step = Math.max(1, Math.floor(data.dataPoints.length / 200))
  const chartData = data.dataPoints
    .filter((_, i) => i % step === 0 || i === data.dataPoints.length - 1)
    .map((point) => ({
      date: formatDate(point.timestamp),
      timestamp: point.timestamp,
      price: point.price,
      modelPrice: point.s2fModelPrice,
    }))

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="flex items-center gap-1">
            <CardTitle>Stock-to-Flow Model</CardTitle>
            <InfoTooltip text="The Stock-to-Flow model measures scarcity by dividing existing supply (stock) by annual production (flow). A higher S2F means greater scarcity. The green line is the model's predicted price; the orange line is the actual BTC price. Pickaxe icons mark halving events. Uses full BTC price history from Blockchain.com (2009–present). Caveat: coefficients are from PlanB's 2019 regression and have increasingly diverged from spot price since the 2021 cycle — treat as educational context, not a forecast." />
          </div>
          <CardDescription>
            Current S2F: {data.currentS2F.toFixed(1)} · Model Price: $
            {data.currentModelPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="s2fPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(35, 95%, 55%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(35, 95%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              scale="log"
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => {
                if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
                return `$${v.toFixed(0)}`
              }}
              width={55}
              allowDataOverflow
            />
            <Tooltip content={<S2FTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="line" />
            {/* Halving event markers */}
            {data.halvingEvents.map((event) => (
              <ReferenceLine
                key={event.blockHeight}
                x={formatDate(event.timestamp)}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: `⛏`,
                  position: 'top',
                  fontSize: 14,
                }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="modelPrice"
              name="S2F Model"
              stroke="hsl(160, 60%, 45%)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="price"
              name="BTC Price"
              stroke="hsl(35, 95%, 55%)"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
