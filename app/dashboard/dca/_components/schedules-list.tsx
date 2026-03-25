'use client'

import { useState, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, Pause, Play } from 'lucide-react'
import { toggleDcaSchedule, deleteDcaSchedule } from '../_actions'
import { ScheduleForm } from './schedule-form'
import { formatUsd, formatFrequencyLabel } from '../_utils'
import { ASSET_COLOR_CLASSES, DEFAULT_ASSET_COLOR } from '@/app/dashboard/portfolio/_constants'
import { toast } from 'sonner'

interface DcaScheduleRow {
  id: string
  symbol: string
  asset_type: string
  amount: number
  frequency: string
  day_of_week: number | null
  day_of_month: number | null
  is_active: boolean
  created_at: string
  portfolio_id: string
}

interface SchedulesListProps {
  schedules: DcaScheduleRow[]
  portfolioId: string
}

export function SchedulesList({ schedules, portfolioId }: SchedulesListProps) {
  const [editingSchedule, setEditingSchedule] = useState<DcaScheduleRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleToggle = (schedule: DcaScheduleRow) => {
    setTogglingId(schedule.id)
    startTransition(async () => {
      const result = await toggleDcaSchedule(schedule.id, !schedule.is_active)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(schedule.is_active ? 'Schedule paused' : 'Schedule activated')
      }
      setTogglingId(null)
    })
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    const result = await deleteDcaSchedule(deletingId)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Schedule deleted')
    }
    setIsDeleting(false)
    setDeletingId(null)
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Asset</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => {
            const colors = ASSET_COLOR_CLASSES[schedule.symbol] ?? DEFAULT_ASSET_COLOR
            return (
              <TableRow key={schedule.id}>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${colors.text} ${colors.bg} border-transparent`}
                  >
                    {schedule.symbol}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatUsd(schedule.amount)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFrequencyLabel(
                    schedule.frequency,
                    schedule.day_of_week,
                    schedule.day_of_month,
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      schedule.is_active
                        ? 'text-emerald-400 bg-emerald-400/10 border-transparent'
                        : 'text-amber-400 bg-amber-400/10 border-transparent'
                    }
                  >
                    {schedule.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle(schedule)}
                      disabled={togglingId === schedule.id}
                      title={schedule.is_active ? 'Pause' : 'Activate'}
                    >
                      {schedule.is_active ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingSchedule(schedule)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600"
                      onClick={() => setDeletingId(schedule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog
        open={editingSchedule !== null}
        onOpenChange={(open) => !open && setEditingSchedule(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit DCA Schedule</DialogTitle>
            <DialogDescription>
              Update your {editingSchedule?.symbol} DCA schedule.
            </DialogDescription>
          </DialogHeader>
          {editingSchedule && (
            <ScheduleForm
              portfolioId={portfolioId}
              defaultValues={{
                id: editingSchedule.id,
                symbol: editingSchedule.symbol,
                asset_type: editingSchedule.asset_type,
                amount: editingSchedule.amount,
                frequency: editingSchedule.frequency,
                day_of_week: editingSchedule.day_of_week,
                day_of_month: editingSchedule.day_of_month,
              }}
              onSuccess={() => setEditingSchedule(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DCA Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this DCA schedule. Past DCA transactions will be
              preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================
// Loading Skeleton
// ============================================================

export function SchedulesListSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Asset</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[120px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-5 w-12" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-24 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
