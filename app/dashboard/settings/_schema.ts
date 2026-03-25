import { z } from 'zod'
import { AI_PROVIDERS, MODEL_REGISTRY, type AiProvider } from '@/lib/ai/provider'

export const AiModelSchema = z
  .object({
    ai_provider: z.enum(AI_PROVIDERS, {
      message: 'Provider must be openai or ollama',
    }),
    ai_model: z.string().min(1, 'Model is required'),
  })
  .refine((data) => MODEL_REGISTRY[data.ai_provider as AiProvider].includes(data.ai_model), {
    message: 'Invalid model for the selected provider',
    path: ['ai_model'],
  })

export type AiModel = z.infer<typeof AiModelSchema>
