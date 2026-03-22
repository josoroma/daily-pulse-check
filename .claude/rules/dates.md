---
paths:
  - 'app/**/*.{ts,tsx}'
  - 'lib/**/*.{ts,tsx}'
---

# Date Handling Rules

## Centralized Date Layer

All date formatting, parsing, and timezone-aware operations MUST use `@/lib/date`.

### Forbidden Patterns

Never use these in application code:

- `new Date().toISOString()` for display — use `toISO(new Date())` or `todayCR()`
- `new Date().toLocaleDateString()` — use `formatDateShort()` or `formatMonthYear()`
- `new Date().toISOString().split('T')[0]` — use `todayCR()` or `formatDateISO()`
- `date.toLocaleString()` — use the appropriate `format*` helper
- Manual date arithmetic (`setDate`, `getDate() - N`) — use `daysAgoCR(N)`

### Allowed Raw `Date` Usage

These are fine without wrappers:

- `new Date()` as React Hook Form `defaultValues` (RHF needs native Date objects)
- `Date.now()` for cache TTL / expiry math (millisecond timestamps, not display)
- `new Date(timestamp)` for cache expiry calculations in `lib/market/cache.ts`

### Import Convention

```ts
import { todayCR, formatDateISO, daysAgoCR } from '@/lib/date'
```

### Timezone Policy

- Costa Rica timezone (`America/Costa_Rica`) is always **explicit** via `@date-fns/tz`
- `setDefaultOptions` is used ONLY for locale (`es`) and calendar defaults
- Timezone is NEVER a hidden global — always passed via `TZDate` constructor
