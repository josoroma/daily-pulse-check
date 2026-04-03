'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Bell, Mail, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'
import { updateNotificationPreferences } from '../_actions'

type NotificationPrefs = {
  notification_email_enabled: boolean
  notification_telegram_enabled: boolean
  telegram_chat_id: string | null
}

export const NotificationPreferencesCard = ({
  defaultValues,
}: {
  defaultValues: NotificationPrefs
}) => {
  const [emailEnabled, setEmailEnabled] = useState(defaultValues.notification_email_enabled)
  const [telegramEnabled, setTelegramEnabled] = useState(
    defaultValues.notification_telegram_enabled,
  )
  const [telegramChatId, setTelegramChatId] = useState(defaultValues.telegram_chat_id ?? '')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()
    formData.set('notification_email_enabled', String(emailEnabled))
    formData.set('notification_telegram_enabled', String(telegramEnabled))
    formData.set('telegram_chat_id', telegramChatId)

    startTransition(async () => {
      const result = await updateNotificationPreferences(formData)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Notification preferences updated')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Channels
          <InfoTooltip text="Control how you receive alert notifications. In-app notifications are always enabled. Add email or Telegram for real-time alerts when price targets are hit." />
        </CardTitle>
        <CardDescription>
          Choose how you receive alert notifications. In-app notifications are always enabled.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* In-app (always on) */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">In-App Notifications</p>
                <p className="text-xs text-muted-foreground">Bell icon in the dashboard header</p>
              </div>
            </div>
            <span className="text-xs text-emerald-500 font-medium">Always on</span>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-sky-500" />
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Sent to your registered email address
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailEnabled ? 'true' : 'false'}
              aria-label="Toggle email notifications"
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${emailEnabled ? 'bg-emerald-500' : 'bg-muted'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Telegram */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Send className="h-4 w-4 text-sky-400" />
                <div>
                  <p className="text-sm font-medium">Telegram Notifications</p>
                  <p className="text-xs text-muted-foreground">Connect your Telegram account</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={telegramEnabled ? 'true' : 'false'}
                aria-label="Toggle Telegram notifications"
                onClick={() => setTelegramEnabled(!telegramEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${telegramEnabled ? 'bg-emerald-500' : 'bg-muted'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${telegramEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {telegramEnabled && (
              <div className="ml-7 space-y-2">
                <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
                <Input
                  id="telegram_chat_id"
                  placeholder="e.g. 123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="max-w-xs font-mono tabular-nums"
                />
                <p className="text-xs text-muted-foreground">
                  Message <code>@userinfobot</code> on Telegram to get your Chat ID.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
