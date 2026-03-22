'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreatePositionSchema, type CreatePosition } from '@/app/portfolio/_schema'
import { createPosition, updatePosition } from '../_actions'
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
import { Loader2 } from 'lucide-react'

interface PositionFormProps {
  portfolioId: string
  defaultValues?: {
    id?: string
    asset_type?: 'ETF' | 'Crypto'
    symbol?: string
    quantity?: number
    average_buy_price?: number
    notes?: string
  }
  onSuccess?: () => void
}

export function PositionForm({ portfolioId, defaultValues, onSuccess }: PositionFormProps) {
  const isEditing = Boolean(defaultValues?.id)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePosition>({
    resolver: zodResolver(CreatePositionSchema),
    defaultValues: {
      portfolio_id: portfolioId,
      asset_type: defaultValues?.asset_type ?? 'ETF',
      symbol: defaultValues?.symbol ?? '',
      quantity: defaultValues?.quantity ?? ('' as unknown as number),
      average_buy_price: defaultValues?.average_buy_price ?? ('' as unknown as number),
      notes: defaultValues?.notes ?? '',
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const assetType = watch('asset_type')

  const onSubmit = async (data: CreatePosition) => {
    setServerError(null)
    const formData = new FormData()
    if (isEditing && defaultValues?.id) {
      formData.set('id', defaultValues.id)
    }
    formData.set('portfolio_id', data.portfolio_id)
    formData.set('asset_type', data.asset_type)
    formData.set('symbol', data.symbol)
    formData.set('quantity', String(data.quantity))
    formData.set('average_buy_price', String(data.average_buy_price))
    if (data.notes) formData.set('notes', data.notes)

    const result = isEditing ? await updatePosition(formData) : await createPosition(formData)

    if (result?.error) {
      setServerError(result.error)
    } else {
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-md bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {serverError}
        </div>
      )}

      <input type="hidden" {...register('portfolio_id')} />

      <div className="space-y-2">
        <Label htmlFor="asset_type">Asset Type</Label>
        <Select
          value={assetType}
          onValueChange={(val) => {
            if (val) setValue('asset_type', val as 'ETF' | 'Crypto')
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger id="asset_type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ETF">ETF</SelectItem>
            <SelectItem value="Crypto">Crypto</SelectItem>
          </SelectContent>
        </Select>
        {errors.asset_type && <p className="text-sm text-rose-500">{errors.asset_type.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="symbol">Symbol</Label>
        <Input
          id="symbol"
          placeholder={assetType === 'ETF' ? 'VOO' : 'BTC'}
          {...register('symbol')}
          disabled={isSubmitting}
        />
        {errors.symbol && <p className="text-sm text-rose-500">{errors.symbol.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="any"
            placeholder={assetType === 'ETF' ? '10' : '0.05'}
            {...register('quantity', { valueAsNumber: true })}
            disabled={isSubmitting}
          />
          {errors.quantity && <p className="text-sm text-rose-500">{errors.quantity.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="average_buy_price">Buy Price (USD)</Label>
          <Input
            id="average_buy_price"
            type="number"
            step="any"
            placeholder={assetType === 'ETF' ? '450.00' : '85000'}
            {...register('average_buy_price', { valueAsNumber: true })}
            disabled={isSubmitting}
          />
          {errors.average_buy_price && (
            <p className="text-sm text-rose-500">{errors.average_buy_price.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input
          id="notes"
          placeholder="Initial position"
          {...register('notes')}
          disabled={isSubmitting}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Update Position' : 'Add Position'}
      </Button>
    </form>
  )
}
