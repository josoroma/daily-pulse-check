'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/info-tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { parseCsv, type CsvParseResult } from '../_utils'
import { importPositions } from '../_actions'

type Portfolio = {
  id: string
  name: string
}

export const CsvImportCard = ({ portfolios }: { portfolios: Portfolio[] }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null)
  const [selectedPortfolio, setSelectedPortfolio] = useState(portfolios[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const [importCount, setImportCount] = useState(0)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const result = parseCsv(text)
      setParseResult(result)

      if (result.valid.length === 0 && result.invalid.length > 0) {
        toast.error('No valid rows found in CSV')
      } else {
        setStep('preview')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!parseResult || !selectedPortfolio) return

    const positions = parseResult.valid.map((r) => ({
      symbol: r.data.symbol,
      asset_type: r.data.asset_type,
      quantity: r.data.quantity,
      average_buy_price: r.data.average_buy_price,
      notes: r.data.notes,
    }))

    startTransition(async () => {
      const result = await importPositions(selectedPortfolio, positions)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else {
        setImportCount(result.count ?? 0)
        setStep('done')
        toast.success(`${result.count} positions imported`)
      }
    })
  }

  const resetForm = () => {
    setStep('upload')
    setParseResult(null)
    setImportCount(0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
          Import Positions from CSV
          <InfoTooltip text="Bulk-import your positions from a CSV file instead of adding them one by one." />
        </CardTitle>
        <CardDescription>
          Upload a CSV file with columns: Symbol, Asset Type (ETF/Crypto), Quantity, Average Buy
          Price, Notes (optional). Common header aliases are auto-detected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-muted-foreground/50">
              <label className="flex cursor-pointer flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Click to upload CSV</span>
                <span className="text-xs text-muted-foreground">or drag and drop</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {step === 'preview' && parseResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                {parseResult.valid.length} valid
              </span>
              {parseResult.invalid.length > 0 && (
                <span className="flex items-center gap-1 text-rose-500">
                  <AlertCircle className="h-4 w-4" />
                  {parseResult.invalid.length} invalid
                </span>
              )}
            </div>

            {portfolios.length > 0 && (
              <div className="space-y-2">
                <Label>Import to Portfolio</Label>
                <Select
                  value={selectedPortfolio}
                  onValueChange={(v) => setSelectedPortfolio(v ?? '')}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {parseResult.valid.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right tabular-nums">Quantity</TableHead>
                      <TableHead className="text-right tabular-nums">Avg Price</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.valid.slice(0, 20).map(({ row, data }) => (
                      <TableRow key={row}>
                        <TableCell className="text-muted-foreground">{row}</TableCell>
                        <TableCell className="font-medium">{data.symbol}</TableCell>
                        <TableCell>{data.asset_type}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {data.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          ${data.average_buy_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {data.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parseResult.valid.length > 20 && (
                  <p className="p-3 text-xs text-muted-foreground text-center">
                    Showing first 20 of {parseResult.valid.length} rows
                  </p>
                )}
              </div>
            )}

            {parseResult.invalid.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-rose-500">Invalid rows (will be skipped):</p>
                <div className="max-h-40 overflow-auto rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs">
                  {parseResult.invalid.map(({ row, errors }) => (
                    <p key={row} className="text-rose-500">
                      Row {row}: {errors.join(', ')}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={isPending || parseResult.valid.length === 0 || !selectedPortfolio}
                className="gap-2"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Import {parseResult.valid.length} Positions
              </Button>
              <Button variant="ghost" onClick={resetForm} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-emerald-500/10 p-4 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Import Complete</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {importCount} positions were added to your portfolio.
            </p>
            <Button variant="outline" onClick={resetForm}>
              Import More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
