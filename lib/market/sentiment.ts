import { z } from 'zod'
import { getCached, getStaleFromSupabaseCache, CacheTTL } from '@/lib/market/cache'
import { SentimentClassification, classifySentiment } from '@/lib/market/sentiment-shared'

// Re-export pure helpers so existing consumers don't break
export {
  SentimentClassification,
  classifySentiment,
  getSentimentColor,
  getSentimentBgColor,
} from '@/lib/market/sentiment-shared'

const ALTERNATIVE_ME_BASE = 'https://api.alternative.me/fng'

// --- Response Schemas ---

export const FearGreedSchema = z.object({
  value: z.number().min(0).max(100),
  classification: z.enum(SentimentClassification),
  timestamp: z.string(),
})

export type FearGreed = z.infer<typeof FearGreedSchema>

export const FearGreedHistorySchema = z.object({
  data: z.array(FearGreedSchema),
})

export type FearGreedHistory = z.infer<typeof FearGreedHistorySchema>

// --- Internal helpers ---

interface AlternativeMeResponse {
  data: Array<{
    value: string
    value_classification: string
    timestamp: string
  }>
}

async function fetchFromAlternativeMe(limit: number = 1): Promise<AlternativeMeResponse> {
  const url = new URL(ALTERNATIVE_ME_BASE)
  url.searchParams.set('limit', limit.toString())
  url.searchParams.set('format', 'json')

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`Alternative.me API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<AlternativeMeResponse>
}

function parseEntry(entry: AlternativeMeResponse['data'][0]): FearGreed {
  const value = parseInt(entry.value, 10)
  return {
    value,
    classification: classifySentiment(value),
    timestamp: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString(),
  }
}

// --- Public API ---

export async function fetchCryptoFearGreed(): Promise<FearGreed> {
  const cacheKey = 'sentiment:crypto:feargreed'

  try {
    return await getCached<FearGreed>(cacheKey, CacheTTL.SENTIMENT, async () => {
      const raw = await fetchFromAlternativeMe(1)

      const entry = raw.data?.[0]
      if (!entry) {
        throw new Error('No Fear & Greed data returned')
      }

      const parsed = parseEntry(entry)
      return FearGreedSchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<FearGreed>(cacheKey)
    if (stale) {
      console.error('[sentiment] Fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}

export async function fetchCryptoFearGreedHistory(days: number = 30): Promise<FearGreedHistory> {
  const cacheKey = `sentiment:crypto:feargreed:history:${days}`

  try {
    return await getCached<FearGreedHistory>(cacheKey, CacheTTL.SENTIMENT, async () => {
      const raw = await fetchFromAlternativeMe(days)

      const parsed: FearGreedHistory = {
        data: (raw.data ?? []).map(parseEntry),
      }

      return FearGreedHistorySchema.parse(parsed)
    })
  } catch (error) {
    const stale = await getStaleFromSupabaseCache<FearGreedHistory>(cacheKey)
    if (stale) {
      console.error('[sentiment] History fetch failed, using stale cache:', error)
      return stale.data
    }
    throw error
  }
}
