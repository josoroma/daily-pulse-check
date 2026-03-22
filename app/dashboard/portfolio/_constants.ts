// Mapping from position symbols to CoinGecko coin IDs
export const CRYPTO_COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
}

// Asset colors for charts (HSL values matching the design system)
export const ASSET_COLORS: Record<string, string> = {
  VOO: 'hsl(220, 70%, 55%)',
  QQQ: 'hsl(280, 65%, 60%)',
  BTC: 'hsl(35, 95%, 55%)',
  Cash: 'hsl(160, 40%, 50%)',
}

// Tailwind classes for each asset
export const ASSET_COLOR_CLASSES: Record<string, { text: string; bg: string; solid: string }> = {
  VOO: { text: 'text-blue-500', bg: 'bg-blue-500/10', solid: 'bg-blue-500' },
  QQQ: { text: 'text-purple-500', bg: 'bg-purple-500/10', solid: 'bg-purple-500' },
  BTC: { text: 'text-orange-500', bg: 'bg-orange-500/10', solid: 'bg-orange-500' },
  ETH: { text: 'text-sky-500', bg: 'bg-sky-500/10', solid: 'bg-sky-500' },
  Cash: { text: 'text-teal-500', bg: 'bg-teal-500/10', solid: 'bg-teal-500' },
}

export const DEFAULT_ASSET_COLOR = {
  text: 'text-zinc-400',
  bg: 'bg-zinc-400/10',
  solid: 'bg-zinc-400',
}

export const TIME_RANGES = ['1W', '1M', '3M', '6M', '1Y', 'ALL'] as const
export type TimeRange = (typeof TIME_RANGES)[number]
