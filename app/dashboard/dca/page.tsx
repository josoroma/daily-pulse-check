import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getOrCreatePortfolio } from '@/app/dashboard/portfolio/_actions'
import { getDcaSchedules, getDcaTransactions } from './_actions'
import { SchedulesList } from './_components/schedules-list'
import { AddScheduleModal } from './_components/add-schedule-modal'
import { EmptyState } from './_components/empty-state'
import { DcaSummaryCards } from './_components/dca-summary-cards'
import { DcaHistoryChart } from './_components/dca-history-chart'
import { DcaVsLumpsum } from './_components/dca-vs-lumpsum'
import { calculateDcaReturns, calculateLumpSumComparison, calculateCostBasisTrend } from './_utils'
import { ASSET_COLORS } from '@/app/dashboard/portfolio/_constants'

export default async function DcaPage() {
  const portfolioResult = await getOrCreatePortfolio()
  const portfolio = portfolioResult && 'data' in portfolioResult ? portfolioResult.data : null

  if (!portfolio) {
    return (
      <div className="space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DCA Automation</h1>
          <p className="text-muted-foreground">
            Set up your portfolio first to create DCA schedules.
          </p>
        </div>
      </div>
    )
  }

  const [schedules, dcaTransactions] = await Promise.all([getDcaSchedules(), getDcaTransactions()])

  // Group transactions by symbol for analytics
  const transactionsBySymbol = dcaTransactions.reduce<
    Record<string, Array<{ quantity: number; price: number; fee: number; executed_at: string }>>
  >((acc, t) => {
    const sym =
      t.position && typeof t.position === 'object' && 'symbol' in t.position
        ? (t.position as { symbol: string }).symbol
        : 'Unknown'
    if (!acc[sym]) acc[sym] = []
    acc[sym].push({
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      executed_at: t.executed_at,
    })
    return acc
  }, {})

  const hasTransactions = dcaTransactions.length > 0
  const analyticsSymbols = Object.keys(transactionsBySymbol)

  return (
    <div className="space-y-6 px-4 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DCA Automation</h1>
          <p className="text-muted-foreground">
            Dollar-cost averaging schedules and performance tracking
          </p>
        </div>
        {schedules.length > 0 && <AddScheduleModal portfolioId={portfolio.id} />}
      </div>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          {schedules.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <EmptyState portfolioId={portfolio.id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Active Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                <SchedulesList schedules={schedules} portfolioId={portfolio.id} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {!hasTransactions ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No DCA transactions yet. Mark your DCA reminders as done to start tracking
                    performance.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            analyticsSymbols.map((symbol) => {
              const txns = transactionsBySymbol[symbol]
              const returns = calculateDcaReturns(txns)
              const costBasisTrend = calculateCostBasisTrend(txns)
              const lastPrice = txns.length > 0 ? txns[txns.length - 1].price : 0
              const firstPrice = txns.length > 0 ? txns[0].price : 0
              const currentValue = returns.totalQuantity * lastPrice
              const comparison = calculateLumpSumComparison(txns, lastPrice, firstPrice)
              const assetColor = ASSET_COLORS[symbol] ?? 'hsl(220, 10%, 50%)'

              return (
                <div key={symbol} className="space-y-4">
                  <DcaSummaryCards
                    totalInvested={returns.totalInvested}
                    currentValue={currentValue}
                    averageCostBasis={returns.averageCostBasis}
                    transactionCount={returns.transactionCount}
                    symbol={symbol}
                  />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <DcaHistoryChart
                      costBasisTrend={costBasisTrend}
                      currentPrice={lastPrice}
                      symbol={symbol}
                      assetColor={assetColor}
                    />
                    <DcaVsLumpsum comparison={comparison} symbol={symbol} />
                  </div>
                </div>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
