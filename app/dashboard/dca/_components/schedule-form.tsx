'use client'

import { useState, useTransition } from 'react'
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
import { createDcaSchedule, updateDcaSchedule } from '../_actions'
import { DAY_OF_WEEK_LABELS } from '../_schema'
import { toast } from 'sonner'

const SYMBOLS = [
  { value: 'VOO', label: 'VOO', type: 'ETF' },
  { value: 'QQQ', label: 'QQQ', type: 'ETF' },
  { value: 'BTC', label: 'BTC', type: 'Crypto' },
] as const

interface ScheduleFormProps {
  portfolioId: string
  defaultValues?: {
    id: string
    symbol: string
    asset_type: string
    amount: number
    frequency: string
    day_of_week: number | null
    day_of_month: number | null
  }
  onSuccess?: () => void
}

export function ScheduleForm({ portfolioId, defaultValues, onSuccess }: ScheduleFormProps) {
  const [isPending, startTransition] = useTransition()
  const [frequency, setFrequency] = useState(defaultValues?.frequency ?? '')
  const [symbol, setSymbol] = useState(defaultValues?.symbol ?? '')

  const isEditing = !!defaultValues?.id

  const selectedAsset = SYMBOLS.find((s) => s.value === symbol)

  const handleSubmit = (formData: FormData) => {
    formData.set('portfolio_id', portfolioId)

    if (selectedAsset) {
      formData.set('asset_type', selectedAsset.type)
    }

    // Clear irrelevant day fields based on frequency
    const freq = formData.get('frequency') as string
    if (freq === 'Daily') {
      formData.delete('day_of_week')
      formData.delete('day_of_month')
    } else if (freq === 'Weekly' || freq === 'Biweekly') {
      formData.delete('day_of_month')
    } else if (freq === 'Monthly') {
      formData.delete('day_of_week')
    }

    startTransition(async () => {
      const action = isEditing ? updateDcaSchedule : createDcaSchedule
      const result = await action(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(isEditing ? 'Schedule updated' : 'Schedule created')
        onSuccess?.()
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {isEditing && <input type="hidden" name="id" value={defaultValues.id} />}

      {/* Symbol */}
      <div className="space-y-2">
        <Label htmlFor="symbol">Asset</Label>
        <Select
          name="symbol"
          value={symbol}
          onValueChange={(v) => setSymbol(v ?? '')}
          disabled={isEditing}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
          <SelectContent>
            {SYMBOLS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label} ({s.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedAsset && <input type="hidden" name="asset_type" value={selectedAsset.type} />}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (USD)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            $
          </span>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="1"
            placeholder="100.00"
            defaultValue={defaultValues?.amount}
            className="pl-7 font-mono tabular-nums"
            required
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label htmlFor="frequency">Frequency</Label>
        <Select name="frequency" value={frequency} onValueChange={(v) => setFrequency(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Daily">Daily</SelectItem>
            <SelectItem value="Weekly">Weekly</SelectItem>
            <SelectItem value="Biweekly">Every 2 weeks</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Day of Week (Weekly / Biweekly) */}
      {(frequency === 'Weekly' || frequency === 'Biweekly') && (
        <div className="space-y-2">
          <Label htmlFor="day_of_week">Day of Week</Label>
          <Select name="day_of_week" defaultValue={defaultValues?.day_of_week?.toString()}>
            <SelectTrigger>
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAY_OF_WEEK_LABELS.map((day, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Day of Month (Monthly) */}
      {frequency === 'Monthly' && (
        <div className="space-y-2">
          <Label htmlFor="day_of_month">Day of Month</Label>
          <Select name="day_of_month" defaultValue={defaultValues?.day_of_month?.toString()}>
            <SelectTrigger>
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? isEditing
            ? 'Updating...'
            : 'Creating...'
          : isEditing
            ? 'Update Schedule'
            : 'Create Schedule'}
      </Button>
    </form>
  )
}
