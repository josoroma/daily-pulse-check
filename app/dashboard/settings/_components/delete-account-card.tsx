'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteAccount } from '../_actions'

export const DeleteAccountCard = ({ userEmail }: { userEmail: string }) => {
  const [confirmEmail, setConfirmEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    const formData = new FormData()
    formData.set('confirmation_email', confirmEmail)

    startTransition(async () => {
      const result = await deleteAccount(formData)
      if (result && 'error' in result) {
        toast.error(result.error)
      }
      // If successful, the server action redirects to /
    })
  }

  const isEmailMatch = confirmEmail === userEmail

  return (
    <Card className="border-rose-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rose-500">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
          <InfoTooltip text="Permanently deletes your account, portfolio, transactions, alerts, and all associated data. This cannot be undone. You must type your email to confirm." />
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete My Account
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all data: profile, portfolios,
                positions, transactions, DCA schedules, alerts, and AI summaries. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 py-2">
              <Label htmlFor="confirm-email">
                Type <span className="font-mono text-foreground">{userEmail}</span> to confirm
              </Label>
              <Input
                id="confirm-email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="off"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmEmail('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={!isEmailMatch || isPending}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
