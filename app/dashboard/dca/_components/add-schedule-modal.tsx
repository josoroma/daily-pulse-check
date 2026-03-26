'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ScheduleForm } from './schedule-form'

interface AddScheduleModalProps {
  portfolioId: string
}

export function AddScheduleModal({ portfolioId }: AddScheduleModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button size="sm" {...props}>
            <Plus className="mr-1 h-4 w-4" />
            New DCA Schedule
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New DCA Schedule</DialogTitle>
          <DialogDescription>
            Set up a recurring dollar-cost averaging plan for an asset.
          </DialogDescription>
        </DialogHeader>
        <ScheduleForm portfolioId={portfolioId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
