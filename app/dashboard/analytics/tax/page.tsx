import { getAnalyticsTransactions, getTransactionYears, getUserCountry } from '../_actions'
import { TaxExportClient } from './_components/tax-export-client'

export default async function TaxExportPage() {
  const [transactions, availableYears, country] = await Promise.all([
    getAnalyticsTransactions(),
    getTransactionYears(),
    getUserCountry(),
  ])

  const formattedTransactions = transactions.map((t) => ({
    id: t.id,
    position_id: t.position_id,
    type: t.type,
    quantity: Number(t.quantity),
    price: Number(t.price),
    fee: Number(t.fee),
    executed_at: t.executed_at,
    notes: t.notes,
    position: t.position,
    symbol: t.position?.symbol ?? '',
  }))

  return (
    <div className="space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tax Export</h1>
        <p className="text-muted-foreground">
          Export realized gains and transaction history for your accountant
        </p>
      </div>

      <TaxExportClient
        transactions={formattedTransactions}
        availableYears={availableYears}
        country={country}
      />
    </div>
  )
}
