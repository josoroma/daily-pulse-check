'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { InfoTooltip } from '@/components/info-tooltip'
import type { ExchangeRatePoint } from '@/lib/market/bccr'

interface ExchangeRateChartProps {
  data: ExchangeRatePoint[]
  isLoading?: boolean
}

export const ExchangeRateChart = ({ data, isLoading }: ExchangeRateChartProps) => {
  if (isLoading) {
    return <ExchangeRateChartSkeleton />
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            USD/CRC Exchange Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Exchange rate data unavailable — check BCCR_SDDE_TOKEN env var
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const latest = data[data.length - 1]!
  const first = data[0]!
  const change = latest.sell - first.sell
  const changePct = (change / first.sell) * 100
  const isUp = change > 0
  const isFlat = Math.abs(changePct) < 0.01

  // Calculate the Y-axis domain with some padding
  const allValues = data.flatMap((d) => [d.buy, d.sell])
  const minVal = Math.floor(Math.min(...allValues) - 1)
  const maxVal = Math.ceil(Math.max(...allValues) + 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                USD/CRC Exchange Rate
              </CardTitle>
              <InfoTooltip text="Official USD to Costa Rican Colón exchange rate from the Central Bank (BCCR). The buy rate is what banks pay you for USD; the sell rate is what you pay to buy USD. Tracking the spread and trend helps time currency conversions for investments." />
            </div>
            <CardDescription className="text-xs">
              Official BCCR rates — last {data.length} days
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums font-mono">₡{latest.sell.toFixed(2)}</p>
            <Badge
              variant="outline"
              className={
                isFlat ? 'text-muted-foreground' : isUp ? 'text-rose-500' : 'text-emerald-500'
              }
            >
              {isFlat ? (
                <Minus className="mr-1 h-3 w-3" />
              ) : isUp ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {isUp ? '+' : ''}
              {changePct.toFixed(2)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sellGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(35, 95%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(35, 95%, 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="buyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220, 70%, 55%)" stopOpacity={0.2} />
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
              domain={[minVal, maxVal]}
              tickFormatter={(v: number) => `₡${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value, name) => [
                `₡${Number(value ?? 0).toFixed(2)}`,
                name === 'sell' ? 'Sell (Venta)' : 'Buy (Compra)',
              ]}
              labelFormatter={(label) => new Date(String(label)).toLocaleDateString()}
            />
            <Legend formatter={(value) => (value === 'sell' ? 'Sell (Venta)' : 'Buy (Compra)')} />
            <Area
              type="monotone"
              dataKey="sell"
              stroke="hsl(35, 95%, 55%)"
              fill="url(#sellGradient)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="buy"
              stroke="hsl(220, 70%, 55%)"
              fill="url(#buyGradient)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Buy: ₡{latest.buy.toFixed(2)} · Sell: ₡{latest.sell.toFixed(2)}
          </span>
          <span>Spread: ₡{(latest.sell - latest.buy).toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

const ExchangeRateChartSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </CardContent>
  </Card>
)
