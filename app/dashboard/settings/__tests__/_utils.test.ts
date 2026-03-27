import { describe, it, expect } from 'vitest'
import { parseCsv, mapHeaders, sanitizeExportData } from '@/app/dashboard/settings/_utils'

describe('mapHeaders', () => {
  it('maps standard column names', () => {
    const { mapped, missing } = mapHeaders([
      'Symbol',
      'Asset Type',
      'Quantity',
      'Average Buy Price',
    ])
    expect(mapped).toEqual({
      Symbol: 'symbol',
      'Asset Type': 'asset_type',
      Quantity: 'quantity',
      'Average Buy Price': 'average_buy_price',
    })
    expect(missing).toEqual([])
  })

  it('maps common aliases', () => {
    const { mapped, missing } = mapHeaders(['Ticker', 'Type', 'Shares', 'Cost Basis'])
    expect(mapped).toEqual({
      Ticker: 'symbol',
      Type: 'asset_type',
      Shares: 'quantity',
      'Cost Basis': 'average_buy_price',
    })
    expect(missing).toEqual([])
  })

  it('reports missing required columns', () => {
    const { missing } = mapHeaders(['Symbol', 'Notes'])
    expect(missing).toContain('asset_type')
    expect(missing).toContain('quantity')
    expect(missing).toContain('average_buy_price')
  })

  it('handles case-insensitive headers', () => {
    const { mapped } = mapHeaders(['SYMBOL', 'asset_type', 'QTY', 'avg_price'])
    expect(Object.values(mapped)).toContain('symbol')
    expect(Object.values(mapped)).toContain('asset_type')
    expect(Object.values(mapped)).toContain('quantity')
    expect(Object.values(mapped)).toContain('average_buy_price')
  })
})

describe('parseCsv', () => {
  it('parses valid CSV with standard headers', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price,Notes
VOO,ETF,10,420.50,Main index fund
BTC,Crypto,0.5,45000,Bitcoin`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(2)
    expect(result.invalid).toHaveLength(0)
    expect(result.valid[0]!.data).toEqual({
      symbol: 'VOO',
      asset_type: 'ETF',
      quantity: 10,
      average_buy_price: 420.5,
      notes: 'Main index fund',
    })
    expect(result.valid[1]!.data.symbol).toBe('BTC')
  })

  it('handles CSV with alias headers', () => {
    const csv = `Ticker,Type,Shares,Cost Basis
QQQ,ETF,5,385`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0]!.data.symbol).toBe('QQQ')
    expect(result.valid[0]!.data.quantity).toBe(5)
  })

  it('reports invalid rows', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price
VOO,ETF,10,420.50
INVALID,Stock,-5,100`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]!.row).toBe(3)
    expect(result.invalid[0]!.errors.length).toBeGreaterThan(0)
  })

  it('returns error when CSV has no data rows', () => {
    const csv = `Symbol`
    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(0)
    expect(result.invalid).toHaveLength(1)
    expect(result.invalid[0]!.errors[0]).toContain('header row')
  })

  it('returns error when required columns are missing', () => {
    const csv = `Symbol,Notes
VOO,test`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(0)
    expect(result.invalid[0]!.errors[0]).toContain('Missing required columns')
  })

  it('handles quoted CSV fields with commas', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price,Notes
VOO,ETF,10,420.50,"Bought in January, 2025"`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0]!.data.notes).toBe('Bought in January, 2025')
  })

  it('handles escaped quotes in CSV', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price,Notes
VOO,ETF,10,420.50,"Note with ""quotes"""`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0]!.data.notes).toBe('Note with "quotes"')
  })

  it('handles empty lines and whitespace', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price

VOO,ETF,10,420.50

QQQ,ETF,5,385
`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(2)
  })

  it('uppercases symbols', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price
voo,ETF,10,420`

    const result = parseCsv(csv)
    expect(result.valid[0]!.data.symbol).toBe('VOO')
  })

  it('coerces string numbers to numeric', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price
VOO,ETF,10,420.50`

    const result = parseCsv(csv)
    expect(typeof result.valid[0]!.data.quantity).toBe('number')
    expect(typeof result.valid[0]!.data.average_buy_price).toBe('number')
  })

  it('rejects negative quantities', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price
VOO,ETF,-10,420`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(0)
    expect(result.invalid).toHaveLength(1)
  })

  it('rejects negative prices', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price
VOO,ETF,10,-420`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(0)
    expect(result.invalid).toHaveLength(1)
  })

  it('accepts zero price (free shares)', () => {
    const csv = `Symbol,Asset Type,Quantity,Average Buy Price
VOO,ETF,10,0`

    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.valid[0]!.data.average_buy_price).toBe(0)
  })

  it('handles Windows-style line endings', () => {
    const csv = 'Symbol,Asset Type,Quantity,Average Buy Price\r\nVOO,ETF,10,420\r\nQQQ,ETF,5,385'
    const result = parseCsv(csv)
    expect(result.valid).toHaveLength(2)
  })
})

describe('sanitizeExportData', () => {
  it('removes sensitive keys from flat object', () => {
    const data = {
      display_name: 'John',
      encrypted_key: 'secret123',
      password: 'abc',
      base_currency: 'USD',
    }
    const result = sanitizeExportData(data)
    expect(result).toEqual({ display_name: 'John', base_currency: 'USD' })
    expect(result).not.toHaveProperty('encrypted_key')
    expect(result).not.toHaveProperty('password')
  })

  it('removes sensitive keys from nested objects', () => {
    const data = {
      profile: { name: 'John', api_key: 'secret' },
      currency: 'USD',
    }
    const result = sanitizeExportData(data)
    expect((result.profile as Record<string, unknown>).name).toBe('John')
    expect(result.profile).not.toHaveProperty('api_key')
  })

  it('removes sensitive keys from arrays of objects', () => {
    const data = {
      keys: [
        { service: 'openai', encrypted_key: 'enc123' },
        { service: 'fred', encrypted_key: 'enc456' },
      ],
    }
    const result = sanitizeExportData(data)
    const keys = result.keys as Array<Record<string, unknown>>
    expect(keys[0]).toEqual({ service: 'openai' })
    expect(keys[1]).toEqual({ service: 'fred' })
  })

  it('preserves non-sensitive data', () => {
    const data = {
      name: 'Test',
      positions: [{ symbol: 'VOO', quantity: 10 }],
      count: 42,
    }
    const result = sanitizeExportData(data)
    expect(result).toEqual(data)
  })
})
