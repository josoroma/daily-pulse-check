import { Calendar } from 'lucide-react'
import { AddScheduleModal } from './add-schedule-modal'

interface EmptyStateProps {
  portfolioId: string
}

export function EmptyState({ portfolioId }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No DCA Schedules</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Dollar-cost averaging helps you invest consistently. Create your first schedule to start
        building wealth automatically.
      </p>
      <AddScheduleModal portfolioId={portfolioId} />
    </div>
  )
}
