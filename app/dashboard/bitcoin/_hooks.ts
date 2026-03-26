'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface UseAutoRefreshOptions {
  intervalMs: number
  enabled?: boolean
}

export function useAutoRefresh<T>(
  fetcher: () => Promise<T>,
  { intervalMs, enabled = true }: UseAutoRefreshOptions,
) {
  const [data, setData] = useState<T | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await fetcher()
      setData(result)
    } catch (error) {
      console.error('[auto-refresh] Fetch failed:', error)
      const message = error instanceof Error ? error.message : 'Auto-refresh failed'
      toast.error(message)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetcher])

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs, enabled])

  return { data, isRefreshing, refresh }
}
