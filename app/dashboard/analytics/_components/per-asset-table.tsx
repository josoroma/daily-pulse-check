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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpDown } from 'lucide-react'
import type { PositionPerformance } from '../_utils'
import { formatUsd, formatPct } from '../_utils'

const ASSET_COLOR_CLASSES: Record<string, { text: string; bg: string }> = {
  VOO: { text: 'text-blue-500', bg: 'bg-blue-500/10' },
  QQQ: { text: 'text-purple-500', bg: 'bg-purple-500/10' },
  BTC: { text: 'text-orange-500', bg: 'bg-orange-500/10' },
  ETH: { text: 'text-sky-500', bg: 'bg-sky-500/10' },
  Cash: { text: 'text-teal-500', bg: 'bg-teal-500/10' },
}

const DEFAULT_COLOR = { text: 'text-zinc-400', bg: 'bg-zinc-400/10' }

type SortField = 'symbol' | 'costBasis' | 'currentValue' | 'unrealizedPnl' | 'returnPct'
type SortDir = 'asc' | 'desc'

interface PerAssetTableProps {
  assets: PositionPerformance[]
}

export const PerAssetTable = ({ assets }: PerAssetTableProps) => {
  const [sortField, setSortField] = useState<SortField>('currentValue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = [...assets].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortField === 'symbol') return mul * a.symbol.localeCompare(b.symbol)
    return mul * (a[sortField] - b[sortField])
  })

  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Per-Asset Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No positions found. Add positions in your portfolio to see performance data.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-Asset Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('symbol')}
                >
                  Symbol <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('costBasis')}
                >
                  Cost Basis <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('currentValue')}
                >
                  Current Value <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('unrealizedPnl')}
                >
                  Unrealized P&L <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => toggleSort('returnPct')}
                >
                  Return % <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((asset) => {
              const colors = ASSET_COLOR_CLASSES[asset.symbol] ?? DEFAULT_COLOR
              const isPnlPositive = asset.unrealizedPnl >= 0

              return (
                <TableRow key={asset.symbol}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${colors.text} ${colors.bg} border-transparent`}
                    >
                      {asset.symbol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{asset.assetType}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {asset.assetType === 'Crypto'
                      ? asset.quantity.toFixed(8).replace(/\.?0+$/, '')
                      : asset.quantity.toFixed(4).replace(/\.?0+$/, '')}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatUsd(asset.costBasis)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-medium">
                    {formatUsd(asset.currentValue)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums ${isPnlPositive ? 'text-emerald-500' : 'text-rose-500'}`}
                  >
                    {formatUsd(asset.unrealizedPnl)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums font-semibold ${isPnlPositive ? 'text-emerald-500' : 'text-rose-500'}`}
                  >
                    {formatPct(asset.returnPct)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export const PerAssetTableSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)
