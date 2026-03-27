'use client'

import { useState } from 'react'
import { Download, FileText, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  calculateFifoRealizedGains,
  realizedGainsToCsvRows,
  transactionsToCsvRows,
  generateCsv,
  downloadCsv,
  getTaxNote,
  formatUsd,
  type Transaction,
} from '../../_utils'

interface TaxExportClientProps {
  transactions: Array<Transaction & { symbol: string }>
  availableYears: number[]
  country: string
}

export const TaxExportClient = ({
  transactions,
  availableYears,
  country,
}: TaxExportClientProps) => {
  const [selectedYear, setSelectedYear] = useState(availableYears[0] ?? new Date().getFullYear())

  const taxNote = getTaxNote(country)

  // Filter transactions for selected year
  const yearTxs = transactions.filter((t) => t.executed_at.startsWith(String(selectedYear)))

  // Calculate realized gains using FIFO
  const fifoInput = yearTxs.map((t) => ({
    id: t.id,
    type: t.type,
    quantity: t.quantity,
    price: t.price,
    fee: t.fee,
    executed_at: t.executed_at,
    symbol: t.symbol,
  }))
  const realizedGains = calculateFifoRealizedGains(fifoInput)

  const totalRealizedGain = realizedGains.reduce((sum, g) => sum + g.realizedGainLoss, 0)
  const totalCostBasis = realizedGains.reduce((sum, g) => sum + g.costBasis, 0)
  const totalSalePrice = realizedGains.reduce((sum, g) => sum + g.salePrice, 0)

  const handleExportGains = () => {
    const { headers, rows } = realizedGainsToCsvRows(realizedGains)
    const csv = generateCsv(headers, rows, taxNote)
    downloadCsv(csv, `realized-gains-${selectedYear}.csv`)
  }

  const handleExportTransactions = () => {
    const txForExport: Transaction[] = yearTxs.map((t) => ({
      id: t.id,
      position_id: t.position_id,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      executed_at: t.executed_at,
      notes: t.notes,
      position: t.position,
    }))
    const { headers, rows } = transactionsToCsvRows(txForExport)
    const csv = generateCsv(headers, rows, taxNote)
    downloadCsv(csv, `transactions-${selectedYear}.csv`)
  }

  return (
    <div className="space-y-6">
      {/* Tax note banner */}
      {taxNote && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200/80">{taxNote}</p>
          </CardContent>
        </Card>
      )}

      {/* Year selector and export buttons */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download CSV files for your accountant</CardDescription>
          </div>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExportGains}
            disabled={realizedGains.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Realized Gains CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportTransactions}
            disabled={yearTxs.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            Transaction History CSV
          </Button>
        </CardContent>
      </Card>

      {/* Realized gains summary */}
      <Card>
        <CardHeader>
          <CardTitle>Realized Gains — {selectedYear}</CardTitle>
          <CardDescription>
            FIFO method • {realizedGains.length} disposal{realizedGains.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {realizedGains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No sell transactions found for {selectedYear}.
              </p>
            </div>
          ) : (
            <>
              {/* Totals */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Cost Basis</p>
                  <p className="text-lg font-bold font-mono tabular-nums mt-1">
                    {formatUsd(totalCostBasis)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Sale Price</p>
                  <p className="text-lg font-bold font-mono tabular-nums mt-1">
                    {formatUsd(totalSalePrice)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Net Realized Gain/Loss</p>
                  <p
                    className={`text-lg font-bold font-mono tabular-nums mt-1 ${totalRealizedGain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                  >
                    {formatUsd(totalRealizedGain)}
                  </p>
                </div>
              </div>

              {/* Detail table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                    <TableHead className="text-right">Sale Price</TableHead>
                    <TableHead className="text-right">Gain/Loss</TableHead>
                    <TableHead className="text-right">Days Held</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realizedGains.map((g, i) => (
                    <TableRow key={`${g.sellDate}-${g.symbol}-${i}`}>
                      <TableCell className="font-mono tabular-nums text-sm">
                        {g.sellDate.slice(0, 10)}
                      </TableCell>
                      <TableCell className="font-medium">{g.symbol}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {g.quantitySold.toFixed(4).replace(/\.?0+$/, '')}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatUsd(g.costBasis)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatUsd(g.salePrice)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono tabular-nums font-semibold ${g.realizedGainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {formatUsd(g.realizedGainLoss)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                        {g.holdingPeriodDays}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
