import './config'

import { format, subDays, isValid, parseISO } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { CR_TIMEZONE } from './config'

/** Current instant in Costa Rica timezone */
export function nowCR(): TZDate {
  return new TZDate(new Date(), CR_TIMEZONE)
}

/** Today's date as YYYY-MM-DD in Costa Rica timezone */
export function todayCR(): string {
  return format(nowCR(), 'yyyy-MM-dd')
}

/** Parse an ISO string or Date into a Costa Rica TZDate */
export function parseCR(input: string | Date): TZDate {
  const date = typeof input === 'string' ? parseISO(input) : input
  return new TZDate(date, CR_TIMEZONE)
}

/** Format as YYYY-MM-DD (ISO date, no time) */
export function formatDateISO(input: string | Date): string {
  return format(parseCR(input), 'yyyy-MM-dd')
}

/** Format as "21 mar 2026" — short human-readable */
export function formatDateShort(input: string | Date): string {
  return format(parseCR(input), 'd MMM yyyy')
}

/** Format as "mar 2026" — month + year */
export function formatMonthYear(input: string | Date): string {
  return format(parseCR(input), 'MMM yyyy')
}

/** Convert a Date to ISO string (with time) */
export function toISO(date: Date): string {
  return date.toISOString()
}

/** Date string YYYY-MM-DD for N days ago in Costa Rica timezone */
export function daysAgoCR(days: number): string {
  return format(subDays(nowCR(), days), 'yyyy-MM-dd')
}

/** Start of today in Costa Rica timezone as TZDate */
export function startOfTodayCR(): TZDate {
  const now = nowCR()
  return new TZDate(now.getFullYear(), now.getMonth(), now.getDate(), CR_TIMEZONE)
}

/** Check if a value is a valid date */
export function isValidDate(input: unknown): boolean {
  if (input instanceof Date) return isValid(input)
  if (typeof input === 'string') return isValid(parseISO(input))
  return false
}

// Re-export for convenience
export { CR_TIMEZONE } from './config'
