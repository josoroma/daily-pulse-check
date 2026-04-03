import { describe, it, expect } from 'vitest'
import {
  BccrObservationSchema,
  BccrIndicatorSchema,
  ExchangeRatePointSchema,
  SddeResponseSchema,
  SddeSeriesItemSchema,
  BCCR_INDICATORS,
  formatDateSdde,
  normalizeDate,
  extractObservations,
} from '@/lib/market/bccr'

describe('bccr: BccrObservationSchema', () => {
  it('validates a valid observation', () => {
    const valid = { date: '2026-03-15', value: 512.5 }
    const result = BccrObservationSchema.parse(valid)
    expect(result.date).toBe('2026-03-15')
    expect(result.value).toBe(512.5)
  })

  it('rejects missing date', () => {
    expect(() => BccrObservationSchema.parse({ value: 512.5 })).toThrow()
  })

  it('rejects missing value', () => {
    expect(() => BccrObservationSchema.parse({ date: '2026-03-15' })).toThrow()
  })
})

describe('bccr: SddeResponseSchema', () => {
  it('validates a real SDDE API response', () => {
    const data = {
      estado: true,
      mensaje: 'Consulta exitosa',
      datos: [
        {
          codigoIndicador: '318',
          nombreIndicador: 'Tipo cambio venta',
          series: [
            { fecha: '2026-03-27', valorDatoPorPeriodo: 466.89 },
            { fecha: '2026-03-28', valorDatoPorPeriodo: 467.22 },
          ],
        },
      ],
    }
    const result = SddeResponseSchema.parse(data)
    expect(result.estado).toBe(true)
    expect(result.datos).toHaveLength(1)
    expect(result.datos[0]?.series).toHaveLength(2)
    expect(result.datos[0]?.series[0]?.valorDatoPorPeriodo).toBe(466.89)
  })

  it('validates response with empty series', () => {
    const data = {
      estado: true,
      datos: [{ codigoIndicador: '318', series: [] }],
    }
    const result = SddeResponseSchema.parse(data)
    expect(result.datos[0]?.series).toEqual([])
  })

  it('rejects non-object input', () => {
    expect(() => SddeResponseSchema.parse([])).toThrow()
  })

  it('rejects missing estado field', () => {
    expect(() => SddeResponseSchema.parse({ datos: [] })).toThrow()
  })
})

describe('bccr: SddeSeriesItemSchema', () => {
  it('validates a series item', () => {
    const item = { fecha: '2026-03-27', valorDatoPorPeriodo: 466.89 }
    const result = SddeSeriesItemSchema.parse(item)
    expect(result.fecha).toBe('2026-03-27')
    expect(result.valorDatoPorPeriodo).toBe(466.89)
  })

  it('rejects missing fecha', () => {
    expect(() => SddeSeriesItemSchema.parse({ valorDatoPorPeriodo: 100 })).toThrow()
  })

  it('rejects missing valorDatoPorPeriodo', () => {
    expect(() => SddeSeriesItemSchema.parse({ fecha: '2026-01-01' })).toThrow()
  })
})

describe('bccr: BccrIndicatorSchema', () => {
  it('validates a valid indicator', () => {
    const valid = {
      name: 'USD/CRC Sell Rate',
      value: 512.5,
      date: '2026-03-15',
      unit: '₡',
    }
    const result = BccrIndicatorSchema.parse(valid)
    expect(result.name).toBe('USD/CRC Sell Rate')
    expect(result.unit).toBe('₡')
  })
})

describe('bccr: ExchangeRatePointSchema', () => {
  it('validates a valid exchange rate point', () => {
    const valid = { date: '2026-03-15', buy: 508.3, sell: 512.5 }
    const result = ExchangeRatePointSchema.parse(valid)
    expect(result.buy).toBe(508.3)
    expect(result.sell).toBe(512.5)
  })

  it('rejects missing buy', () => {
    expect(() => ExchangeRatePointSchema.parse({ date: '2026-03-15', sell: 512.5 })).toThrow()
  })

  it('rejects missing sell', () => {
    expect(() => ExchangeRatePointSchema.parse({ date: '2026-03-15', buy: 508.3 })).toThrow()
  })
})

