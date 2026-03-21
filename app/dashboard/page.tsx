export default function DashboardPage() {
  return (
    <div className="space-y-6 px-4 py-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Portfolio overview and market summary</p>
      </div>

      {/* Placeholder metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['Total Value', 'Day Change', 'Total Return', 'BTC Price'].map((label) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums font-mono text-muted-foreground/50">
              —
            </p>
          </div>
        ))}
      </div>

      {/* Placeholder content area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="rounded-lg border border-border bg-card p-6 lg:col-span-4">
          <p className="text-sm text-muted-foreground">
            Portfolio chart will appear here after setting up positions.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 lg:col-span-3">
          <p className="text-sm text-muted-foreground">Recent activity will appear here.</p>
        </div>
      </div>
    </div>
  )
}
