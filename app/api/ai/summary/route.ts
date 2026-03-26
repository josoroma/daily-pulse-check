import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { fetchCryptoFearGreed } from '@/lib/market/sentiment'
import { fetchLatestIndicator, fetchDXY, fetchInflationRate } from '@/lib/market/macro'
import { buildMarketSummaryPrompt, type MarketContext } from '@/lib/ai/market-summary'
import { getLanguageModel, type AiProvider } from '@/lib/ai/provider'
import { createAiNdjsonStream, ndjsonResponse } from '@/lib/ai/stream'
import type { MacroIndicator } from '@/lib/market/macro'

async function gatherMarketContext(): Promise<MarketContext> {
  const [voo, qqq, btc, sentiment, fedFunds, dgs10, unrate, dxy, inflation] =
    await Promise.allSettled([
      fetchPrice('VOO'),
      fetchPrice('QQQ'),
      fetchBitcoinPrice(),
      fetchCryptoFearGreed(),
      fetchLatestIndicator('FEDFUNDS'),
      fetchLatestIndicator('DGS10'),
      fetchLatestIndicator('UNRATE'),
      fetchDXY(),
      fetchInflationRate(),
    ])

  const indicators: MacroIndicator[] = []
  if (fedFunds.status === 'fulfilled') indicators.push(fedFunds.value)
  if (dgs10.status === 'fulfilled') indicators.push(dgs10.value)
  if (unrate.status === 'fulfilled') indicators.push(unrate.value)
  if (dxy.status === 'fulfilled') indicators.push(dxy.value)

  return {
    voo: voo.status === 'fulfilled' ? voo.value : null,
    qqq: qqq.status === 'fulfilled' ? qqq.value : null,
    btc: btc.status === 'fulfilled' ? btc.value : null,
    sentiment: sentiment.status === 'fulfilled' ? sentiment.value : null,
    indicators,
    inflationRate: inflation.status === 'fulfilled' ? inflation.value.rate : null,
  }
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_provider, ai_model')
    .eq('id', user.id)
    .single()

  const provider = (profile?.ai_provider ?? 'openai') as AiProvider
  const model = profile?.ai_model ?? 'gpt-4.1-mini'

  const ctx = await gatherMarketContext()
  const prompt = buildMarketSummaryPrompt(ctx)

  try {
    const result = streamText({
      model: getLanguageModel(provider, model),
      prompt,
      maxOutputTokens: 500,
      temperature: 0.7,
    })

    return ndjsonResponse(createAiNdjsonStream(result.fullStream))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation failed'
    return new Response(msg, { status: 500 })
  }
}
