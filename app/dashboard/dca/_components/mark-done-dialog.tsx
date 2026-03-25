'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type MarkDoneDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  symbol: string
  amount: number
  onConfirm: (price: number, quantity: number) => void
  isPending: boolean
}

export function MarkDoneDialog({
  open,
  onOpenChange,
  symbol,
  amount,
  onConfirm,
  isPending,
}: MarkDoneDialogProps) {
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')

  const priceNum = Number(price)
  const quantityNum = Number(quantity)
  const isValid = priceNum > 0 && quantityNum > 0
  const totalCost = isValid ? priceNum * quantityNum : 0

  function handleConfirm() {
    if (!isValid) return
    onConfirm(priceNum, quantityNum)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPrice('')
      setQuantity('')
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record DCA Purchase</DialogTitle>
          <DialogDescription>
            Enter the execution details for your <span className="font-semibold">{symbol}</span> DCA
            (scheduled amount: <span className="font-mono">${amount.toLocaleString()}</span>).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="dca-price">Price per unit ($)</Label>
            <Input
              id="dca-price"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 485.50"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dca-quantity">Quantity purchased</Label>
            <Input
              id="dca-quantity"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 1.03"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="font-mono"
            />
          </div>
          {isValid && (
            <p className="text-sm text-muted-foreground">
              Total cost:{' '}
              <span className="font-mono font-medium text-foreground">
                $
                {totalCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isPending}>
            {isPending ? 'Recording…' : 'Confirm Purchase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
