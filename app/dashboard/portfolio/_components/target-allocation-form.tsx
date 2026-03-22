'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { updateTargetAllocations } from '../_actions'
import type { TargetAllocation } from '../_utils'

const DEFAULT_ASSETS = ['VOO', 'QQQ', 'BTC']

interface TargetAllocationFormProps {
  portfolioId: string
  currentTargets: TargetAllocation
  symbols: string[]
}

export function TargetAllocationForm({
  portfolioId,
  currentTargets,
  symbols,
}: TargetAllocationFormProps) {
  const allSymbols = Array.from(new Set([...symbols, ...Object.keys(currentTargets)]))
  const displaySymbols = allSymbols.length > 0 ? allSymbols : DEFAULT_ASSETS

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const s of displaySymbols) {
      init[s] = String(currentTargets[s] ?? 0)
    }
    return init
  })
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const total = Object.values(values).reduce((sum, v) => sum + (Number(v) || 0), 0)
  const isValid = Math.abs(total - 100) < 0.01

  function handleChange(symbol: string, val: string) {
    setValues((prev) => ({ ...prev, [symbol]: val }))
    setMessage(null)
  }

  function handleSubmit() {
    const allocations: Record<string, number> = {}
    for (const [k, v] of Object.entries(values)) {
      const num = Number(v) || 0
      if (num > 0) allocations[k] = num
    }

    startTransition(async () => {
      const result = await updateTargetAllocations(portfolioId, allocations)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Targets saved' })
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Target Allocation</CardTitle>
        <CardDescription>Set target percentages for each asset. Must total 100%.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displaySymbols.map((symbol) => (
            <div key={symbol} className="flex items-center gap-3">
              <Label className="w-16 text-sm font-medium">{symbol}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={values[symbol] ?? '0'}
                onChange={(e) => handleChange(symbol, e.target.value)}
                className="w-24 font-mono tabular-nums text-right"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Total</span>
            <span
              className={`font-mono tabular-nums text-sm font-semibold ${isValid ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {total.toFixed(2)}%
            </span>
          </div>

          {message && (
            <p
              className={`text-sm ${message.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {message.text}
            </p>
          )}

          <Button onClick={handleSubmit} disabled={!isValid || isPending} className="w-full">
            {isPending ? 'Saving…' : 'Save Targets'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
