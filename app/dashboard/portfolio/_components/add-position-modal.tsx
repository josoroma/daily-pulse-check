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
import { PositionForm } from './position-form'

interface AddPositionModalProps {
  portfolioId: string
}

export function AddPositionModal({ portfolioId }: AddPositionModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button {...props}>
            <Plus className="mr-2 h-4 w-4" />
            Add Position
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Position</DialogTitle>
          <DialogDescription>Add a new investment position to your portfolio.</DialogDescription>
        </DialogHeader>
        <PositionForm portfolioId={portfolioId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
