// Pure helpers for sentiment classification — safe for client and server imports

export const SentimentClassification = [
  'Extreme Fear',
  'Fear',
  'Neutral',
  'Greed',
  'Extreme Greed',
] as const

export function classifySentiment(value: number): (typeof SentimentClassification)[number] {
  if (value <= 20) return 'Extreme Fear'
  if (value <= 40) return 'Fear'
  if (value <= 60) return 'Neutral'
  if (value <= 80) return 'Greed'
  return 'Extreme Greed'
}

export function getSentimentColor(value: number): string {
  if (value <= 20) return 'text-rose-500'
  if (value <= 40) return 'text-amber-500'
  if (value <= 60) return 'text-zinc-400'
  if (value <= 80) return 'text-emerald-400'
  return 'text-emerald-500'
}

export function getSentimentBgColor(value: number): string {
  if (value <= 20) return 'bg-rose-500'
  if (value <= 40) return 'bg-amber-500'
  if (value <= 60) return 'bg-zinc-400'
  if (value <= 80) return 'bg-emerald-400'
  return 'bg-emerald-500'
}
