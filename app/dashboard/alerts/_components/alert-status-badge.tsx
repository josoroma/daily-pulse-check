import { Badge } from '@/components/ui/badge'
import type { AlertStatus } from '../_schema'

const STATUS_CONFIG: Record<AlertStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  triggered: {
    label: 'Triggered',
    className: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
  paused: {
    label: 'Paused',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
}

export function AlertStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as AlertStatus] ?? STATUS_CONFIG.paused
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
