'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { AiModelSchema } from './_schema'
import { toISO } from '@/lib/date'

export async function updateAiModel(formData: FormData) {
  const raw = {
    ai_provider: formData.get('ai_provider'),
    ai_model: formData.get('ai_model'),
  }

  const parsed = AiModelSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ai_provider: parsed.data.ai_provider,
      ai_model: parsed.data.ai_model,
      updated_at: toISO(new Date()),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function getAiPreferences() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('ai_provider, ai_model')
    .eq('id', user.id)
    .single()

  return data
}
