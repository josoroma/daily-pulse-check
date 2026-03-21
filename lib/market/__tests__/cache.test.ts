import { describe, it, expect, beforeEach } from 'vitest'
import { getFromMemoryCache, setInMemoryCache, clearMemoryCache } from '@/lib/market/cache'

describe('cache: in-memory cache', () => {
  beforeEach(() => {
    clearMemoryCache()
  })

  it('returns null for missing key', () => {
    expect(getFromMemoryCache('nonexistent')).toBeNull()
  })

  it('stores and retrieves a value', () => {
    setInMemoryCache('test-key', { price: 100 }, 300)
    const result = getFromMemoryCache<{ price: number }>('test-key')
    expect(result).toEqual({ price: 100 })
  })

  it('returns null for expired entries', () => {
    // TTL of 0 seconds means immediately expired
    setInMemoryCache('expired', { data: true }, 0)
    // Small delay to ensure expiry
    const result = getFromMemoryCache('expired')
    expect(result).toBeNull()
  })

  it('handles different data types', () => {
    setInMemoryCache('string', 'hello', 300)
    setInMemoryCache('number', 42, 300)
    setInMemoryCache('array', [1, 2, 3], 300)

    expect(getFromMemoryCache('string')).toBe('hello')
    expect(getFromMemoryCache('number')).toBe(42)
    expect(getFromMemoryCache('array')).toEqual([1, 2, 3])
  })

  it('clears all cache entries', () => {
    setInMemoryCache('a', 1, 300)
    setInMemoryCache('b', 2, 300)
    clearMemoryCache()

    expect(getFromMemoryCache('a')).toBeNull()
    expect(getFromMemoryCache('b')).toBeNull()
  })

  it('overwrites existing entries', () => {
    setInMemoryCache('key', 'old', 300)
    setInMemoryCache('key', 'new', 300)

    expect(getFromMemoryCache('key')).toBe('new')
  })
})
