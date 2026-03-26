import { Blocks, Activity, HardDrive, Gauge } from 'lucide-react'
import { MetricCard } from './metric-card'
import { HashrateSparkline } from './hashrate-sparkline'
import { InfoTooltip } from '@/components/info-tooltip'
import type { BlockHeight, HashrateData, MempoolData, DifficultyData } from '@/lib/bitcoin/onchain'
import { formatDateShort } from '@/lib/date'

function formatHashrate(hashrate: number): string {
  const eh = hashrate / 1e18
  if (eh >= 1) return `${eh.toFixed(1)} EH/s`
  const ph = hashrate / 1e15
  return `${ph.toFixed(1)} PH/s`
}

function formatBytes(bytes: number): string {
  const mb = bytes / 1_000_000
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  const kb = bytes / 1000
  return `${kb.toFixed(1)} KB`
}

function formatDifficulty(difficulty: number): string {
  const t = difficulty / 1e12
  return `${t.toFixed(2)} T`
}

interface NetworkMetricsProps {
  blockHeight: BlockHeight | null
  hashrate: HashrateData | null
  mempool: MempoolData | null
  difficulty: DifficultyData | null
}

export function NetworkMetrics({
  blockHeight,
  hashrate,
  mempool,
  difficulty,
}: NetworkMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Block Height"
        value={blockHeight ? blockHeight.height.toLocaleString() : '—'}
        icon={Blocks}
        iconColor="text-orange-500"
        subValue={
          blockHeight ? `Updated ${formatDateShort(new Date(blockHeight.lastUpdated))}` : undefined
        }
        infoSlot={
          <InfoTooltip text="The latest confirmed block on the Bitcoin blockchain. A new block is mined roughly every 10 minutes. Higher numbers mean more transactions have been permanently recorded." />
        }
      />

      <MetricCard
        label="Network Hashrate"
        value={hashrate ? formatHashrate(hashrate.currentHashrate) : '—'}
        icon={Activity}
        iconColor="text-orange-500"
        subValue={hashrate ? `${hashrate.hashrates.length} data points (30d)` : undefined}
        chart={
          hashrate?.hashrates.length ? (
            <HashrateSparkline hashrates={hashrate.hashrates} />
          ) : undefined
        }
        infoSlot={
          <InfoTooltip text="Total computational power (hashes per second) that miners contribute to secure the network. A rising hashrate signals growing miner confidence and stronger network security. The sparkline shows the 30-day trend." />
        }
      />

      <MetricCard
        label="Mempool"
        value={mempool ? formatBytes(mempool.bytes) : '—'}
        icon={HardDrive}
        iconColor="text-orange-500"
        subValue={
          mempool
            ? `${mempool.size.toLocaleString()} txs · Fee: ${mempool.feeRates.economy}–${mempool.feeRates.fastest} sat/vB`
            : undefined
        }
        infoSlot={
          <InfoTooltip text="The memory pool holds unconfirmed transactions waiting to be included in the next block. A larger mempool (more bytes and txs) usually means higher fees and network congestion." />
        }
      />

      <MetricCard
        label="Difficulty"
        value={difficulty ? formatDifficulty(difficulty.currentDifficulty) : '—'}
        icon={Gauge}
        iconColor="text-orange-500"
        delta={
          difficulty
            ? {
                value: `${difficulty.changePercent.toFixed(2)}%`,
                positive: difficulty.changePercent >= 0,
                label: `est. ${formatDateShort(new Date(difficulty.estimatedRetargetDate))}`,
              }
            : undefined
        }
        infoSlot={
          <InfoTooltip text="Mining difficulty adjusts every ~2,016 blocks (~2 weeks) to keep the average block time at 10 minutes. The percentage shows the estimated change at the next adjustment." />
        }
      />
    </div>
  )
}
