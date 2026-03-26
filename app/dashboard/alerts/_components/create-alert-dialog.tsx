'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createAlert } from '../_actions'
import {
  CreateAlertSchema,
  type CreateAlert,
  ALERT_SYMBOLS,
  PRICE_CONDITIONS,
  INDICATOR_CONDITIONS,
  CONDITION_LABELS,
} from '../_schema'
import { toast } from 'sonner'

export function CreateAlertDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm({
    resolver: zodResolver(CreateAlertSchema),
    defaultValues: {
      symbol: 'VOO' as const,
      condition: 'above' as const,
      threshold: 0,
      notification_channels: ['in_app' as const],
      parameters: {},
    },
  })

  const watchCondition = form.watch('condition')
  const watchSymbol = form.watch('symbol')

  const isRsiCondition = watchCondition?.startsWith('rsi_')
  const isMaCondition = watchCondition?.startsWith('ma_cross_')
  const isMvrvCondition = watchCondition?.startsWith('mvrv_')

  // MVRV is BTC only
  const availableConditions = [
    ...PRICE_CONDITIONS,
    ...INDICATOR_CONDITIONS.filter((c) => {
      if (c.startsWith('mvrv_')) return watchSymbol === 'BTC'
      return true
    }),
  ]

  function onSubmit(data: CreateAlert) {
    const formData = new FormData()
    formData.set('symbol', data.symbol)
    formData.set('condition', data.condition)
    formData.set('threshold', String(data.threshold))
    data.notification_channels.forEach((ch) => formData.append('notification_channels', ch))
    if (data.parameters.rsi_period) {
      formData.set('rsi_period', String(data.parameters.rsi_period))
    }
    if (data.parameters.ma_period) {
      formData.set('ma_period', String(data.parameters.ma_period))
    }
    if (data.parameters.ma_type) {
      formData.set('ma_type', data.parameters.ma_type)
    }

    startTransition(async () => {
      const result = await createAlert(formData)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Alert created')
        form.reset()
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />
        Create Alert
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
          <DialogDescription>
            Set a price or indicator alert for your tracked assets.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Asset</Label>
            <Select
              value={form.watch('symbol')}
              onValueChange={(v) => {
                form.setValue('symbol', v as CreateAlert['symbol'])
                // Reset MVRV condition if switching away from BTC
                if (v !== 'BTC' && form.watch('condition')?.startsWith('mvrv_')) {
                  form.setValue('condition', 'above')
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {ALERT_SYMBOLS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.symbol && (
              <p className="text-xs text-rose-500">{form.formState.errors.symbol.message}</p>
            )}
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={form.watch('condition')}
              onValueChange={(v) => form.setValue('condition', v as CreateAlert['condition'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {availableConditions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CONDITION_LABELS[c] ?? c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.condition && (
              <p className="text-xs text-rose-500">{form.formState.errors.condition.message}</p>
            )}
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">
              {isRsiCondition
                ? 'RSI Threshold (0–100)'
                : isMvrvCondition
                  ? 'MVRV Z-Score Threshold'
                  : 'Target Price ($)'}
            </Label>
            <Input
              id="threshold"
              type="number"
              step={isRsiCondition ? '1' : isMvrvCondition ? '0.1' : '0.01'}
              min={0}
              max={isRsiCondition ? 100 : undefined}
              placeholder={isRsiCondition ? '30' : isMvrvCondition ? '6.0' : '470.00'}
              className="font-mono tabular-nums"
              {...form.register('threshold', { valueAsNumber: true })}
            />
            {form.formState.errors.threshold && (
              <p className="text-xs text-rose-500">{form.formState.errors.threshold.message}</p>
            )}
          </div>

          {/* RSI Period (if RSI condition) */}
          {isRsiCondition && (
            <div className="space-y-2">
              <Label htmlFor="rsi_period">RSI Period</Label>
              <Input
                id="rsi_period"
                type="number"
                min={2}
                max={100}
                defaultValue={14}
                className="font-mono tabular-nums"
                {...form.register('parameters.rsi_period', { valueAsNumber: true })}
              />
            </div>
          )}

          {/* MA Period & Type (if MA condition) */}
          {isMaCondition && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ma_period">MA Period</Label>
                <Input
                  id="ma_period"
                  type="number"
                  min={5}
                  max={500}
                  defaultValue={200}
                  className="font-mono tabular-nums"
                  {...form.register('parameters.ma_period', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ma_type">MA Type</Label>
                <Select
                  value={form.watch('parameters.ma_type') ?? 'SMA'}
                  onValueChange={(v) => form.setValue('parameters.ma_type', v as 'SMA' | 'EMA')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMA">SMA</SelectItem>
                    <SelectItem value="EMA">EMA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Alert'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
