import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { fetchCryptoFearGreed } from '@/lib/market/sentiment'
import { fetchLatestIndicator, fetchDXY, fetchInflationRate } from '@/lib/market/macro'
import { buildMarketSummaryPrompt, type MarketContext } from '@/lib/ai/market-summary'
import { getLanguageModel, type AiProvider } from '@/lib/ai/provider'
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
  const model = profile?.ai_model ?? 'gpt-4.1-nano'

  const ctx = await gatherMarketContext()
  const prompt = buildMarketSummaryPrompt(ctx)

  try {
    const result = streamText({
      model: getLanguageModel(provider, model),
      prompt,
      maxOutputTokens: 500,
      temperature: 0.7,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === 'reasoning-delta') {
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: 'reasoning', text: part.text }) + '\n'),
              )
            } else if (part.type === 'text-delta') {
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: 'text', text: part.text }) + '\n'),
              )
            }
          }
          controller.close()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown AI error'
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', text: msg }) + '\n'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation failed'
    return new Response(msg, { status: 500 })
  }
}
