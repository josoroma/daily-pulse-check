import { Briefcase } from 'lucide-react'
import { AddPositionModal } from './add-position-modal'

interface EmptyStateProps {
  portfolioId: string
}

export function EmptyState({ portfolioId }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Briefcase className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No positions yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Add your first position to get started tracking your VOO, QQQ, and Bitcoin investments.
      </p>
      <AddPositionModal portfolioId={portfolioId} />
    </div>
  )
}
