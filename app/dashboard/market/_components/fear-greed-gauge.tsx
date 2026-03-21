'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getSentimentColor } from '@/lib/market/sentiment-shared'
import type { FearGreed } from '@/lib/market/sentiment'

interface FearGreedGaugeProps {
  data: FearGreed | null
  isLoading?: boolean
  cacheAge?: string | null
}

export const FearGreedGauge = ({ data, isLoading, cacheAge }: FearGreedGaugeProps) => {
  if (isLoading) {
    return <FearGreedGaugeSkeleton />
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Fear &amp; Greed Index
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Sentiment data unavailable</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const colorClass = getSentimentColor(data.value)
  const fillColor = getGaugeFillColor(data.value)

  const chartData = [{ value: data.value, fill: fillColor }]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Crypto Fear &amp; Greed
          </CardTitle>
          <CardDescription className="text-xs">Market sentiment indicator</CardDescription>
        </div>
        <Badge variant="outline" className={colorClass}>
          {data.classification}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="relative h-[180px] w-[180px]">
            <ResponsiveContainer width={180} height={180} minWidth={0}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="90%"
                barSize={12}
                data={chartData}
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  dataKey="value"
                  cornerRadius={6}
                  background={{ fill: 'hsl(var(--muted))' }}
                  angleAxisId={0}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
              <span className={`text-4xl font-bold tabular-nums font-mono ${colorClass}`}>
                {data.value}
              </span>
              <span className="text-xs text-muted-foreground mt-1">/ 100</span>
            </div>
          </div>
          {cacheAge && <p className="text-xs text-amber-500 mt-2">Cached data ({cacheAge})</p>}
        </div>
      </CardContent>
    </Card>
  )
}

const FearGreedGaugeSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24 mt-1" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center">
        <Skeleton className="h-[180px] w-[180px] rounded-full" />
      </div>
    </CardContent>
  </Card>
)

function getGaugeFillColor(value: number): string {
  if (value <= 20) return 'hsl(350, 89%, 60%)' // rose-500
  if (value <= 40) return 'hsl(38, 92%, 50%)' // amber-500
  if (value <= 60) return 'hsl(240, 4%, 65%)' // zinc-400
  if (value <= 80) return 'hsl(160, 60%, 45%)' // emerald-400
  return 'hsl(160, 84%, 39%)' // emerald-500
}
