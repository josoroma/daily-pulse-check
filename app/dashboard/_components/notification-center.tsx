'use client'

import { useState, useTransition, useEffect } from 'react'
import { Bell, Check, CheckCheck, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  markNotificationRead,
  markAllNotificationsRead,
  markDcaAsDone,
} from '@/app/dashboard/dca/_actions'
import { MarkDoneDialog } from '@/app/dashboard/dca/_components/mark-done-dialog'
import { toast } from 'sonner'

type Notification = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  related_id: string | null
  created_at: string
}

function parseNotificationMeta(notification: Notification) {
  // Title: "DCA Reminder: VOO" → symbol = "VOO"
  const symbolMatch = notification.title.match(/DCA Reminder:\s*(.+)/)
  const symbol = symbolMatch?.[1]?.trim() ?? ''
  // Body: "Time to invest $500.00 in VOO" → amount = 500
  const amountMatch = notification.body.match(/\$([0-9,.]+)/)
  const amount = amountMatch?.[1] ? Number(amountMatch[1].replace(/,/g, '')) : 0
  return { symbol, amount }
}

export function NotificationCenter({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isPending, startTransition] = useTransition()
  const [now, setNow] = useState(() => Date.now())
  const [doneDialog, setDoneDialog] = useState<{
    open: boolean
    notification: Notification | null
    symbol: string
    amount: number
  }>({ open: false, notification: null, symbol: '', amount: 0 })

  // Refresh "time ago" labels every 60s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    startTransition(async () => {
      await markNotificationRead(id)
    })
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    startTransition(async () => {
      await markAllNotificationsRead()
    })
  }

  function handleMarkDcaDone(notification: Notification) {
    if (!notification.related_id) return
    const { symbol, amount } = parseNotificationMeta(notification)
    setDoneDialog({ open: true, notification, symbol, amount })
  }

  function handleDoneConfirm(price: number, quantity: number) {
    const notification = doneDialog.notification
    if (!notification?.related_id) return
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    )
    setDoneDialog({ open: false, notification: null, symbol: '', amount: 0 })
    startTransition(async () => {
      const result = await markDcaAsDone(notification.related_id!, price, quantity)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        toast.success('DCA transaction recorded')
      }
    })
  }

  function formatTimeAgo(dateStr: string): string {
    const diff = now - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span
                  role="button"
                  tabIndex={0}
                  className="inline-flex cursor-pointer items-center rounded px-2 py-1 text-xs hover:bg-muted"
                  onClick={handleMarkAllRead}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleMarkAllRead()
                  }}
                >
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Mark all read
                </span>
              )}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {notifications.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex cursor-pointer items-start gap-3 px-3 py-2"
                    onClick={() => {
                      if (!notification.read) handleMarkRead(notification.id)
                    }}
                  >
                    <div
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-emerald-500'}`}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.body}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground/60">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                        {notification.type === 'dca_reminder' &&
                          !notification.read &&
                          notification.related_id && (
                            <span
                              role="button"
                              tabIndex={0}
                              className="inline-flex cursor-pointer items-center rounded px-2 py-0.5 text-xs text-emerald-500 hover:bg-muted hover:text-emerald-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkDcaDone(notification)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation()
                                  handleMarkDcaDone(notification)
                                }
                              }}
                            >
                              <CircleCheck className="mr-1 h-3 w-3" />
                              Done
                            </span>
                          )}
                      </div>
                    </div>
                    {!notification.read && (
                      <Check className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <MarkDoneDialog
        open={doneDialog.open}
        onOpenChange={(open) => {
          if (!open) setDoneDialog({ open: false, notification: null, symbol: '', amount: 0 })
        }}
        symbol={doneDialog.symbol}
        amount={doneDialog.amount}
        onConfirm={handleDoneConfirm}
        isPending={isPending}
      />
    </>
  )
}
