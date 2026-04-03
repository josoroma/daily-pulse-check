import { z } from 'zod'
import { getCached, getStaleFromSupabaseCache, CacheTTL } from '@/lib/market/cache'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

// --- Response Schemas ---

export const BitcoinPriceSchema = z.object({
  priceUsd: z.number().positive(),
  priceCrc: z.number().positive().nullable(),
  marketCap: z.number().positive(),
  volume24h: z.number().nonnegative(),
  percentChange24h: z.number(),
  lastUpdated: z.string(),
})

export type BitcoinPrice = z.infer<typeof BitcoinPriceSchema>

export const PricePointSchema = z.object({
  timestamp: z.number(),
  price: z.number(),
})

export type PricePoint = z.infer<typeof PricePointSchema>

export const BitcoinHistorySchema = z.object({
  prices: z.array(PricePointSchema),
})

export type BitcoinHistory = z.infer<typeof BitcoinHistorySchema>

// --- Internal helpers ---

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey
  }
  return headers
}

async function fetchFromCoinGecko<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${COINGECKO_BASE}${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    headers: getHeaders(),
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

// --- Public API ---

export async function fetchBitcoinPrice(): Promise<BitcoinPrice> {
  const cacheKey = 'crypto:bitcoin:price'

  try {
    return await getCached<BitcoinPrice>(cacheKey, CacheTTL.REALTIME_PRICE, async () => {
      const raw = await fetchFromCoinGecko<
        Array<{
          current_price: number
          market_cap: number
          total_volume: number
          price_change_percentage_24h: number
          last_updated: string
        }>
      >('/coins/markets', {
        vs_currency: 'usd',
        ids: 'bitcoin',
        order: 'market_cap_desc',
        per_page: '1',
        page: '1',
        sparkline: 'false',
      })

      const btc = raw[0]
      if (!btc) throw new Error('No Bitcoin data returned from CoinGecko')

      // Attempt CRC conversion
      let priceCrc: number | null = null
      try {
        priceCrc = await fetchUsdToCrc(btc.current_price)
      } catch {
        // CRC conversion is best-effort
        console.warn('[crypto] CRC conversion failed, continuing with USD only')
      }

      const parsed: BitcoinPrice = {
        priceUsd: btc.current_price,
        priceCrc,
        marketCap: btc.market_cap,
        volume24h: btc.total_volume,
        percentChange24h: btc.price_change_percentage_24h,
        lastUpdated: btc.last_updated,
      }

      return BitcoinPriceSchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<BitcoinPrice>(cacheKey)
    if (stale) {
      console.error('[crypto] Bitcoin price fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

export async function fetchBitcoinHistory(days: number = 90): Promise<BitcoinHistory> {
  const cacheKey = `crypto:bitcoin:history:${days}`

  try {
    return await getCached<BitcoinHistory>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
      const raw = await fetchFromCoinGecko<{
        prices: Array<[number, number]>
      }>('/coins/bitcoin/market_chart', {
        vs_currency: 'usd',
        days: days.toString(),
      })

      const parsed: BitcoinHistory = {
        prices: (raw.prices ?? []).map(([timestamp, price]) => ({
          timestamp,
          price,
        })),
      }

      return BitcoinHistorySchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<BitcoinHistory>(cacheKey)
    if (stale) {
      console.error('[crypto] Bitcoin history fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

// --- CRC Exchange Rate ---

const CRC_CACHE_KEY = 'exchange:usd_crc'

export async function fetchUsdCrcRate(): Promise<number> {
  return getCached<number>(CRC_CACHE_KEY, CacheTTL.DAILY_HISTORY, async () => {
    // Use CoinGecko's BTC/CRC to derive USD/CRC rate
    const [usdData, crcData] = await Promise.all([
      fetchFromCoinGecko<{ bitcoin: { usd: number } }>('/simple/price', {
        ids: 'bitcoin',
        vs_currencies: 'usd',
      }),
      fetchFromCoinGecko<{ bitcoin: { crc: number } }>('/simple/price', {
        ids: 'bitcoin',
        vs_currencies: 'crc',
      }),
    ])

    const usdPrice = usdData.bitcoin.usd
    const crcPrice = crcData.bitcoin.crc

    if (!usdPrice || !crcPrice) {
      throw new Error('Could not derive USD/CRC rate from CoinGecko')
    }

    return crcPrice / usdPrice
  })
}

export async function fetchUsdToCrc(usdAmount: number): Promise<number> {
  const rate = await fetchUsdCrcRate()
  return usdAmount * rate
}

export function convertUsdToCrc(usdAmount: number, rate: number): number {
  return usdAmount * rate
}

// --- Historical Price (Cost Basis) ---

export const CoinHistoricalPriceSchema = z.object({
  coinId: z.string(),
  date: z.string(),
  priceUsd: z.number().nonnegative(),
})

export type CoinHistoricalPrice = z.infer<typeof CoinHistoricalPriceSchema>

/**
 * Fetch the price of a coin on a specific date.
 * Uses `/coins/{id}/history` for cost basis lookups.
 * @param coinId CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
 * @param date Date in ISO format yyyy-MM-dd (e.g., '2026-01-15')
 */
export async function fetchCoinHistoricalPrice(
  coinId: string,
  date: string,
): Promise<CoinHistoricalPrice> {
  // Convert yyyy-MM-dd to dd-MM-yyyy for CoinGecko
  const cacheKey = `crypto:${coinId}:history:${date}`

  return getCached<CoinHistoricalPrice>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
    const cgDate = formatDateForCoinGecko(date)

    const raw = await fetchFromCoinGecko<{
      id: string
      market_data?: {
        current_price?: { usd?: number }
      }
    }>(`/coins/${encodeURIComponent(coinId)}/history`, {
      date: cgDate,
      localization: 'false',
    })

    const priceUsd = raw.market_data?.current_price?.usd
    if (priceUsd === undefined) {
      throw new Error(`No price data for ${coinId} on ${date}`)
    }

    return CoinHistoricalPriceSchema.parse({
      coinId,
      date,
      priceUsd,
    })
  })
}

// --- Market Chart (Performance) ---

export const CoinMarketChartSchema = z.object({
  coinId: z.string(),
  prices: z.array(PricePointSchema),
  marketCaps: z.array(PricePointSchema),
  volumes: z.array(PricePointSchema),
})

export type CoinMarketChart = z.infer<typeof CoinMarketChartSchema>

/**
 * Fetch historical market chart data for a coin.
 * Uses `/coins/{id}/market_chart` for performance charts.
 * @param coinId CoinGecko coin ID (e.g., 'bitcoin')
 * @param days Number of days of history (1, 7, 14, 30, 90, 180, 365, or 'max')
 * @param interval Data interval: 'daily' for consistent points, omit for auto
 */
export async function fetchCoinMarketChart(
  coinId: string,
  days: number | 'max' = 90,
  interval?: 'daily',
): Promise<CoinMarketChart> {
  const cacheKey = `crypto:${coinId}:market_chart:${days}:${interval ?? 'auto'}`

  return getCached<CoinMarketChart>(cacheKey, CacheTTL.DAILY_HISTORY, async () => {
    const params: Record<string, string> = {
      vs_currency: 'usd',
      days: days.toString(),
    }
    if (interval) params.interval = interval

    const raw = await fetchFromCoinGecko<{
      prices: Array<[number, number]>
      market_caps: Array<[number, number]>
      total_volumes: Array<[number, number]>
    }>(`/coins/${encodeURIComponent(coinId)}/market_chart`, params)

    return CoinMarketChartSchema.parse({
      coinId,
      prices: (raw.prices ?? []).map(([timestamp, price]) => ({ timestamp, price })),
      marketCaps: (raw.market_caps ?? []).map(([timestamp, price]) => ({ timestamp, price })),
      volumes: (raw.total_volumes ?? []).map(([timestamp, price]) => ({ timestamp, price })),
    })
  })
}

// --- Batch Market Data with Sparklines ---

export const CoinMarketDataSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: z.string(),
  currentPrice: z.number(),
  marketCap: z.number(),
  marketCapRank: z.number().nullable(),
  high24h: z.number().nullable(),
  low24h: z.number().nullable(),
  priceChange24h: z.number().nullable(),
  priceChangePercentage24h: z.number().nullable(),
  priceChangePercentage7d: z.number().nullable(),
  priceChangePercentage30d: z.number().nullable(),
  sparkline7d: z.array(z.number()).nullable(),
})

export type CoinMarketData = z.infer<typeof CoinMarketDataSchema>

/**
 * Fetch bulk market data for multiple coins with sparklines and multi-timeframe changes.
 * Uses `/coins/markets` for portfolio dashboards.
 * @param coinIds Array of CoinGecko coin IDs (e.g., ['bitcoin', 'ethereum'])
 */
export async function fetchCoinsMarkets(coinIds: string[]): Promise<CoinMarketData[]> {
  if (coinIds.length === 0) return []

  const sortedIds = [...coinIds].sort().join(',')
  const cacheKey = `crypto:markets:${sortedIds}`

  return getCached<CoinMarketData[]>(cacheKey, CacheTTL.REALTIME_PRICE, async () => {
    const raw = await fetchFromCoinGecko<
      Array<{
        id: string
        symbol: string
        name: string
        image: string
        current_price: number
        market_cap: number
        market_cap_rank: number | null
        high_24h: number | null
        low_24h: number | null
        price_change_24h: number | null
        price_change_percentage_24h: number | null
        price_change_percentage_7d_in_currency: number | null
        price_change_percentage_30d_in_currency: number | null
        sparkline_in_7d?: { price: number[] }
      }>
    >('/coins/markets', {
      vs_currency: 'usd',
      ids: coinIds.join(','),
      order: 'market_cap_desc',
      per_page: '250',
      page: '1',
      sparkline: 'true',
      price_change_percentage: '7d,30d',
    })

    return raw.map((coin) =>
      CoinMarketDataSchema.parse({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        priceChange24h: coin.price_change_24h,
        priceChangePercentage24h: coin.price_change_percentage_24h,
        priceChangePercentage7d: coin.price_change_percentage_7d_in_currency,
        priceChangePercentage30d: coin.price_change_percentage_30d_in_currency,
        sparkline7d: coin.sparkline_in_7d?.price ?? null,
      }),
    )
  })
}

// --- Pure helpers (testable) ---

/**
 * Convert ISO date (yyyy-MM-dd) to CoinGecko format (dd-MM-yyyy).
 */
export function formatDateForCoinGecko(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) throw new Error(`Invalid ISO date: ${isoDate}`)
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}
