'use client'

import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { createClient } from '@/lib/supabase/client'
import { userAtom, profileAtom, type Profile } from '@/app/dashboard/_atoms'
import type { User } from '@supabase/supabase-js'

export const AuthProvider = ({
  initialUser,
  initialProfile,
  children,
}: {
  initialUser: User | null
  initialProfile: Profile | null
  children: React.ReactNode
}) => {
  const setUser = useSetAtom(userAtom)
  const setProfile = useSetAtom(profileAtom)

  useEffect(() => {
    setUser(initialUser)
    setProfile(initialProfile)
  }, [initialUser, initialProfile, setUser, setProfile])

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  return <>{children}</>
}
