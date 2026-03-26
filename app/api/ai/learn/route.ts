import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getLanguageModel, type AiProvider } from '@/lib/ai/provider'
import { createAiNdjsonStream, ndjsonResponse } from '@/lib/ai/stream'
import {
  buildLearningSystemPrompt,
  isFinancialTopic,
  NON_FINANCIAL_RESPONSE,
  type LearningContext,
} from '@/lib/ai/learning-assistant'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await req.json()

  // Check if the latest user message is financial
  const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user')

  if (lastUserMessage && !isFinancialTopic(lastUserMessage.content)) {
    // Return polite rejection as NDJSON
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'text', text: NON_FINANCIAL_RESPONSE }) + '\n'),
        )
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
    })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_provider, ai_model, country, base_currency')
    .eq('id', user.id)
    .single()

  const provider = (profile?.ai_provider ?? 'openai') as AiProvider
  const model = profile?.ai_model ?? 'gpt-4.1-mini'

  // Build a brief portfolio summary for context
  let portfolioSummary: string | null = null
  const { data: positions } = await supabase
    .from('positions')
    .select('symbol, asset_type')
    .eq('user_id', user.id)

  if (positions && positions.length > 0) {
    const symbols = positions.map((p) => p.symbol).join(', ')
    portfolioSummary = `Holds: ${symbols}`
  }

  const ctx: LearningContext = {
    country: profile?.country ?? 'CR',
    baseCurrency: profile?.base_currency ?? 'USD',
    portfolioSummary,
  }

  const systemPrompt = buildLearningSystemPrompt(ctx)

  try {
    const result = streamText({
      model: getLanguageModel(provider, model),
      system: systemPrompt,
      messages,
      maxOutputTokens: 600,
      temperature: 0.7,
    })

    return ndjsonResponse(createAiNdjsonStream(result.fullStream))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation failed'
    return new Response(msg, { status: 500 })
  }
}
