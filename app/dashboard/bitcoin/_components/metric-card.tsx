import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  subValue?: string
  icon: LucideIcon
  iconColor?: string
  delta?: {
    value: string
    positive: boolean
    label: string
  }
  chart?: ReactNode
  infoSlot?: ReactNode
}

export function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor,
  delta,
  chart,
  infoSlot,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          {infoSlot}
        </div>
        <Icon className={`h-4 w-4 ${iconColor ?? 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums font-mono">{value}</div>
        {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        {delta && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className={delta.positive ? 'text-emerald-500' : 'text-rose-500'}>
              {delta.positive ? '+' : ''}
              {delta.value}
            </span>{' '}
            {delta.label}
          </p>
        )}
        {chart && <div className="mt-2">{chart}</div>}
      </CardContent>
    </Card>
  )
}
