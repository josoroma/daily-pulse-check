'use client'

import { useState } from 'react'
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
import { Pencil, Trash2, ArrowUpDown } from 'lucide-react'
import { deletePosition } from '../_actions'
import { PositionForm } from './position-form'
import { formatUsd, formatPct, formatQuantity, type PositionWithPnL } from '../_utils'
import { ASSET_COLOR_CLASSES, DEFAULT_ASSET_COLOR } from '../_constants'

type SortField = 'symbol' | 'current_value' | 'unrealized_pnl' | 'unrealized_pnl_pct'
type SortDirection = 'asc' | 'desc'

interface PositionsTableProps {
  positions: PositionWithPnL[]
  portfolioId: string
}

function SortButton({
  field,
  children,
  onSort,
}: {
  field: SortField
  children: React.ReactNode
  onSort: (field: SortField) => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=active]:font-bold"
      onClick={() => onSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  )
}

export function PositionsTable({ positions, portfolioId }: PositionsTableProps) {
  const [sortField, setSortField] = useState<SortField>('current_value')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [editingPosition, setEditingPosition] = useState<PositionWithPnL | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = [...positions].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortField === 'symbol') return mul * a.symbol.localeCompare(b.symbol)
    return mul * (a[sortField] - b[sortField])
  })

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    await deletePosition(deletingId)
    setIsDeleting(false)
    setDeletingId(null)
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">
              <SortButton field="symbol" onSort={toggleSort}>
                Symbol
              </SortButton>
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Avg Price</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">
              <SortButton field="current_value" onSort={toggleSort}>
                Value
              </SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="unrealized_pnl" onSort={toggleSort}>
                P&L
              </SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="unrealized_pnl_pct" onSort={toggleSort}>
                P&L %
              </SortButton>
            </TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((pos) => {
            const colors = ASSET_COLOR_CLASSES[pos.symbol] ?? DEFAULT_ASSET_COLOR
            const isPnLPositive = pos.unrealized_pnl >= 0
            return (
              <TableRow key={pos.id}>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${colors.text} ${colors.bg} border-transparent`}
                  >
                    {pos.symbol}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{pos.asset_type}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatQuantity(pos.quantity, pos.asset_type)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatUsd(pos.average_buy_price)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatUsd(pos.current_price)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-medium">
                  {formatUsd(pos.current_value)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums ${isPnLPositive ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  {formatUsd(pos.unrealized_pnl)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums ${isPnLPositive ? 'text-emerald-500' : 'text-rose-500'}`}
                >
                  {formatPct(pos.unrealized_pnl_pct)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingPosition(pos)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600"
                      onClick={() => setDeletingId(pos.id)}
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
        open={editingPosition !== null}
        onOpenChange={(open) => !open && setEditingPosition(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Position</DialogTitle>
            <DialogDescription>Update your {editingPosition?.symbol} position.</DialogDescription>
          </DialogHeader>
          {editingPosition && (
            <PositionForm
              portfolioId={portfolioId}
              defaultValues={{
                id: editingPosition.id,
                asset_type: editingPosition.asset_type,
                symbol: editingPosition.symbol,
                quantity: editingPosition.quantity,
                average_buy_price: editingPosition.average_buy_price,
                notes: editingPosition.notes ?? undefined,
              }}
              onSuccess={() => setEditingPosition(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this position and cannot be undone. All associated
              transactions will also be removed.
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

export function PositionsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Symbol</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Avg Price</TableHead>
          <TableHead className="text-right">Current Price</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead className="text-right">P&L</TableHead>
          <TableHead className="text-right">P&L %</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-5 w-12" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-10" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-14 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-20 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-16 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-4 w-14 ml-auto" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-16 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
