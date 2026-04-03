'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { ArrowDownLeft, ArrowUpRight, Bell, RefreshCw, Activity } from 'lucide-react'
import { InfoTooltip } from '@/components/info-tooltip'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ActivityItem } from '@/app/dashboard/_utils'

interface DashboardActivityProps {
  items: ActivityItem[]
}

function getIcon(item: ActivityItem) {
  if (item.kind === 'notification') {
    return <Bell className="h-4 w-4 text-sky-500" />
  }
  const type = item.title.split(' ')[0]
  if (type === 'Buy') return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
  if (type === 'Sell') return <ArrowUpRight className="h-4 w-4 text-rose-500" />
  if (type === 'DCA') return <RefreshCw className="h-4 w-4 text-sky-500" />
  return <Activity className="h-4 w-4 text-muted-foreground" />
}

function timeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export const DashboardActivity = ({ items }: DashboardActivityProps) => {
  return (
    <Card className="lg:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-1">
          <CardTitle>Recent Activity</CardTitle>
          <InfoTooltip text="Your latest transactions (buys, sells, DCA executions) and triggered alert notifications, sorted by most recent. Helps you keep track of portfolio actions at a glance." />
        </div>
        <Link
          href="/dashboard/portfolio"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {getIcon(item)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono tabular-nums">
                    {item.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {timeAgo(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No recent activity</p>
            <p className="text-xs text-muted-foreground mb-3">
              Transactions and alerts will appear here.
            </p>
            <div className="flex gap-2">
              <Link
                href="/dashboard/portfolio"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Add Position
              </Link>
              <Link
                href="/dashboard/alerts"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Set Alert
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
