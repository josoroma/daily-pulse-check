'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'
import { changePassword } from '../_actions'

export const PasswordChangeCard = () => {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setSuccess(false)

    startTransition(async () => {
      const result = await changePassword(formData)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        setSuccess(true)
        toast.success('Password updated successfully')
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-500" />
          Change Password
          <InfoTooltip text="Update your account password to keep your data secure. You'll stay signed in after the change." />
        </CardTitle>
        <CardDescription>Update your account password. You will stay signed in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              name="current_password"
              type="password"
              placeholder="Enter your current password"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              name="new_password"
              type="password"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              placeholder="Re-enter your new password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Password updated successfully
            </div>
          )}

          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
