'use client'

import { useCallback } from 'react'
import { useAutoRefresh } from '../_hooks'
import { NetworkMetrics } from './network-metrics'
import type { BlockHeight, HashrateData, MempoolData, DifficultyData } from '@/lib/bitcoin/onchain'

interface OnchainData {
  blockHeight: BlockHeight | null
  hashrate: HashrateData | null
  mempool: MempoolData | null
  difficulty: DifficultyData | null
}

interface BitcoinMetricsLiveProps {
  initialData: OnchainData
}

export function BitcoinMetricsLive({ initialData }: BitcoinMetricsLiveProps) {
  const fetcher = useCallback(async () => {
    const res = await fetch('/api/market/bitcoin/onchain')
    if (!res.ok) throw new Error('Failed to fetch on-chain metrics')
    return res.json() as Promise<OnchainData>
  }, [])

  const { data } = useAutoRefresh(fetcher, { intervalMs: 60_000 })

  const current = data ?? initialData

  return (
    <NetworkMetrics
      blockHeight={current.blockHeight}
      hashrate={current.hashrate}
      mempool={current.mempool}
      difficulty={current.difficulty}
    />
  )
}
