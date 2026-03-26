import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { History } from 'lucide-react'
import { InfoTooltip } from '@/components/info-tooltip'
import { HALVING_HISTORY } from '@/lib/bitcoin/halving'
import type { HalvingEvent } from '@/lib/bitcoin/halving'

function formatPrice(price: number | null): string {
  if (price === null) return '—'
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function HalvingTimeline() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <CardTitle className="text-base">Halving History</CardTitle>
          <InfoTooltip text="A record of every past halving event showing the block height, date, miner reward, and Bitcoin price at the time. The percentage between events shows price growth from one halving to the next." />
        </div>
        <History className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

          {HALVING_HISTORY.map((event: HalvingEvent, index: number) => (
            <div key={event.number} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Timeline dot */}
              <div className="relative z-10 mt-1.5">
                <div className="h-[22px] w-[22px] flex items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/40">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Halving #{event.number}</span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    Block {event.blockHeight.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{event.date}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Reward: </span>
                    <span className="font-mono tabular-nums font-medium">{event.reward} BTC</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Price: </span>
                    <span className="font-mono tabular-nums font-medium text-orange-500">
                      {formatPrice(event.priceAtHalving)}
                    </span>
                  </div>
                </div>
                {index < HALVING_HISTORY.length - 1 &&
                  HALVING_HISTORY[index + 1]?.priceAtHalving &&
                  event.priceAtHalving && (
                    <div className="text-xs text-emerald-500 mt-1 font-mono tabular-nums">
                      +
                      {(
                        (HALVING_HISTORY[index + 1]!.priceAtHalving! / event.priceAtHalving - 1) *
                        100
                      ).toFixed(0)}
                      % to next halving
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
