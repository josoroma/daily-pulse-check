import type { TextStreamPart, ToolSet } from 'ai'

type StreamEvent = { type: 'reasoning' | 'text' | 'error'; text: string }

/**
 * Streams AI output as NDJSON, extracting `<think>` tags into reasoning events.
 *
 * Handles two scenarios:
 * 1. Provider sends native `reasoning-delta` events (e.g. OpenAI o-series)
 * 2. Model embeds thinking in `<think>...</think>` tags within text (e.g. Ollama qwen3)
 */
export function createAiNdjsonStream(
  fullStream: AsyncIterable<TextStreamPart<ToolSet>>,
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      let inThink = false
      let sawNativeReasoning = false

      const emit = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      try {
        for await (const part of fullStream) {
          if (part.type === 'reasoning-delta') {
            sawNativeReasoning = true
            emit({ type: 'reasoning', text: part.text })
          } else if (part.type === 'text-delta') {
            // If provider already sends native reasoning, pass text through
            if (sawNativeReasoning) {
              emit({ type: 'text', text: part.text })
              continue
            }

            // Parse <think>...</think> tags from text stream (Ollama fallback)
            let chunk = part.text

            while (chunk.length > 0) {
              if (!inThink) {
                const startIdx = chunk.indexOf('<think>')
                if (startIdx !== -1) {
                  if (startIdx > 0) {
                    emit({ type: 'text', text: chunk.slice(0, startIdx) })
                  }
                  inThink = true
                  chunk = chunk.slice(startIdx + 7)
                } else {
                  emit({ type: 'text', text: chunk })
                  chunk = ''
                }
              } else {
                const endIdx = chunk.indexOf('</think>')
                if (endIdx !== -1) {
                  if (endIdx > 0) {
                    emit({ type: 'reasoning', text: chunk.slice(0, endIdx) })
                  }
                  inThink = false
                  chunk = chunk.slice(endIdx + 8)
                } else {
                  emit({ type: 'reasoning', text: chunk })
                  chunk = ''
                }
              }
            }
          }
        }
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown AI error'
        emit({ type: 'error', text: msg })
        controller.close()
      }
    },
  })
}

export function ndjsonResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}
