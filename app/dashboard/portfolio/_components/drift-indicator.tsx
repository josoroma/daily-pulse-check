'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/info-tooltip'
import { ASSET_COLORS } from '../_constants'
import { formatUsd, type DriftItem, type RebalanceSuggestion } from '../_utils'

interface DriftIndicatorProps {
  driftItems: DriftItem[]
  rebalanceNeeded: boolean
  suggestions: RebalanceSuggestion[]
}

export function DriftIndicator({ driftItems, rebalanceNeeded, suggestions }: DriftIndicatorProps) {
  const chartData = driftItems.map((d) => ({
    symbol: d.symbol,
    target: d.targetPct,
    actual: d.actualPct,
    drift: d.driftPct,
  }))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-1">
            <CardTitle className="text-base">Allocation Drift</CardTitle>
            <InfoTooltip text="Compares your actual asset allocation against your target percentages. Bars show the gap between where you are and where you want to be. 'Rebalance Needed' appears when drift exceeds your threshold." />
          </div>
          {rebalanceNeeded ? (
            <Badge variant="outline" className="text-rose-500 bg-rose-500/10 border-transparent">
              Rebalance Needed
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-emerald-500 bg-emerald-500/10 border-transparent"
            >
              On Track
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="symbol"
                width={48}
                className="text-xs fill-muted-foreground"
              />
              <Tooltip
                wrapperClassName="!rounded-lg !border !bg-popover !text-popover-foreground !shadow-lg"
                formatter={(value, name) => [
                  `${Number(value).toFixed(1)}%`,
                  name === 'target' ? 'Target' : 'Actual',
                ]}
              />
              <Bar
                dataKey="target"
                fill="var(--muted-foreground)"
                opacity={0.3}
                barSize={14}
                radius={[0, 4, 4, 0]}
              />
              <Bar dataKey="actual" barSize={14} radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.symbol}
                    fill={ASSET_COLORS[entry.symbol] ?? 'hsl(220, 10%, 50%)'}
                  />
                ))}
              </Bar>
              <ReferenceLine x={0} className="stroke-border" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-base">Rebalance Suggestions</CardTitle>
              <InfoTooltip text="Actionable buy/sell suggestions to bring your portfolio back to target allocation. Amounts are calculated based on current prices and your target percentages." />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <li key={s.symbol} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`border-transparent ${s.action === 'Buy' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}
                    >
                      {s.action}
                    </Badge>
                    <span className="font-medium">{s.symbol}</span>
                  </div>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatUsd(s.amountUsd)} ({s.units.toFixed(4)} units)
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
