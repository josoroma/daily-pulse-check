type BaseCurrency = 'USD' | 'CRC'

type FormatOptions = {
  compact?: boolean
  showConversion?: boolean
  exchangeRate?: number
}

const USD_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

const USD_COMPACT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
}

const CRC_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'CRC',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}

const CRC_COMPACT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'CRC',
  notation: 'compact',
  maximumFractionDigits: 0,
}

export const formatCurrency = (
  amount: number,
  baseCurrency: BaseCurrency = 'USD',
  options: FormatOptions = {},
): string => {
  const { compact = false } = options

  if (baseCurrency === 'CRC' && options.exchangeRate) {
    const crcAmount = amount * options.exchangeRate
    const formatted = crcAmount.toLocaleString('es-CR', compact ? CRC_COMPACT : CRC_FORMAT)

    if (options.showConversion) {
      const usdFormatted = amount.toLocaleString('en-US', compact ? USD_COMPACT : USD_FORMAT)
      return `${formatted} (${usdFormatted})`
    }

    return formatted
  }

  return amount.toLocaleString('en-US', compact ? USD_COMPACT : USD_FORMAT)
}

export const formatPercent = (value: number, decimals = 2): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
