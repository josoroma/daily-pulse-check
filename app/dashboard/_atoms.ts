import { atom } from 'jotai'
import type { User } from '@supabase/supabase-js'

export type Profile = {
  id: string
  display_name: string | null
  base_currency: string
  country: string
  risk_tolerance: string
}

export const userAtom = atom<User | null>(null)
export const profileAtom = atom<Profile | null>(null)
