import { createClient } from '@/lib/supabase/server'
import { todayCR } from '@/lib/date'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

// In-memory cache (per-process, fast)
const memoryCache = new Map<string, CacheEntry<unknown>>()

export const CacheTTL = {
  REALTIME_PRICE: 5 * 60, // 5 minutes
  DAILY_HISTORY: 24 * 60 * 60, // 24 hours
  SENTIMENT: 60 * 60, // 1 hour
  MACRO: 24 * 60 * 60, // 24 hours
} as const

export function getFromMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

export function setInMemoryCache<T>(key: string, data: T, ttlSeconds: number): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

export async function getFromSupabaseCache<T>(
  key: string,
): Promise<{ data: T; fetchedAt: string } | null> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('market_cache')
    .select('data, fetched_at, ttl_seconds')
    .eq('key', key)
    .single()

  if (!row) return null

  const fetchedAt = new Date(row.fetched_at).getTime()
  const expiresAt = fetchedAt + row.ttl_seconds * 1000

  if (Date.now() > expiresAt) return null

  return { data: row.data as T, fetchedAt: row.fetched_at }
}

export async function setInSupabaseCache<T>(
  key: string,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('market_cache').upsert(
    {
      key,
      // Supabase JSONB column expects Record<string, unknown> but T is generic cached data.
      // The cast is safe because data is always a JSON-serializable object from our Zod schemas.
      data: data as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
      ttl_seconds: ttlSeconds,
    },
    { onConflict: 'key' },
  )
}

export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // 1. Check in-memory cache
  const memResult = getFromMemoryCache<T>(key)
  if (memResult !== null) return memResult

  // 2. Check Supabase cache
  const dbResult = await getFromSupabaseCache<T>(key)
  if (dbResult !== null) {
    // Populate memory cache with remaining TTL
    const fetchedAt = new Date(dbResult.fetchedAt).getTime()
    const remainingTtl = Math.max(0, ttlSeconds - (Date.now() - fetchedAt) / 1000)
    if (remainingTtl > 0) {
      setInMemoryCache(key, dbResult.data, remainingTtl)
    }
    return dbResult.data
  }

  // 3. Fetch fresh data
  const freshData = await fetcher()

  // 4. Store in both caches
  setInMemoryCache(key, freshData, ttlSeconds)
  await setInSupabaseCache(key, freshData, ttlSeconds)

  return freshData
}

// Fallback: return stale data from Supabase even if expired
export async function getStaleFromSupabaseCache<T>(
  key: string,
): Promise<{ data: T; fetchedAt: string } | null> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('market_cache')
    .select('data, fetched_at')
    .eq('key', key)
    .single()

  if (!row) return null
  return { data: row.data as T, fetchedAt: row.fetched_at }
}

// Request counting for rate-limited APIs
export async function incrementRequestCount(provider: string): Promise<number> {
  const supabase = await createClient()
  const today = todayCR()

  // Try to get existing count
  const { data: existing } = await supabase
    .from('api_request_counts')
    .select('request_count')
    .eq('provider', provider)
    .eq('date_key', today)
    .single()

  const newCount = (existing?.request_count ?? 0) + 1

  await supabase.from('api_request_counts').upsert(
    {
      provider,
      date_key: today,
      request_count: newCount,
    },
    { onConflict: 'provider,date_key' },
  )

  return newCount
}

export async function getRequestCount(provider: string): Promise<number> {
  const supabase = await createClient()
  const today = todayCR()

  const { data } = await supabase
    .from('api_request_counts')
    .select('request_count')
    .eq('provider', provider)
    .eq('date_key', today)
    .single()

  return data?.request_count ?? 0
}

export function clearMemoryCache(): void {
  memoryCache.clear()
}
