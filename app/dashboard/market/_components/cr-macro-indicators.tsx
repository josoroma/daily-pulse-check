'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTooltip } from '@/components/info-tooltip'
import { formatMonthYear } from '@/lib/date'
import type { BccrIndicator } from '@/lib/market/bccr'

interface CrMacroIndicatorsProps {
  indicators: BccrIndicator[]
  isLoading?: boolean
}

export const CrMacroIndicators = ({ indicators, isLoading }: CrMacroIndicatorsProps) => {
  if (isLoading) {
    return <CrMacroSkeleton />
  }

  if (!indicators.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Costa Rican Macro Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              BCCR data unavailable — check BCCR_SDDE_TOKEN env var
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Costa Rican Macro Indicators
          </CardTitle>
          <InfoTooltip text="Economic data from Costa Rica's Central Bank (BCCR). USD/CRC shows the official exchange rate; TPM is the monetary policy rate set by the central bank; TBP is the benchmark passive interest rate for savings and deposits." />
        </div>
        <CardDescription className="text-xs">Data from Banco Central de Costa Rica</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {indicators.map((indicator) => (
            <CrIndicatorItem key={indicator.name} indicator={indicator} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const CrIndicatorItem = ({ indicator }: { indicator: BccrIndicator }) => {
  const formattedValue =
    indicator.unit === '%'
      ? `${indicator.value.toFixed(2)}%`
      : indicator.unit === '₡'
        ? `₡${indicator.value.toFixed(2)}`
        : indicator.value.toLocaleString()

  const formattedDate = indicator.date ? formatMonthYear(indicator.date) : ''

  const isExchangeRate = indicator.unit === '₡'

  return (
    <div
      className={`space-y-1 rounded-lg border p-3 ${isExchangeRate ? 'border-sky-500/30 bg-sky-500/5' : 'border-border'}`}
    >
      <p className="text-xs text-muted-foreground truncate">{indicator.name}</p>
      <p className="text-lg font-bold tabular-nums font-mono">{formattedValue}</p>
      <p className="text-xs text-muted-foreground">{formattedDate}</p>
    </div>
  )
}

const CrMacroSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-3 w-56" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)
