'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TotalValueCard } from './total-value-card'
import { PositionsTable } from './positions-table'
import { AddPositionModal } from './add-position-modal'
import { TransactionForm } from './transaction-form'
import { TransactionsTable } from './transactions-table'
import { AllocationChart } from './allocation-chart'
import { PerformanceChart } from './performance-chart'
import { TargetAllocationForm } from './target-allocation-form'
import { DriftIndicator } from './drift-indicator'
import type {
  PositionWithPnL,
  AllocationItem,
  DriftItem,
  RebalanceSuggestion,
  TargetAllocation,
} from '../_utils'

interface PortfolioTabsProps {
  portfolioId: string
  positions: PositionWithPnL[]
  totalValue: number
  totalCostBasis: number
  totalPnl: number
  totalPnlPct: number
  allocations: AllocationItem[]
  transactions: Array<{
    id: string
    position_id: string
    type: string
    quantity: number
    price: number
    fee: number
    executed_at: string
    notes: string | null
    position: { symbol: string; asset_type: string } | null
  }>
  snapshots: Array<{
    id: string
    snapshot_date: string
    total_value: number
  }>
  symbols: string[]
  targetAllocations: TargetAllocation
  driftItems: DriftItem[]
  rebalanceNeeded: boolean
  suggestions: RebalanceSuggestion[]
}

export function PortfolioTabs({
  portfolioId,
  positions,
  totalValue,
  totalCostBasis,
  totalPnl,
  totalPnlPct,
  allocations,
  transactions,
  snapshots,
  symbols,
  targetAllocations,
  driftItems,
  rebalanceNeeded,
  suggestions,
}: PortfolioTabsProps) {
  return (
    <div className="space-y-6">
      <TotalValueCard
        totalValue={totalValue}
        totalCostBasis={totalCostBasis}
        dayChangeAmount={totalPnl}
        dayChangePct={totalPnlPct}
      />

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <div className="flex justify-end">
            <AddPositionModal portfolioId={portfolioId} />
          </div>
          <PositionsTable positions={positions} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-end">
            <TransactionForm positions={positions} />
          </div>
          <TransactionsTable transactions={transactions} symbols={symbols} />
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <AllocationChart data={allocations} />
            <TargetAllocationForm
              portfolioId={portfolioId}
              currentTargets={targetAllocations}
              symbols={symbols}
            />
          </div>
          {driftItems.length > 0 && (
            <DriftIndicator
              driftItems={driftItems}
              rebalanceNeeded={rebalanceNeeded}
              suggestions={suggestions}
            />
          )}
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceChart
            data={snapshots.map((s) => ({ date: s.snapshot_date, value: s.total_value }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
