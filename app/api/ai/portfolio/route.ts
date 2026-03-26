import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getLanguageModel, type AiProvider } from '@/lib/ai/provider'
import { createAiNdjsonStream, ndjsonResponse } from '@/lib/ai/stream'
import {
  buildPortfolioAnalysisSystem,
  type PortfolioContext,
  type PortfolioPosition,
} from '@/lib/ai/portfolio-analysis'
import { fetchPrice } from '@/lib/market/stocks'
import { fetchBitcoinPrice } from '@/lib/market/crypto'
import { calculateUnrealizedPnL } from '@/app/dashboard/portfolio/_utils'

async function buildPortfolioContext(userId: string): Promise<PortfolioContext> {
  const supabase = await createClient()

  const [profileResult, portfolioResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('risk_tolerance, country, base_currency')
      .eq('id', userId)
      .single(),
    supabase
      .from('portfolios')
      .select('id, target_allocations')
      .eq('user_id', userId)
      .limit(1)
      .single(),
  ])

  const profile = profileResult.data
  const portfolio = portfolioResult.data

  if (!portfolio) {
    return {
      positions: [],
      targetAllocations: null,
      riskTolerance: profile?.risk_tolerance ?? 'Medium',
      country: profile?.country ?? 'CR',
      baseCurrency: profile?.base_currency ?? 'USD',
      totalValue: 0,
    }
  }

  const { data: dbPositions } = await supabase
    .from('positions')
    .select('symbol, asset_type, quantity, average_buy_price')
    .eq('portfolio_id', portfolio.id)

  if (!dbPositions || dbPositions.length === 0) {
    return {
      positions: [],
      targetAllocations: portfolio.target_allocations as Record<string, number> | null,
      riskTolerance: profile?.risk_tolerance ?? 'Medium',
      country: profile?.country ?? 'CR',
      baseCurrency: profile?.base_currency ?? 'USD',
      totalValue: 0,
    }
  }

  // Fetch current prices
  const priceMap = new Map<string, number>()
  const pricePromises = dbPositions.map(async (pos) => {
    try {
      if (pos.asset_type === 'Crypto' && pos.symbol === 'BTC') {
        const btc = await fetchBitcoinPrice()
        priceMap.set('BTC', btc.priceUsd)
      } else {
        const stock = await fetchPrice(pos.symbol)
        priceMap.set(pos.symbol, stock.price)
      }
    } catch {
      // Use average_buy_price as fallback
      priceMap.set(pos.symbol, pos.average_buy_price)
    }
  })
  await Promise.allSettled(pricePromises)

  const positions: PortfolioPosition[] = dbPositions.map((pos) => {
    const currentPrice = priceMap.get(pos.symbol) ?? pos.average_buy_price
    const { currentValue, pnl, pnlPct } = calculateUnrealizedPnL(
      pos.quantity,
      pos.average_buy_price,
      currentPrice,
    )
    return {
      symbol: pos.symbol,
      asset_type: pos.asset_type,
      quantity: pos.quantity,
      average_buy_price: pos.average_buy_price,
      current_price: currentPrice,
      current_value: currentValue,
      unrealized_pnl: pnl,
      unrealized_pnl_pct: pnlPct,
    }
  })

  const totalValue = positions.reduce((sum, p) => sum + p.current_value, 0)

  return {
    positions,
    targetAllocations: portfolio.target_allocations as Record<string, number> | null,
    riskTolerance: profile?.risk_tolerance ?? 'Medium',
    country: profile?.country ?? 'CR',
    baseCurrency: profile?.base_currency ?? 'USD',
    totalValue,
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await req.json()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('ai_provider, ai_model')
    .eq('id', user.id)
    .single()

  const provider = (profileData?.ai_provider ?? 'openai') as AiProvider
  const model = profileData?.ai_model ?? 'gpt-4.1-mini'

  const ctx = await buildPortfolioContext(user.id)
  const systemPrompt = buildPortfolioAnalysisSystem(ctx)

  try {
    const result = streamText({
      model: getLanguageModel(provider, model),
      system: systemPrompt,
      messages,
      maxOutputTokens: 800,
      temperature: 0.7,
    })

    return ndjsonResponse(createAiNdjsonStream(result.fullStream))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation failed'
    return new Response(msg, { status: 500 })
  }
}
