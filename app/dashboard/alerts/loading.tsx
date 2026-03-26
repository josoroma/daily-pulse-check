import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertsTableSkeleton } from './_components/alerts-table'

export default function AlertsLoading() {
  return (
    <div className="space-y-6 px-4 py-8">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-2 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-8" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <AlertsTableSkeleton />
        </CardContent>
      </Card>
    </div>
  )
}
