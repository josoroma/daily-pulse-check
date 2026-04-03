import { getDay, differenceInCalendarWeeks } from 'date-fns'

// ============================================================
// Schedule Due Calculation
// ============================================================

export interface DcaSchedule {
  id: string
  frequency: 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly'
  day_of_week: number | null
  day_of_month: number | null
  is_active: boolean
  next_execution_at: string | null
  created_at: string
}

/**
 * Determines if a DCA schedule is due on a given date.
 * - Daily: always due
 * - Weekly: due if today matches day_of_week
 * - Biweekly: due if today matches day_of_week and it's been an even number of weeks since created
 * - Monthly: due if today matches day_of_month
 */
export function isScheduleDue(schedule: DcaSchedule, now: Date): boolean {
  if (!schedule.is_active) return false

  const currentDayOfWeek = getDay(now) // 0=Sunday ... 6=Saturday
  const currentDayOfMonth = now.getDate()

  switch (schedule.frequency) {
    case 'Daily':
      return true

    case 'Weekly':
      return schedule.day_of_week != null && currentDayOfWeek === schedule.day_of_week

    case 'Biweekly': {
      if (schedule.day_of_week == null) return false
      if (currentDayOfWeek !== schedule.day_of_week) return false
      const createdDate = new Date(schedule.created_at)
      const weeksDiff = differenceInCalendarWeeks(now, createdDate, { weekStartsOn: 0 })
      return weeksDiff % 2 === 0
    }

    case 'Monthly':
      return schedule.day_of_month != null && currentDayOfMonth === schedule.day_of_month

    default:
      return false
  }
}

// ============================================================
// DCA Performance Calculations
// ============================================================

export interface DcaTransaction {
  quantity: number
  price: number
  fee: number
  executed_at: string
}

export interface DcaReturns {
  totalInvested: number
  totalQuantity: number
  averageCostBasis: number
  totalFees: number
  transactionCount: number
}

/**
 * Calculate aggregate DCA returns from a list of DCA transactions.
 */
export function calculateDcaReturns(transactions: DcaTransaction[]): DcaReturns {
  if (transactions.length === 0) {
    return {
      totalInvested: 0,
      totalQuantity: 0,
      averageCostBasis: 0,
      totalFees: 0,
      transactionCount: 0,
    }
  }

  const totalInvested = transactions.reduce((sum, t) => sum + t.quantity * t.price, 0)
  const totalQuantity = transactions.reduce((sum, t) => sum + t.quantity, 0)
  const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0)
  const averageCostBasis = totalQuantity > 0 ? totalInvested / totalQuantity : 0

  return {
    totalInvested,
    totalQuantity,
    averageCostBasis,
    totalFees,
    transactionCount: transactions.length,
  }
}

export interface LumpSumComparison {
  dcaTotalInvested: number
  dcaCurrentValue: number
  dcaReturnPct: number
  lumpSumCurrentValue: number
  lumpSumReturnPct: number
  dcaAdvantage: number
}

/**
 * Compare DCA performance against a lump sum investment made on the first transaction date.
 * @param transactions - chronologically ordered DCA transactions
 * @param currentPrice - current market price of the asset
 * @param firstDayPrice - price on the date of the first DCA transaction (for lump sum comparison)
 */
export function calculateLumpSumComparison(
  transactions: DcaTransaction[],
  currentPrice: number,
  firstDayPrice: number,
): LumpSumComparison {
  if (transactions.length === 0 || firstDayPrice <= 0) {
    return {
      dcaTotalInvested: 0,
      dcaCurrentValue: 0,
      dcaReturnPct: 0,
      lumpSumCurrentValue: 0,
      lumpSumReturnPct: 0,
      dcaAdvantage: 0,
    }
  }

  const dcaReturns = calculateDcaReturns(transactions)
  const dcaCurrentValue = dcaReturns.totalQuantity * currentPrice
  const dcaReturnPct =
    dcaReturns.totalInvested > 0
      ? ((dcaCurrentValue - dcaReturns.totalInvested) / dcaReturns.totalInvested) * 100
      : 0

  // Lump sum: invest total amount at firstDayPrice
  const lumpSumQuantity = dcaReturns.totalInvested / firstDayPrice
  const lumpSumCurrentValue = lumpSumQuantity * currentPrice
  const lumpSumReturnPct =
    dcaReturns.totalInvested > 0
      ? ((lumpSumCurrentValue - dcaReturns.totalInvested) / dcaReturns.totalInvested) * 100
      : 0

  return {
    dcaTotalInvested: dcaReturns.totalInvested,
    dcaCurrentValue,
    dcaReturnPct,
    lumpSumCurrentValue,
    lumpSumReturnPct,
    dcaAdvantage: dcaReturnPct - lumpSumReturnPct,
  }
}

export interface CostBasisPoint {
  date: string
  averageCostBasis: number
  totalInvested: number
  totalQuantity: number
}

/**
 * Calculate a running cost basis trend over time from chronological transactions.
 */
export function calculateCostBasisTrend(transactions: DcaTransaction[]): CostBasisPoint[] {
  const points: CostBasisPoint[] = []
  let totalInvested = 0
  let totalQuantity = 0

  for (const t of transactions) {
    totalInvested += t.quantity * t.price
    totalQuantity += t.quantity
    const averageCostBasis = totalQuantity > 0 ? totalInvested / totalQuantity : 0
    points.push({
      date: t.executed_at,
      averageCostBasis,
      totalInvested,
      totalQuantity,
    })
  }

  return points
}

// ============================================================
// Formatting Helpers
// ============================================================

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatFrequencyLabel(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  switch (frequency) {
    case 'Daily':
      return 'Every day'
    case 'Weekly':
      return dayOfWeek != null ? `Every ${dayNames[dayOfWeek]}` : 'Every week'
    case 'Biweekly':
      return dayOfWeek != null ? `Every other ${dayNames[dayOfWeek]}` : 'Every 2 weeks'
    case 'Monthly':
      return dayOfMonth != null ? `Monthly on the ${ordinal(dayOfMonth)}` : 'Every month'
    default:
      return frequency
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? 'th')
}