describe('bccr: BCCR_INDICATORS', () => {
  it('has all required indicator keys', () => {
    expect(BCCR_INDICATORS).toHaveProperty('USD_CRC_SELL')
    expect(BCCR_INDICATORS).toHaveProperty('USD_CRC_BUY')
    expect(BCCR_INDICATORS).toHaveProperty('TPM')
    expect(BCCR_INDICATORS).toHaveProperty('TBP')
  })

  it('each indicator has code, name, and unit', () => {
    for (const [, config] of Object.entries(BCCR_INDICATORS)) {
      expect(config).toHaveProperty('code')
      expect(config).toHaveProperty('name')
      expect(config).toHaveProperty('unit')
      expect(typeof config.code).toBe('number')
      expect(typeof config.name).toBe('string')
      expect(typeof config.unit).toBe('string')
    }
  })

  it('has correct indicator codes', () => {
    expect(BCCR_INDICATORS.USD_CRC_SELL.code).toBe(318)
    expect(BCCR_INDICATORS.USD_CRC_BUY.code).toBe(317)
    expect(BCCR_INDICATORS.TPM.code).toBe(3541)
    expect(BCCR_INDICATORS.TBP.code).toBe(423)
  })
})

describe('bccr: formatDateSdde', () => {
  it('formats a date as yyyy/mm/dd', () => {
    const date = new Date(2026, 2, 15) // March 15, 2026
    expect(formatDateSdde(date)).toBe('2026/03/15')
  })

  it('pads single-digit day and month', () => {
    const date = new Date(2026, 0, 5) // January 5, 2026
    expect(formatDateSdde(date)).toBe('2026/01/05')
  })

  it('handles December 31st', () => {
    const date = new Date(2025, 11, 31) // December 31, 2025
    expect(formatDateSdde(date)).toBe('2025/12/31')
  })

  it('handles first day of year', () => {
    const date = new Date(2026, 0, 1) // January 1, 2026
    expect(formatDateSdde(date)).toBe('2026/01/01')
  })
})

describe('bccr: normalizeDate', () => {
  it('extracts date from ISO datetime', () => {
    expect(normalizeDate('2026-03-15T00:00:00')).toBe('2026-03-15')
  })

  it('extracts date from ISO with timezone offset', () => {
    expect(normalizeDate('2026-03-15T00:00:00-06:00')).toBe('2026-03-15')
  })

  it('converts yyyy/mm/dd to yyyy-mm-dd', () => {
    expect(normalizeDate('2026/03/15')).toBe('2026-03-15')
  })

  it('pads short month/day from yyyy/m/d', () => {
    expect(normalizeDate('2026/3/5')).toBe('2026-03-05')
  })

  it('passes through already-normalized ISO date', () => {
    expect(normalizeDate('2026-03-15')).toBe('2026-03-15')
  })
})

describe('bccr: extractObservations', () => {
  it('extracts from real SDDE response format', () => {
    const data = {
      estado: true,
      mensaje: 'Consulta exitosa',
      datos: [
        {
          codigoIndicador: '318',
          nombreIndicador: 'Tipo cambio venta',
          series: [
            { fecha: '2026-03-27', valorDatoPorPeriodo: 466.89 },
            { fecha: '2026-03-28', valorDatoPorPeriodo: 467.22 },
          ],
        },
      ],
    }
    const result = extractObservations(data)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: '2026-03-27', value: 466.89 })
    expect(result[1]).toEqual({ date: '2026-03-28', value: 467.22 })
  })

  it('normalizes ISO datetime dates from response', () => {
    const data = {
      estado: true,
      datos: [
        {
          codigoIndicador: '318',
          series: [{ fecha: '2026-03-15T00:00:00', valorDatoPorPeriodo: 512.5 }],
        },
      ],
    }
    const result = extractObservations(data)
    expect(result[0]).toEqual({ date: '2026-03-15', value: 512.5 })
  })

  it('returns empty array for empty series', () => {
    const data = {
      estado: true,
      datos: [{ codigoIndicador: '318', series: [] }],
    }
    const result = extractObservations(data)
    expect(result).toEqual([])
  })

  it('returns empty array when datos is empty', () => {
    const data = { estado: true, datos: [] }
    const result = extractObservations(data)
    expect(result).toEqual([])
  })

  it('throws when estado is false', () => {
    const data = { estado: false, mensaje: 'Error de consulta', datos: [] }
    expect(() => extractObservations(data)).toThrow('Error de consulta')
  })

  it('throws for unexpected format', () => {
    expect(() => extractObservations('not an object')).toThrow('unexpected response format')
  })

  it('throws for object without SDDE structure', () => {
    expect(() => extractObservations({ unknown: 'shape' })).toThrow('unexpected response format')
  })

  it('handles percentage values for TPM/TBP', () => {
    const data = {
      estado: true,
      datos: [
        {
          codigoIndicador: '3541',
          series: [{ fecha: '2026-03-15', valorDatoPorPeriodo: 4.0 }],
        },
      ],
    }
    const result = extractObservations(data)
    expect(result[0]?.value).toBe(4.0)
  })
})
