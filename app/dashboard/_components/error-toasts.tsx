'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface ErrorToastsProps {
  errors: string[]
}

export function ErrorToasts({ errors }: ErrorToastsProps) {
  const shownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    for (const message of errors) {
      if (!shownRef.current.has(message)) {
        shownRef.current.add(message)
        toast.error(message)
      }
    }
  }, [errors])

  return null
}
