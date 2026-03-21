'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/app/profile/_actions'
import { BASE_CURRENCIES, RISK_TOLERANCES } from '@/app/profile/_schema'
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

type ProfileFormProps = {
  defaultValues?: {
    display_name: string | null
    base_currency: string
    country: string
    risk_tolerance: string
  }
  onSuccess?: () => void
}

export const ProfileForm = ({ defaultValues, onSuccess }: ProfileFormProps) => {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateProfile(formData)
      if (result?.success) {
        onSuccess?.()
      }
      return result ?? null
    },
    null,
  )

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          Profile updated successfully
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name</Label>
        <Input
          id="display_name"
          name="display_name"
          placeholder="Your name"
          defaultValue={defaultValues?.display_name ?? ''}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="base_currency">Base Currency</Label>
        <Select
          name="base_currency"
          defaultValue={defaultValues?.base_currency ?? 'USD'}
          disabled={isPending}
        >
          <SelectTrigger id="base_currency">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {BASE_CURRENCIES.map((currency) => (
              <SelectItem key={currency} value={currency}>
                {currency === 'USD' ? 'USD — US Dollar' : 'CRC — Costa Rica Colón'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          name="country"
          placeholder="Costa Rica"
          defaultValue={defaultValues?.country ?? 'CR'}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="risk_tolerance">Risk Tolerance</Label>
        <Select
          name="risk_tolerance"
          defaultValue={defaultValues?.risk_tolerance ?? 'Medium'}
          disabled={isPending}
        >
          <SelectTrigger id="risk_tolerance">
            <SelectValue placeholder="Select risk tolerance" />
          </SelectTrigger>
          <SelectContent>
            {RISK_TOLERANCES.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {defaultValues ? 'Update Profile' : 'Save Profile'}
      </Button>
    </form>
  )
}
