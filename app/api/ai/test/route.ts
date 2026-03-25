import { streamText } from 'ai'
import { getLanguageModel, type AiProvider } from '@/lib/ai/provider'

export async function POST(req: Request) {
  const { provider, model } = (await req.json()) as {
    provider: string
    model: string
  }

  try {
    const result = streamText({
      model: getLanguageModel(provider as AiProvider, model),
      prompt: 'Respond with exactly: "Connection successful. Model is running."',
      maxOutputTokens: 100,
      temperature: 0,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          controller.enqueue(encoder.encode(`[Error: ${msg}]`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection test failed'
    return new Response(msg, { status: 500 })
  }
}
