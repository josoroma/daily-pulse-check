'use client'

import { useTransition } from 'react'
import { Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertStatusBadge } from './alert-status-badge'
import { toggleAlertStatus, deleteAlert } from '../_actions'
import { CONDITION_LABELS } from '../_schema'
import type { AlertRow } from '../_schema'
import { toast } from 'sonner'

const SYMBOL_COLORS: Record<string, string> = {
  VOO: 'text-blue-400',
  QQQ: 'text-purple-400',
  BTC: 'text-orange-400',
}

function formatThreshold(condition: string, threshold: number, symbol: string): string {
  if (condition.startsWith('rsi_')) return threshold.toFixed(0)
  if (condition.startsWith('mvrv_')) return threshold.toFixed(1)
  if (symbol === 'BTC') {
    return `$${threshold.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  return `$${threshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AlertsTable({ alerts }: { alerts: AlertRow[] }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    startTransition(async () => {
      const result = await toggleAlertStatus(id, newStatus as 'active' | 'paused')
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`Alert ${newStatus === 'active' ? 'resumed' : 'paused'}`)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAlert(id)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Alert deleted')
      }
    })
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-1">No alerts yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Create price or indicator alerts to get notified when your assets hit target levels.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Symbol</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead className="text-right tabular-nums">Target</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.id}>
            <TableCell className={`font-medium ${SYMBOL_COLORS[alert.symbol] ?? ''}`}>
              {alert.symbol}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {CONDITION_LABELS[alert.condition] ?? alert.condition}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatThreshold(alert.condition, alert.threshold, alert.symbol)}
            </TableCell>
            <TableCell>
              <AlertStatusBadge status={alert.status} />
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(alert.created_at)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {alert.status !== 'triggered' && (
                  <Tooltip>
                    <TooltipContent>
                      {alert.status === 'active' ? 'Pause' : 'Resume'}
                    </TooltipContent>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isPending}
                          onClick={() => handleToggle(alert.id, alert.status)}
                        />
                      }
                    >
                      {alert.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </TooltipTrigger>
                  </Tooltip>
                )}
                <AlertDialog>
                  <Tooltip>
                    <TooltipContent>Delete</TooltipContent>
                    <TooltipTrigger
                      render={
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-400 hover:text-rose-300"
                              disabled={isPending}
                            />
                          }
                        />
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </TooltipTrigger>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete alert?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the {alert.symbol}{' '}
                        {CONDITION_LABELS[alert.condition]?.toLowerCase()} alert.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(alert.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function AlertsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Symbol</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead className="text-right">Target</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-10" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-8 w-16 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
