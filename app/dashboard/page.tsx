import { getDashboardData } from './_actions'
import { DashboardMetricsCards } from './_components/dashboard-metrics'
import { DashboardPerformance } from './_components/dashboard-performance'
import { DashboardAllocationChart } from './_components/dashboard-allocation'
import { DashboardSummary } from './_components/dashboard-summary'
import { DashboardActivity } from './_components/dashboard-activity'
import { ErrorToasts } from './_components/error-toasts'

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6 px-4 py-8">
      {data.errors.length > 0 && <ErrorToasts errors={data.errors} />}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Portfolio overview and market summary</p>
      </div>

      {/* Metric cards */}
      <DashboardMetricsCards metrics={data.metrics} />

      {/* Performance chart + AI summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <DashboardPerformance data={data.snapshots} />
        <DashboardSummary summary={data.aiSummary} />
      </div>

      {/* Allocation + Recent activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <DashboardAllocationChart data={data.allocations} />
        <DashboardActivity items={data.recentActivity} />
      </div>
    </div>
  )
}
