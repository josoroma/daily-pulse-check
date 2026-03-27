import { CsvRowSchema, type CsvRow } from './_schema'

type ParsedRow = {
  row: number
  data: CsvRow
}

type InvalidRow = {
  row: number
  errors: string[]
}

export type CsvParseResult = {
  valid: ParsedRow[]
  invalid: InvalidRow[]
  headers: string[]
}

const HEADER_ALIASES: Record<string, string> = {
  symbol: 'symbol',
  ticker: 'symbol',
  asset: 'symbol',
  asset_type: 'asset_type',
  assettype: 'asset_type',
  type: 'asset_type',
  quantity: 'quantity',
  qty: 'quantity',
  shares: 'quantity',
  amount: 'quantity',
  average_buy_price: 'average_buy_price',
  averagebuyprice: 'average_buy_price',
  avg_price: 'average_buy_price',
  avgprice: 'average_buy_price',
  price: 'average_buy_price',
  cost_basis: 'average_buy_price',
  costbasis: 'average_buy_price',
  notes: 'notes',
  note: 'notes',
  memo: 'notes',
  comment: 'notes',
}

const REQUIRED_FIELDS = ['symbol', 'asset_type', 'quantity', 'average_buy_price']

export function mapHeaders(rawHeaders: string[]): {
  mapped: Record<string, string>
  missing: string[]
} {
  const mapped: Record<string, string> = {}

  for (const raw of rawHeaders) {
    const normalized = raw
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
    const canonical = HEADER_ALIASES[normalized]
    if (canonical) {
      mapped[raw] = canonical
    }
  }

  const found = new Set(Object.values(mapped))
  const missing = REQUIRED_FIELDS.filter((f) => !found.has(f))

  return { mapped, missing }
}

export function parseCsv(csvText: string): CsvParseResult {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return {
      valid: [],
      invalid: [{ row: 0, errors: ['CSV must have a header row and at least one data row'] }],
      headers: [],
    }
  }

  const rawHeaders = parseRow(lines[0]!)
  const { mapped, missing } = mapHeaders(rawHeaders)

  if (missing.length > 0) {
    return {
      valid: [],
      invalid: [{ row: 0, errors: [`Missing required columns: ${missing.join(', ')}`] }],
      headers: rawHeaders,
    }
  }

  const valid: ParsedRow[] = []
  const invalid: InvalidRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i]!)
    const obj: Record<string, string> = {}

    for (let j = 0; j < rawHeaders.length; j++) {
      const header = rawHeaders[j]
      const canonical = header ? mapped[header] : undefined
      if (canonical && j < cells.length) {
        obj[canonical] = cells[j]!.trim()
      }
    }

    const result = CsvRowSchema.safeParse(obj)
    if (result.success) {
      valid.push({ row: i + 1, data: result.data })
    } else {
      invalid.push({
        row: i + 1,
        errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      })
    }
  }

  return { valid, invalid, headers: rawHeaders }
}

function parseRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        cells.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }

  cells.push(current)
  return cells
}

export function sanitizeExportData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = new Set([
    'encrypted_key',
    'password',
    'hashed_password',
    'api_key',
    'service_role_key',
    'telegram_chat_id',
  ])

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.has(key)) continue
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeExportData(item as Record<string, unknown>)
          : item,
      )
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeExportData(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}
