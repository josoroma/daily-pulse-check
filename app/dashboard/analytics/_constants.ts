export const BENCHMARK_SYMBOL = 'VOO'

export const REPORT_PERIODS = ['monthly', 'yearly'] as const
export type ReportPeriod = (typeof REPORT_PERIODS)[number]

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const COSTA_RICA_TAX_NOTE =
  'Costa Rica territorial tax system — foreign investment gains may be exempt. Consult your accountant.'
