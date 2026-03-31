// Pure helper functions and types for the dashboard home page.

// ============================================================
// Types
// ============================================================

export interface DashboardMetrics {
  totalValue: number
  totalCostBasis: number
  dayChangeAmount: number
  dayChangePct: number
  btcPrice: number
  btcChange24h: number
}

export interface DashboardAllocation {
  symbol: string
  value: number
  percentage: number
  color: string
}

export interface DashboardSnapshot {
  date: string
  value: number
}

export interface DashboardTransaction {
  id: string
  type: string
  symbol: string
  quantity: number
  price: number
  executed_at: string
}

export interface DashboardNotification {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  created_at: string
}

export interface ActivityItem {
  id: string
  kind: 'transaction' | 'notification'
  title: string
  description: string
  timestamp: string
}

export interface DashboardData {
  metrics: DashboardMetrics
  allocations: DashboardAllocation[]
  snapshots: DashboardSnapshot[]
  aiSummary: string | null
  recentActivity: ActivityItem[]
  errors: string[]
}

// ============================================================
// Helpers
// ============================================================

export function buildActivityFeed(
  transactions: Array<{
    id: string
    type: string
    quantity: number
    price: number
    executed_at: string
    position: { symbol: string } | { symbol: string }[] | null
  }>,
  notifications: Array<{
    id: string
    title: string
    body: string
    type: string
    read: boolean
    created_at: string
  }>,
): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const tx of transactions) {
    const symbol = Array.isArray(tx.position)
      ? (tx.position[0]?.symbol ?? '???')
      : (tx.position?.symbol ?? '???')
    items.push({
      id: `tx-${tx.id}`,
      kind: 'transaction',
      title: `${tx.type} ${symbol}`,
      description: `${Number(tx.quantity).toFixed(4)} @ $${Number(tx.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      timestamp: tx.executed_at,
    })
  }

  for (const n of notifications) {
    items.push({
      id: `notif-${n.id}`,
      kind: 'notification',
      title: n.title,
      description: n.body,
      timestamp: n.created_at,
    })
  }

  // Sort by timestamp descending, take top 5
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return items.slice(0, 5)
}

export function computeDayChange(
  currentValue: number,
  snapshotValues: Array<{ total_value: number }>,
): { dayChangeAmount: number; dayChangePct: number } {
  if (snapshotValues.length >= 2) {
    const previousValue = Number(snapshotValues[1]!.total_value)
    if (previousValue > 0) {
      const dayChangeAmount = currentValue - previousValue
      return { dayChangeAmount, dayChangePct: (dayChangeAmount / previousValue) * 100 }
    }
  } else if (snapshotValues.length === 1) {
    const previousValue = Number(snapshotValues[0]!.total_value)
    if (previousValue > 0) {
      const dayChangeAmount = currentValue - previousValue
      return { dayChangeAmount, dayChangePct: (dayChangeAmount / previousValue) * 100 }
    }
  }
  return { dayChangeAmount: 0, dayChangePct: 0 }
}
