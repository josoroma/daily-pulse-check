import { generateText, streamText } from 'ai'
import { getLanguageModel, type AiProvider } from '@/lib/ai/provider'
import type { StockPrice } from '@/lib/market/stocks'
import type { BitcoinPrice } from '@/lib/market/crypto'
import type { FearGreed } from '@/lib/market/sentiment'
import type { MacroIndicator } from '@/lib/market/macro'

export type MarketContext = {
  voo: StockPrice | null
  qqq: StockPrice | null
  btc: BitcoinPrice | null
  sentiment: FearGreed | null
  indicators: MacroIndicator[]
  inflationRate: number | null
}

export function buildMarketSummaryPrompt(ctx: MarketContext): string {
  const lines: string[] = []

  lines.push('You are a concise market analyst for a personal finance dashboard.')
  lines.push('Generate a brief daily market summary (3–5 paragraphs) covering:')
  lines.push('1. S&P 500 (VOO) and Nasdaq (QQQ) trends')
  lines.push('2. Bitcoin price action')
  lines.push('3. Fear & Greed sentiment')
  lines.push('4. Key macro indicators')
  lines.push('5. One actionable takeaway for a long-term DCA investor')
  lines.push('')
  lines.push('Use plain language. No markdown headers. No disclaimers.')
  lines.push('')
  lines.push('--- CURRENT MARKET DATA ---')

  if (ctx.voo) {
    lines.push(`VOO (S&P 500 ETF): $${ctx.voo.price.toFixed(2)}`)
  }
  if (ctx.qqq) {
    lines.push(`QQQ (Nasdaq 100 ETF): $${ctx.qqq.price.toFixed(2)}`)
  }
  if (ctx.btc) {
    const dir = ctx.btc.percentChange24h >= 0 ? '+' : ''
    lines.push(
      `Bitcoin: $${ctx.btc.priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${dir}${ctx.btc.percentChange24h.toFixed(1)}% 24h)`,
    )
  }
  if (ctx.sentiment) {
    lines.push(
      `Crypto Fear & Greed Index: ${ctx.sentiment.value}/100 (${ctx.sentiment.classification})`,
    )
  }
  for (const ind of ctx.indicators) {
    lines.push(`${ind.name}: ${ind.value}${ind.unit}`)
  }
  if (ctx.inflationRate !== null) {
    lines.push(`YoY Inflation Rate: ${ctx.inflationRate.toFixed(1)}%`)
  }

  return lines.join('\n')
}

export async function generateMarketSummary(
  provider: AiProvider,
  model: string,
  ctx: MarketContext,
) {
  const languageModel = getLanguageModel(provider, model)
  const prompt = buildMarketSummaryPrompt(ctx)

  const { text } = await generateText({
    model: languageModel,
    prompt,
    maxOutputTokens: 500,
    temperature: 0.7,
  })

  return text
}

export function streamMarketSummary(provider: AiProvider, model: string, ctx: MarketContext) {
  const languageModel = getLanguageModel(provider, model)
  const prompt = buildMarketSummaryPrompt(ctx)

  return streamText({
    model: languageModel,
    prompt,
    maxOutputTokens: 500,
    temperature: 0.7,
  })
}
