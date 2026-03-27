'use client'

import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { profileAtom } from './_atoms'
import { formatCurrency as formatCurrencyUtil } from '@/lib/currency'

type FormatOptions = {
  compact?: boolean
  showConversion?: boolean
}

export const useCurrency = () => {
  const profile = useAtomValue(profileAtom)
  const baseCurrency = (profile?.base_currency ?? 'USD') as 'USD' | 'CRC'
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  useEffect(() => {
    if (baseCurrency === 'CRC') {
      fetch('/api/market/exchange-rate')
        .then((res) => res.json())
        .then((data: { rate?: number }) => {
          if (data.rate) setExchangeRate(data.rate)
        })
        .catch(() => setExchangeRate(null))
    }
  }, [baseCurrency])

  const format = useCallback(
    (amount: number, options: FormatOptions = {}) =>
      formatCurrencyUtil(amount, baseCurrency, {
        ...options,
        exchangeRate: exchangeRate ?? undefined,
      }),
    [baseCurrency, exchangeRate],
  )

  return { baseCurrency, exchangeRate, format }
}
