import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { fetchCryptoFearGreed } from '@/lib/market/sentiment'
import { fetchLatestIndicator, fetchDXY, fetchInflationRate } from '@/lib/market/macro'
import { generateMarketSummary, type MarketContext } from '@/lib/ai/market-summary'
import type { AiProvider } from '@/lib/ai/provider'
import type { MacroIndicator } from '@/lib/market/macro'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all users with AI preferences
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, ai_provider, ai_model')

  if (profilesError || !profiles) {
    return NextResponse.json({ error: profilesError?.message ?? 'No profiles' }, { status: 500 })
  }

  const ctx = await gatherMarketContext()
  let generated = 0

  for (const profile of profiles) {
    // Skip if already has summary for today
    const { data: existing } = await supabase
      .from('ai_summaries')
      .select('id')
      .eq('user_id', profile.id)
      .eq('summary_date', today)
      .single()

    if (existing) continue

    try {
      const provider = (profile.ai_provider ?? 'openai') as AiProvider
      const model = profile.ai_model ?? 'gpt-4.1-nano'

      const content = await generateMarketSummary(provider, model, ctx)

      await supabase.from('ai_summaries').insert({
        user_id: profile.id,
        summary_date: today,
        content,
        model_used: `${provider}/${model}`,
      })

      generated++
    } catch {
      // Continue with next user on failure
    }
  }

  return NextResponse.json({ processed: profiles.length, generated })
}
