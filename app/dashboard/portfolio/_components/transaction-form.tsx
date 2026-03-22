'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateTransactionSchema, type CreateTransaction } from '@/app/portfolio/_schema'
import { createTransaction } from '../_actions'
import { toISO } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowRightLeft, Loader2 } from 'lucide-react'

interface TransactionFormProps {
  positions: Array<{ id: string; symbol: string; asset_type: string; quantity: number }>
}

export function TransactionForm({ positions }: TransactionFormProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(CreateTransactionSchema),
    defaultValues: {
      position_id: '',
      type: 'Buy' as const,
      quantity: '' as unknown as number,
      price: '' as unknown as number,
      fee: 0,
      executed_at: new Date(),
      notes: '',
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const txType = watch('type')
  const positionId = watch('position_id')
  const selectedPosition = positions.find((p) => p.id === positionId)

  const onSubmit = handleSubmit(async (data) => {
    const validated = data as CreateTransaction
    setServerError(null)
    setSuccessMessage(null)

    const formData = new FormData()
    formData.set('position_id', validated.position_id)
    formData.set('type', validated.type)
    formData.set('quantity', String(validated.quantity))
    formData.set('price', String(validated.price))
    formData.set('fee', String(validated.fee))
    formData.set('executed_at', toISO(validated.executed_at))
    if (validated.notes) formData.set('notes', validated.notes)

    const result = await createTransaction(formData)

    if (result?.error) {
      setServerError(result.error)
    } else {
      const msg =
        result?.realizedPnl !== undefined
          ? `Transaction logged. Realized P&L: $${result.realizedPnl.toFixed(2)}`
          : 'Transaction logged successfully.'
      setSuccessMessage(msg)
      reset()
      setTimeout(() => {
        setOpen(false)
        setSuccessMessage(null)
      }, 1500)
    }
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button variant="outline" {...props}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Log Transaction
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
          <DialogDescription>
            Record a buy or sell transaction for an existing position.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
              {serverError}
            </div>
          )}
          {successMessage && (
            <div className="rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              {successMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="position_id">Position</Label>
            <Select
              value={positionId}
              onValueChange={(val) => {
                if (val) setValue('position_id', val)
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger id="position_id">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.symbol} ({p.asset_type}) — {p.quantity} units
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.position_id && (
              <p className="text-sm text-rose-500">{errors.position_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={txType}
              onValueChange={(val) => {
                if (val) setValue('type', val as 'Buy' | 'Sell' | 'DCA')
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
                <SelectItem value="DCA">DCA</SelectItem>
              </SelectContent>
            </Select>
            {txType === 'Sell' && selectedPosition && (
              <p className="text-xs text-muted-foreground">
                Available: {selectedPosition.quantity} units
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                placeholder="5"
                {...register('quantity', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.quantity && (
                <p className="text-sm text-rose-500">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                step="any"
                placeholder="452.00"
                {...register('price', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.price && <p className="text-sm text-rose-500">{errors.price.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fee">Fee (USD)</Label>
              <Input
                id="fee"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('fee', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="executed_at">Date</Label>
              <Input
                id="executed_at"
                type="date"
                {...register('executed_at', { valueAsDate: true })}
                disabled={isSubmitting}
              />
              {errors.executed_at && (
                <p className="text-sm text-rose-500">{errors.executed_at.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Weekly DCA buy"
              {...register('notes')}
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Transaction
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
