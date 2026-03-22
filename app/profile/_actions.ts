'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { UpdateProfileSchema } from './_schema'
import { toISO } from '@/lib/date'

export async function updateProfile(formData: FormData) {
  const raw = {
    display_name: formData.get('display_name') || undefined,
    base_currency: formData.get('base_currency'),
    country: formData.get('country'),
    risk_tolerance: formData.get('risk_tolerance'),
  }

  const parsed = UpdateProfileSchema.safeParse(raw)
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
      ...parsed.data,
      updated_at: toISO(new Date()),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return data
}
