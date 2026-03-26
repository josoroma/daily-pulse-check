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
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/info-tooltip'
import type { RainbowData } from '@/lib/bitcoin/valuation'
import { RAINBOW_BANDS } from '@/lib/bitcoin/rainbow-bands'

interface RainbowChartProps {
  data: RainbowData | null
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Determine the band label for a price at a given data point */
function getBandAtPoint(p: Record<string, number>): string {
  const price = p.price
  if (!price) return '—'
  // Bands ordered top→bottom: check from highest to lowest
  for (const band of RAINBOW_BANDS) {
    const key = band.label.replace(/[^a-zA-Z]/g, '')
    const lower = p[`${key}_lower`]
    if (typeof lower === 'number' && price >= lower) return band.label
  }
  return RAINBOW_BANDS[RAINBOW_BANDS.length - 1]!.label
}

function RainbowTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; payload: Record<string, number> }>
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null

  const band = getBandAtPoint(p)
  const bandDef = RAINBOW_BANDS.find((b) => b.label === band)

  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{p.date as unknown as string}</p>
      <p className="text-sm font-medium font-mono tabular-nums">
        ${p.price?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '—'}
      </p>
      <p className="text-xs mt-1" style={{ color: bandDef?.color }}>
        {band}
      </p>
    </div>
  )
}

export function RainbowChart({ data }: RainbowChartProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rainbow Price Band</CardTitle>
          <CardDescription>Logarithmic regression price bands</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            Rainbow data unavailable
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sample data to prevent rendering too many points
  const step = Math.max(1, Math.floor(data.dataPoints.length / 200))
  const chartData = data.dataPoints
    .filter((_, i) => i % step === 0 || i === data.dataPoints.length - 1)
    .map((point) => {
      const entry: Record<string, number | string> = {
        date: formatDate(point.timestamp),
        price: point.price,
      }
      // Add band boundaries
      point.bands.forEach((band) => {
        const key = band.label.replace(/[^a-zA-Z]/g, '')
        entry[`${key}_upper`] = band.upper
        entry[`${key}_lower`] = band.lower
      })
      return entry
    })

  // Compute Y domain from actual prices — show a few bands above and below
  const prices = data.dataPoints.map((p) => p.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const yDomain: [number, number] = [minPrice * 0.15, maxPrice * 20]

  // Get band colors for the legend
  const bandColorMap = new Map<string, string>(RAINBOW_BANDS.map((b) => [b.label, b.color]))

  return (
    <Card>
      <CardHeader>
        <div>
          <div className="flex items-center gap-1">
            <CardTitle>Rainbow Price Band</CardTitle>
            <InfoTooltip text="A logarithmic regression model (log₁₀(price) = 5.84 × log₁₀(days) − 17.01) that divides Bitcoin's price history into color-coded bands — from 'Fire Sale' (deep blue, strongly undervalued) through 'HODL' (green) to 'Maximum Bubble' (dark red). The current band label indicates where today's price sits relative to long-term trends. Note: CoinGecko free tier limits price data to 365 days — the chart shows the last year of prices against the full rainbow model." />
          </div>
          <CardDescription>
            Current position:{' '}
            <Badge
              variant="outline"
              className="ml-1"
              style={{
                borderColor: bandColorMap.get(data.currentBand),
                color: bandColorMap.get(data.currentBand),
              }}
            >
              {data.currentBand}
            </Badge>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
            />
            <YAxis
              scale="log"
              domain={yDomain}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
                if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
                return `$${v.toFixed(0)}`
              }}
              width={55}
              allowDataOverflow
            />
            <Tooltip content={<RainbowTooltip />} />
            {/* Render band areas from highest to lowest — each paints over the previous */}
            {RAINBOW_BANDS.map((band) => {
              const key = band.label.replace(/[^a-zA-Z]/g, '')
              return (
                <Area
                  key={band.label}
                  type="monotone"
                  dataKey={`${key}_upper`}
                  stroke="none"
                  fill={band.color}
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              )
            })}
            {/* BTC Price line on top */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(35, 95%, 55%)"
              strokeWidth={2}
              fill="none"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Band legend */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {RAINBOW_BANDS.map((band) => (
            <div key={band.label} className="flex items-center gap-1.5 text-xs">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: band.color }} />
              <span className="text-muted-foreground">{band.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
