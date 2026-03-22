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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatUsd, formatQuantity } from '../_utils'
import { ASSET_COLOR_CLASSES, DEFAULT_ASSET_COLOR } from '../_constants'
import { formatDateISO } from '@/lib/date'

interface Transaction {
  id: string
  position_id: string
  type: string
  quantity: number
  price: number
  fee: number
  executed_at: string
  notes: string | null
  position: { symbol: string; asset_type: string } | null
}

interface TransactionsTableProps {
  transactions: Transaction[]
  symbols: string[]
}

const TYPE_COLORS: Record<string, string> = {
  Buy: 'text-emerald-500 bg-emerald-500/10',
  Sell: 'text-rose-500 bg-rose-500/10',
  DCA: 'text-sky-500 bg-sky-500/10',
}

export function TransactionsTable({ transactions, symbols }: TransactionsTableProps) {
  const [filterSymbol, setFilterSymbol] = useState<string>('all')

  const filtered =
    filterSymbol === 'all'
      ? transactions
      : transactions.filter((t) => t.position?.symbol === filterSymbol)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select
          value={filterSymbol}
          onValueChange={(val) => {
            if (val) setFilterSymbol(val)
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter symbol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Symbols</SelectItem>
            {symbols.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No transactions found.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((tx) => {
              const symbol = tx.position?.symbol ?? '—'
              const colors = ASSET_COLOR_CLASSES[symbol] ?? DEFAULT_ASSET_COLOR
              const total = tx.quantity * tx.price + tx.fee
              const date = formatDateISO(tx.executed_at)

              return (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm">{date}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${TYPE_COLORS[tx.type] ?? ''} border-transparent`}
                    >
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${colors.text} ${colors.bg} border-transparent`}
                    >
                      {symbol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatQuantity(
                      Number(tx.quantity),
                      tx.position?.asset_type === 'Crypto' ? 'Crypto' : 'ETF',
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatUsd(Number(tx.price))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {formatUsd(Number(tx.fee))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-medium">
                    {formatUsd(total)}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
