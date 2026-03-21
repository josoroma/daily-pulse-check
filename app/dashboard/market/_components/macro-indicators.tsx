'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { MacroIndicator } from '@/lib/market/macro'

interface MacroIndicatorsProps {
  indicators: MacroIndicator[]
  inflationRate: number | null
  isLoading?: boolean
}

export const MacroIndicators = ({ indicators, inflationRate, isLoading }: MacroIndicatorsProps) => {
  if (isLoading) {
    return <MacroIndicatorsSkeleton />
  }

  if (!indicators.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Macro Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Macro data unavailable</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Macro Indicators
        </CardTitle>
        <CardDescription className="text-xs">Key economic data points</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {indicators.map((indicator) => (
            <IndicatorItem key={indicator.name} indicator={indicator} />
          ))}
          {inflationRate !== null && (
            <IndicatorItem
              indicator={{
                name: 'YoY Inflation',
                value: inflationRate,
                date: indicators.find((i) => i.name === 'Consumer Price Index')?.date ?? '',
                unit: '%',
              }}
              highlight
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const IndicatorItem = ({
  indicator,
  highlight = false,
}: {
  indicator: MacroIndicator
  highlight?: boolean
}) => {
  const formattedValue =
    indicator.unit === '%'
      ? `${indicator.value.toFixed(2)}%`
      : indicator.unit === 'index'
        ? indicator.value.toFixed(2)
        : indicator.value.toLocaleString()

  const formattedDate = indicator.date
    ? new Date(indicator.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''

  return (
    <div
      className={`space-y-1 rounded-lg border p-3 ${highlight ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground truncate">{indicator.name}</p>
        <TrendIcon value={indicator.value} unit={indicator.unit} />
      </div>
      <p className="text-lg font-bold tabular-nums font-mono">{formattedValue}</p>
      <p className="text-xs text-muted-foreground">{formattedDate}</p>
    </div>
  )
}

const TrendIcon = ({ value, unit }: { value: number; unit: string }) => {
  if (unit !== '%') return <Minus className="h-3 w-3 text-muted-foreground" />
  if (value > 3) return <TrendingUp className="h-3 w-3 text-amber-500" />
  if (value < 1) return <TrendingDown className="h-3 w-3 text-emerald-500" />
  return <Minus className="h-3 w-3 text-muted-foreground" />
}

const MacroIndicatorsSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-36 mt-1" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1 rounded-lg border border-border p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)
