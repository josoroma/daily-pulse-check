import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getAlerts } from './_actions'
import { AlertsTable } from './_components/alerts-table'
import { CreateAlertDialog } from './_components/create-alert-dialog'
import type { AlertRow } from './_schema'

export default async function AlertsPage() {
  const alerts = (await getAlerts()) as AlertRow[]

  const activeCount = alerts.filter((a) => a.status === 'active').length
  const triggeredCount = alerts.filter((a) => a.status === 'triggered').length
  const pausedCount = alerts.filter((a) => a.status === 'paused').length

  return (
    <div className="space-y-6 px-4 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Price and indicator alerts for your tracked assets
          </p>
        </div>
        <CreateAlertDialog />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Alerts
            </CardTitle>
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Triggered</CardTitle>
            <div className="h-2 w-2 rounded-full bg-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{triggeredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paused</CardTitle>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{pausedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts table */}
      <Card>
        <CardHeader>
          <CardTitle>All Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <AlertsTable alerts={alerts} />
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  )
}
