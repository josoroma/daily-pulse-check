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
