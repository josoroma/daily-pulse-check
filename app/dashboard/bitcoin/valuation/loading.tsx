import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ValuationLoading() {
  return (
    <div className="space-y-6 px-4 py-8">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>

      {/* MVRV Chart skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <Skeleton className="h-12 w-20 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto mt-2" />
          </div>
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="rounded-lg border border-border p-3 space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* S2F Chart skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-md" />
        </CardContent>
      </Card>

      {/* Rainbow Chart skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full rounded-md" />
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
