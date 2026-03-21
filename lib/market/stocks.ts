import { z } from 'zod'
import {
  getCached,
  getStaleFromSupabaseCache,
  CacheTTL,
  incrementRequestCount,
  getRequestCount,
} from '@/lib/market/cache'

const TWELVE_DATA_BASE = 'https://api.twelvedata.com'
const RATE_LIMIT_THRESHOLD = 750
const PROVIDER = 'twelve_data'

// --- Response Schemas ---

export const StockPriceSchema = z.object({
  symbol: z.string(),
  price: z.number().positive(),
  timestamp: z.string(),
  currency: z.string().optional(),
})

export type StockPrice = z.infer<typeof StockPriceSchema>

export const OHLCVPointSchema = z.object({
  datetime: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
})

export type OHLCVPoint = z.infer<typeof OHLCVPointSchema>

export const StockHistorySchema = z.object({
  symbol: z.string(),
  values: z.array(OHLCVPointSchema),
})

export type StockHistory = z.infer<typeof StockHistorySchema>

// --- Internal helpers ---

function getApiKey(): string {
  const key = process.env.TWELVE_DATA_API_KEY
  if (!key) throw new Error('TWELVE_DATA_API_KEY is not configured')
  return key
}

async function checkRateLimit(): Promise<boolean> {
  const count = await getRequestCount(PROVIDER)
  return count >= RATE_LIMIT_THRESHOLD
}

async function fetchFromTwelveData<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${TWELVE_DATA_BASE}${endpoint}`)
  url.searchParams.set('apikey', getApiKey())
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  })

  if (response.status === 429) {
    throw new RateLimitError('Twelve Data rate limit exceeded')
  }

  if (!response.ok) {
    throw new Error(`Twelve Data API error: ${response.status} ${response.statusText}`)
  }

  await incrementRequestCount(PROVIDER)
  return response.json() as Promise<T>
}

// --- Public API ---

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export async function fetchPrice(symbol: string): Promise<StockPrice> {
  const cacheKey = `stock:price:${symbol.toUpperCase()}`

  // Check rate limit - serve cached if near limit
  const isNearLimit = await checkRateLimit()
  if (isNearLimit) {
    const stale = await getStaleFromSupabaseCache<StockPrice>(cacheKey)
    if (stale) return stale.data
  }

  try {
    return await getCached<StockPrice>(cacheKey, CacheTTL.REALTIME_PRICE, async () => {
      const raw = await fetchFromTwelveData<{
        symbol: string
        price: string
        timestamp: string
        currency: string
      }>('/price', { symbol: symbol.toUpperCase() })

      const parsed: StockPrice = {
        symbol: raw.symbol ?? symbol.toUpperCase(),
        price: parseFloat(raw.price),
        timestamp: raw.timestamp ?? new Date().toISOString(),
        currency: raw.currency,
      }

      return StockPriceSchema.parse(parsed)
    })
  } catch (error) {
    // Fallback to stale cache on any error
    const stale = await getStaleFromSupabaseCache<StockPrice>(cacheKey)
    if (stale) {
      console.error(`[stocks] Fetch failed for ${symbol}, using stale cache:`, error)
      return stale.data
    }
    throw error
  }
}

export async function fetchHistory(
  symbol: string,
  interval: string = '1day',
  outputsize: number = 30,
): Promise<StockHistory> {
  const cacheKey = `stock:history:${symbol.toUpperCase()}:${interval}:${outputsize}`

  const isNearLimit = await checkRateLimit()
  if (isNearLimit) {
    const stale = await getStaleFromSupabaseCache<StockHistory>(cacheKey)
    if (stale) return stale.data
  }

  try {
    return await getCached<StockHistory>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
      const raw = await fetchFromTwelveData<{
        meta: { symbol: string }
        values: Array<{
          datetime: string
          open: string
          high: string
          low: string
          close: string
          volume: string
        }>
      }>('/time_series', {
        symbol: symbol.toUpperCase(),
        interval,
        outputsize: outputsize.toString(),
      })

      const parsed: StockHistory = {
        symbol: raw.meta?.symbol ?? symbol.toUpperCase(),
        values: (raw.values ?? []).map((v) => ({
          datetime: v.datetime,
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close),
          volume: parseFloat(v.volume),
        })),
      }

      return StockHistorySchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<StockHistory>(cacheKey)
    if (stale) {
      console.error(`[stocks] History fetch failed for ${symbol}, using stale cache:`, error)
      return stale.data
    }
    throw error
  }
}

export async function isUsingCachedData(): Promise<boolean> {
  return checkRateLimit()
}
