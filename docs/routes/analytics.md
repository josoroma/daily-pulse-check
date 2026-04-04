# E9: Analytics & Reporting

> Delivers quantitative performance metrics, periodic reports (monthly/yearly), and tax-relevant data exports for a Costa Rica-based investor tracking VOO, QQQ, and Bitcoin. The analytics route calculates total return, time-weighted return (TWRR), per-asset performance, benchmark comparison against the S&P 500, DCA adherence scoring, FIFO realized gains, and CSV/PDF export — giving the user a complete picture of investing results and tax obligations.

---

## Table of Contents

- [Architecture](#architecture)
- [Pages & Navigation](#pages--navigation)
- [Why This Feature Exists — User Flows](#why-this-feature-exists--user-flows)
- [Models, Cron Jobs, Actions & API Routes](#models-cron-jobs-actions--api-routes)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [File Tree](#file-tree)
- [Known Limitations](#known-limitations)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  User visits /dashboard/analytics                                        │
└──────────┬───────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  page.tsx (Server)       │
│  Calls in parallel:      │
│  • getAnalyticsPositions │──────────────────┐
│  • getAnalyticsSnapshots │                  │
│  • getAnalyticsTransactions                 │
│  • getTransactionYears   │                  │
│  • getDcaScheduleStats   │                  │
└──────────┬───────────────┘                  │
           │                                  │
           ▼                                  ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│  _actions.ts (Server)    │    │  Supabase (Postgres + RLS)  │
│  createClient() → auth   │───▶│  SELECT positions           │
│  check getUser()         │    │  SELECT portfolio_snapshots │
│                          │    │  SELECT transactions        │
│                          │    │  SELECT dca_schedules       │
│                          │    │  SELECT profiles            │
└──────────────────────────┘    └─────────────────────────────┘
           │
           ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│  fetchCurrentPrices()    │───▶│  External APIs              │
│  (in page.tsx)           │    │  • Twelve Data /price (ETF) │
│                          │    │  • CoinGecko /simple/price  │
│  fetchHistory()          │───▶│  • Twelve Data /time_series │
│  (benchmark data)        │    │    (VOO 365 days)           │
└──────────────────────────┘    └─────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  _utils.ts (pure fns)   │
│  • calculateTotalReturn  │
│  • calculatePerAsset...  │
│  • calculateTWRR         │
│  • calculateBenchmark... │
│  • compareToBenchmark    │
│  • aggregateMonthly...   │
│  • aggregateYearly...    │
│  • calculateDcaAdherence │
│  • calculateFifoRealized │
│  • generateCsv           │
│  • getTaxNote            │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Client Components ('use client')                                        │
│  ┌────────────────────┐ ┌──────────────┐ ┌────────────────────────────┐ │
│  │ PerformanceSummary │ │ PerAssetTable│ │ BenchmarkChart (Recharts)  │ │
│  └────────────────────┘ └──────────────┘ └────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ AnalyticsReports → ReportViewer + PdfExportButton (jsPDF)       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  /dashboard/analytics/tax (Sub-route)                                    │
│  tax/page.tsx (Server) → TaxExportClient (Client)                        │
│  • FIFO realized gains table                                             │
│  • CSV download: realized gains, transactions                            │
│  • Country-specific tax note (Costa Rica territorial system)             │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Cron: /api/cron/portfolio-snapshot (daily 02:00 UTC)                    │
│  Admin client → positions → live prices → UPSERT portfolio_snapshots     │
│  (Provides the historical data that TWRR and reports rely on)            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Pages & Navigation

| Path                       | Component      | Type             | Description                                                                                              |
| -------------------------- | -------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `/dashboard/analytics`     | `page.tsx`     | Server Component | Main analytics page: performance summary cards, per-asset table, benchmark chart, monthly/yearly reports |
| `/dashboard/analytics/tax` | `tax/page.tsx` | Server Component | Tax export page: FIFO realized gains table, CSV downloads, Costa Rica tax note                           |

### Loading State

No `loading.tsx` exists for this route. The page uses Server Component data fetching, so the parent `dashboard/loading.tsx` fallback applies during initial navigation.

### Auto-refresh

No client-side polling. Data is fetched server-side on each page load.

### Sub-navigation

The tax export page is a separate sub-route (`/dashboard/analytics/tax`), not a tab within the main analytics page. The main analytics page itself has a view mode toggle (Monthly / Yearly) inside the Reports section and a year dropdown selector.

---

## Why This Feature Exists — User Flows

#### Performance Summary (`_components/performance-summary.tsx`)

**What the user sees**: Four metric cards in a responsive grid (2 cols on medium, 4 cols on large screens):

1. **Portfolio Value** — Current total market value with cost basis subtitle
2. **Total Return** — Dollar gain/loss and percentage, colored emerald (positive) or rose (negative)
3. **Time-Weighted Return** — TWRR percentage, removing the effect of deposits/withdrawals
4. **vs S&P 500 (VOO)** — Outperformance/underperformance percentage against VOO benchmark

**What the user can do**:

- View only — no interactive actions on these cards

**Data source**: Computed server-side in `page.tsx` via `calculateTotalReturn()`, `calculateTWRR()`, and `compareToBenchmark()` from `_utils.ts`

**Why it matters**: Lets the user instantly answer: "Am I making money? How much? Am I beating the market?" — the three most critical questions for a passive VOO/QQQ/BTC investor.

**States**:

- Empty: Cards show `$0.00` values when no positions exist
- Loading: `PerformanceSummarySkeleton` renders 4 skeleton cards with shimmer placeholders
- Error: Benchmark card shows "—" with "Need more data for comparison" when VOO history fetch fails

---

#### Per-Asset Performance Table (`_components/per-asset-table.tsx`)

**What the user sees**: A sortable table inside a card showing each held asset with columns: Symbol (color-coded badge), Type (ETF/Crypto), Quantity, Cost Basis, Current Value, Unrealized P&L, Return %. Color scheme per asset: VOO (blue), QQQ (purple), BTC (orange), ETH (sky), Cash (teal).

**What the user can do**:

- **Sort by any column**: Click column header buttons with arrow icons to toggle ascending/descending sort. Default sort is by Current Value descending.

**Data source**: `calculatePerAssetPerformance()` in `_utils.ts`, enriched with live prices from `fetchCurrentPrices()` in `page.tsx`

**Why it matters**: Shows which individual holdings are winners and losers, helping the user decide whether to rebalance, add to positions, or take profits.

**States**:

- Empty: "No positions found. Add positions in your portfolio to see performance data."
- Loading: `PerAssetTableSkeleton` renders 3 skeleton rows
- Error: N/A (falls through to empty state)

---

#### Benchmark Comparison Chart (`_components/benchmark-chart.tsx`)

**What the user sees**: A dual-area chart (Recharts `AreaChart`) comparing cumulative percentage returns over time. Portfolio line is green (`hsl(160, 60%, 45%)`), S&P 500 (VOO) line is blue (`hsl(220, 70%, 55%)`). Both series are normalized to start at 0% for fair comparison. X-axis shows `M/D` dates, Y-axis shows `%` returns. Includes gradient fills under each area.

**What the user can do**:

- **Hover for tooltip**: Shows date and exact percentage for both portfolio and VOO
- **View legend**: Identifies "Your Portfolio" vs "S&P 500 (VOO)"

**Data source**: Portfolio data from `portfolio_snapshots` via `getAnalyticsSnapshots()`. Benchmark data from `fetchHistory('VOO', '1day', 365)` via Twelve Data API.

**Why it matters**: Visual answer to "Am I outperforming a simple S&P 500 buy-and-hold?" — the core benchmark for any active investor.

**States**:

- Empty: "Need portfolio history data for benchmark comparison."
- Loading: `BenchmarkChartSkeleton` renders a card with 300px skeleton block
- Error: Empty state shown if VOO history fetch fails

---

#### Analytics Reports (`_components/analytics-reports.tsx`)

**What the user sees**: A reports section with a year selector dropdown, a view mode toggle (Monthly / Yearly), and a PDF export button in the top-right corner.

**What the user can do**:

- **Switch view mode**: Toggle between "Monthly" and "Yearly" using a dropdown select
- **Change year**: Select from available years (derived from transaction history)
- **Export PDF**: Click "Export PDF" button to generate and download a formatted PDF report

**Data source**: `aggregateMonthlyReport()` and `aggregateYearlyReport()` from `_utils.ts`, fed by snapshots and transactions

**Why it matters**: Periodic review of investing discipline and results — critical for maintaining a long-term DCA strategy.

**States**:

- Empty: Reports render with `$0.00` values for months without data
- Loading: Parent component handles loading state
- Error: N/A (gracefully degrades to zero-value reports)

---

#### Report Viewer (`_components/report-viewer.tsx`)

**What the user sees**:

In **Monthly view**: A grid of cards (2 cols on medium, 3 cols on large), each showing a month with: Starting Value, Ending Value, Net Deposits, Withdrawals, Return %, and DCA Adherence (color-coded badge: green ≥90%, amber ≥70%, rose <70%).

In **Yearly view**: Four summary metric cards (Total Invested, Total Value, Unrealized Gains, Total Return) plus a bar chart (`Recharts BarChart`) showing month-by-month return percentages. Bars use blue fill with 4px top border radius.

**What the user can do**:

- **Toggle Monthly / Yearly**: Select dropdown at the top
- **Change year**: Year selector propagates from parent `AnalyticsReports`

**Data source**: `MonthlyReport[]` and `YearlyReport` from `_utils.ts`

**Why it matters**: Monthly cards track investing discipline (DCA adherence). Yearly chart reveals seasonal patterns in portfolio returns.

**States**:

- Empty (Monthly): "No monthly report data available for this period."
- Empty (Yearly bar chart): "No monthly return data available."
- Loading: `ReportViewerSkeleton` renders card with skeleton rows and a 3-card grid

---

#### PDF Export Button (`_components/pdf-export-button.tsx`)

**What the user sees**: An outlined button with a download icon labeled "Export PDF". Shows a spinning loader during export.

**What the user can do**:

- **Click to export**: Dynamically imports `jspdf` and `jspdf-autotable`, generates an `Investment Report — {year}` PDF with annual summary table and monthly breakdown table, then triggers browser download as `investment-report-{year}.pdf`.

**Data source**: `monthlyReports` and `yearlyReport` props passed from `AnalyticsReports`

**Why it matters**: Creates a shareable financial summary for personal records or accountant review.

**States**:

- Loading: Button disabled with spinner while PDF generates
- Error: Silently logs to console (`PDF export failed`)

---

#### Tax Export (`tax/_components/tax-export-client.tsx`)

**What the user sees**:

1. **Tax note banner** (conditional): Amber-colored alert card with warning icon and the Costa Rica territorial tax note, shown only when user's country is `CR` or `Costa Rica`.
2. **Export Data card**: Year selector dropdown plus two export buttons — "Realized Gains CSV" and "Transaction History CSV". Buttons disabled when no data exists for the selected year.
3. **Realized Gains table**: Summary grid (3 cols) showing Total Cost Basis, Total Sale Price, Net Realized Gain/Loss. Below, a detail table with columns: Date, Symbol, Qty Sold, Cost Basis, Sale Price, Gain/Loss, Days Held. Gain/Loss colored emerald or rose.

**What the user can do**:

- **Select year**: Filter all data and calculations to a specific tax year
- **Download Realized Gains CSV**: Exports FIFO-calculated gains with optional Costa Rica tax header note
- **Download Transaction History CSV**: Exports all buy/sell/DCA transactions for the year with symbols and totals

**Data source**: Server-side: `getAnalyticsTransactions()`, `getTransactionYears()`, `getUserCountry()` from `_actions.ts`. Client-side: `calculateFifoRealizedGains()` from `_utils.ts`.

**Why it matters**: Costa Rica's territorial tax system may exempt foreign investment gains, but the user still needs organized records. This page prepares accountant-ready data with the correct tax context.

**States**:

- Empty: "No sell transactions found for {year}."
- Loading: Server Component handles suspense
- Error: N/A (empty data shown)

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`_actions.ts`)

| Function                            | Zod Schema | Tables Read                     | Tables Written | Returns                                     |
| ----------------------------------- | ---------- | ------------------------------- | -------------- | ------------------------------------------- |
| `getAnalyticsPositions()`           | None       | `positions`, `portfolios`       | None           | `Array<Position & { portfolio }>` or `[]`   |
| `getAnalyticsSnapshots(days)`       | None       | `portfolio_snapshots`           | None           | `Array<PortfolioSnapshot>` or `[]`          |
| `getAnalyticsTransactions(year?)`   | None       | `transactions`, `positions`     | None           | `Array<Transaction & { position }>` or `[]` |
| `getDcaScheduleStats(year, month?)` | None       | `dca_schedules`, `transactions` | None           | `{ scheduled: number, executed: number }`   |
| `getUserCountry()`                  | None       | `profiles`                      | None           | `string` (default `'US'`)                   |
| `getTransactionYears()`             | None       | `transactions`                  | None           | `number[]` (descending)                     |

All functions:

- **Auth**: Call `createClient()` then `supabase.auth.getUser()`. Return empty/default values if unauthenticated.
- **Validation**: Read-only actions, no Zod input validation needed.
- **Return shape**: Raw Supabase data arrays or scalar defaults.

### API Routes

None specific to analytics. The analytics feature reads data from Supabase directly via server actions and calls external APIs inline within `page.tsx`.

### Cron Jobs

| Schedule                      | Route                          | What It Does                                                                                       | Tables Affected                                      | External APIs                                                     |
| ----------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| `0 2 * * *` (02:00 UTC daily) | `/api/cron/portfolio-snapshot` | Fetches live prices for all user positions, computes total portfolio value, upserts daily snapshot | `portfolio_snapshots` (UPSERT), `positions` (SELECT) | Twelve Data `/price`, CoinGecko `/simple/price`, `/coins/markets` |

The snapshot cron is critical for analytics: TWRR calculation, benchmark comparison charts, and monthly/yearly report aggregation all depend on historical `portfolio_snapshots` data.

**Auth**: Bearer token check against `CRON_SECRET` env var. Uses `createAdminClient()` (service role key) to bypass RLS.

### External APIs

##### Twelve Data

| Detail                  | Value                                                      |
| ----------------------- | ---------------------------------------------------------- |
| Base URL                | `https://api.twelvedata.com`                               |
| Auth                    | `TWELVE_DATA_API_KEY` via query parameter `apikey`         |
| Free tier limit         | 800 requests/day (rate limited at 750 threshold in code)   |
| Cache TTL               | Real-time price: 5 min. Daily history: 24 hours            |
| Fallback if unavailable | Stale cache from `market_cache` Supabase table, then throw |

**Endpoints called:**

| Endpoint           | Parameters                                  | Returns                                                            | Used for                                         |
| ------------------ | ------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| `GET /price`       | `symbol={VOO\|QQQ}`                         | `{ symbol, price, timestamp, currency }`                           | Live ETF prices for position enrichment          |
| `GET /time_series` | `symbol=VOO, interval=1day, outputsize=365` | `{ meta, values: [{ datetime, open, high, low, close, volume }] }` | Benchmark comparison chart (365-day VOO history) |

##### CoinGecko

| Detail                  | Value                                                         |
| ----------------------- | ------------------------------------------------------------- |
| Base URL                | `https://api.coingecko.com/api/v3`                            |
| Auth                    | `COINGECKO_API_KEY` via `x-cg-demo-api-key` header (optional) |
| Free tier limit         | 10-30 requests/minute (without API key)                       |
| Cache TTL               | Real-time price: 5 min                                        |
| Fallback if unavailable | Stale cache from `market_cache` Supabase table, then throw    |

**Endpoints called:**

| Endpoint            | Parameters                           | Returns                     | Used for                                 |
| ------------------- | ------------------------------------ | --------------------------- | ---------------------------------------- |
| `GET /simple/price` | `ids=bitcoin, vs_currencies=usd,crc` | `{ bitcoin: { usd, crc } }` | Live BTC price via `fetchBitcoinPrice()` |

### Zod Schemas (`_schema.ts`)

##### `AnalyticsFilterSchema` → `type AnalyticsFilter`

| Field  | Type     | Constraints                   | Description                    |
| ------ | -------- | ----------------------------- | ------------------------------ |
| `year` | `number` | `int(), min(2020), max(2100)` | Filter year for analytics data |

**Example valid data:**

```typescript
const example: AnalyticsFilter = {
  year: 2026,
}
```

##### `ReportFilterSchema` → `type ReportFilter`

| Field   | Type                  | Constraints                          | Description           |
| ------- | --------------------- | ------------------------------------ | --------------------- |
| `year`  | `number`              | `int(), min(2020), max(2100)`        | Report year           |
| `month` | `number \| undefined` | `int(), min(1), max(12), optional()` | Optional month filter |

**Example valid data:**

```typescript
const example: ReportFilter = {
  year: 2026,
  month: 3,
}
```

##### `TaxExportFilterSchema` → `type TaxExportFilter`

| Field  | Type     | Constraints                   | Description         |
| ------ | -------- | ----------------------------- | ------------------- |
| `year` | `number` | `int(), min(2020), max(2100)` | Tax year for export |

**Example valid data:**

```typescript
const example: TaxExportFilter = {
  year: 2026,
}
```

---

## Database Schema

#### `positions`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`

| Column              | Type          | Nullable | Default             | Description                             |
| ------------------- | ------------- | -------- | ------------------- | --------------------------------------- |
| `id`                | `uuid`        | No       | `gen_random_uuid()` | Primary key                             |
| `user_id`           | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE |
| `portfolio_id`      | `uuid`        | No       | —                   | FK → `portfolios(id)` ON DELETE CASCADE |
| `asset_type`        | `text`        | No       | —                   | `'ETF'` or `'Crypto'` (CHECK)           |
| `symbol`            | `text`        | No       | —                   | Ticker symbol (e.g., `VOO`, `BTC`)      |
| `quantity`          | `numeric`     | No       | —                   | Units held (CHECK > 0)                  |
| `average_buy_price` | `numeric`     | No       | —                   | Average cost per unit (CHECK ≥ 0)       |
| `notes`             | `text`        | Yes      | —                   | User notes                              |
| `created_at`        | `timestamptz` | No       | `now()`             | Row creation time                       |
| `updated_at`        | `timestamptz` | No       | `now()`             | Last update time                        |

**RLS Policies:**

| Policy                           | Operation | Condition              |
| -------------------------------- | --------- | ---------------------- |
| `Users can view own positions`   | SELECT    | `auth.uid() = user_id` |
| `Users can insert own positions` | INSERT    | `auth.uid() = user_id` |
| `Users can update own positions` | UPDATE    | `auth.uid() = user_id` |
| `Users can delete own positions` | DELETE    | `auth.uid() = user_id` |

**Read by**: `getAnalyticsPositions()` in `_actions.ts`, `page.tsx`

**Example row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "portfolio_id": "d4e5f6a7-b8c9-0123-4567-890abcdef012",
  "asset_type": "ETF",
  "symbol": "VOO",
  "quantity": 25.5,
  "average_buy_price": 420.0,
  "notes": "Core S&P 500 position",
  "created_at": "2026-01-15T14:30:00Z",
  "updated_at": "2026-03-20T09:15:00Z"
}
```

---

#### `portfolio_snapshots`

**Created in**: `supabase/migrations/20260322000000_portfolio_snapshots.sql`

| Column           | Type             | Nullable | Default             | Description                                                               |
| ---------------- | ---------------- | -------- | ------------------- | ------------------------------------------------------------------------- |
| `id`             | `uuid`           | No       | `gen_random_uuid()` | Primary key                                                               |
| `user_id`        | `uuid`           | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE                                   |
| `portfolio_id`   | `uuid`           | No       | —                   | FK → `portfolios(id)` ON DELETE CASCADE                                   |
| `snapshot_date`  | `date`           | No       | `current_date`      | Date of the snapshot                                                      |
| `total_value`    | `numeric(20, 2)` | No       | `0`                 | Total portfolio value in USD                                              |
| `positions_data` | `jsonb`          | No       | `'[]'::jsonb`       | Per-position breakdown `[{ symbol, asset_type, quantity, price, value }]` |
| `created_at`     | `timestamptz`    | No       | `now()`             | Row creation time                                                         |

**Unique constraint**: `(portfolio_id, snapshot_date)` — one snapshot per portfolio per day.

**RLS Policies:**

| Policy                                     | Operation | Condition              |
| ------------------------------------------ | --------- | ---------------------- |
| `Users can read own portfolio snapshots`   | SELECT    | `auth.uid() = user_id` |
| `Users can insert own portfolio snapshots` | INSERT    | `auth.uid() = user_id` |
| `Users can delete own portfolio snapshots` | DELETE    | `auth.uid() = user_id` |

**Indexes:**

- `idx_portfolio_snapshots_user` on `(user_id)`
- `idx_portfolio_snapshots_portfolio_date` on `(portfolio_id, snapshot_date)`

**Written by**: `/api/cron/portfolio-snapshot` (service role, bypasses RLS)
**Read by**: `getAnalyticsSnapshots()` in `_actions.ts`, `page.tsx`

**Example row:**

```json
{
  "id": "7f8e9d0c-1b2a-3c4d-5e6f-7a8b9c0d1e2f",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "portfolio_id": "d4e5f6a7-b8c9-0123-4567-890abcdef012",
  "snapshot_date": "2026-04-03",
  "total_value": 54250.75,
  "positions_data": [
    { "symbol": "VOO", "asset_type": "ETF", "quantity": 25.5, "price": 530.2, "value": 13520.1 },
    { "symbol": "QQQ", "asset_type": "ETF", "quantity": 15, "price": 485.5, "value": 7282.5 },
    {
      "symbol": "BTC",
      "asset_type": "Crypto",
      "quantity": 0.42,
      "price": 79638.45,
      "value": 33448.15
    }
  ],
  "created_at": "2026-04-03T02:00:15Z"
}
```

---

#### `transactions`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`

| Column        | Type          | Nullable | Default             | Description                             |
| ------------- | ------------- | -------- | ------------------- | --------------------------------------- |
| `id`          | `uuid`        | No       | `gen_random_uuid()` | Primary key                             |
| `user_id`     | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE |
| `position_id` | `uuid`        | No       | —                   | FK → `positions(id)` ON DELETE CASCADE  |
| `type`        | `text`        | No       | —                   | `'Buy'`, `'Sell'`, or `'DCA'` (CHECK)   |
| `quantity`    | `numeric`     | No       | —                   | Units transacted (CHECK > 0)            |
| `price`       | `numeric`     | No       | —                   | Price per unit at execution (CHECK ≥ 0) |
| `fee`         | `numeric`     | No       | `0`                 | Transaction fee (CHECK ≥ 0)             |
| `executed_at` | `timestamptz` | No       | `now()`             | When the transaction occurred           |
| `notes`       | `text`        | Yes      | —                   | User notes                              |
| `created_at`  | `timestamptz` | No       | `now()`             | Row creation time                       |

**RLS Policies:**

| Policy                              | Operation | Condition              |
| ----------------------------------- | --------- | ---------------------- |
| `Users can view own transactions`   | SELECT    | `auth.uid() = user_id` |
| `Users can insert own transactions` | INSERT    | `auth.uid() = user_id` |
| `Users can update own transactions` | UPDATE    | `auth.uid() = user_id` |
| `Users can delete own transactions` | DELETE    | `auth.uid() = user_id` |

**Read by**: `getAnalyticsTransactions()` in `_actions.ts`, `getDcaScheduleStats()` in `_actions.ts`

**Example row:**

```json
{
  "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "position_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "DCA",
  "quantity": 2.5,
  "price": 425.0,
  "fee": 0,
  "executed_at": "2026-03-15T14:00:00Z",
  "notes": "Monthly DCA into VOO",
  "created_at": "2026-03-15T14:00:05Z"
}
```

---

#### `dca_schedules`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`

| Column              | Type          | Nullable | Default             | Description                                                 |
| ------------------- | ------------- | -------- | ------------------- | ----------------------------------------------------------- |
| `id`                | `uuid`        | No       | `gen_random_uuid()` | Primary key                                                 |
| `user_id`           | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE                     |
| `portfolio_id`      | `uuid`        | No       | —                   | FK → `portfolios(id)` ON DELETE CASCADE                     |
| `symbol`            | `text`        | No       | —                   | Ticker symbol                                               |
| `asset_type`        | `text`        | No       | —                   | `'ETF'` or `'Crypto'` (CHECK)                               |
| `amount`            | `numeric`     | No       | —                   | Dollar amount per execution (CHECK > 0)                     |
| `frequency`         | `text`        | No       | —                   | `'Daily'`, `'Weekly'`, `'Biweekly'`, or `'Monthly'` (CHECK) |
| `is_active`         | `boolean`     | No       | `true`              | Whether the schedule is active                              |
| `next_execution_at` | `timestamptz` | Yes      | —                   | Next scheduled execution time                               |
| `created_at`        | `timestamptz` | No       | `now()`             | Row creation time                                           |
| `updated_at`        | `timestamptz` | No       | `now()`             | Last update time                                            |

**Read by**: `getDcaScheduleStats()` in `_actions.ts` — used to estimate scheduled DCA count for adherence calculation.

---

#### `profiles`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`

| Column           | Type          | Nullable | Default    | Description                                                           |
| ---------------- | ------------- | -------- | ---------- | --------------------------------------------------------------------- |
| `id`             | `uuid`        | No       | —          | PK, FK → `auth.users(id)` ON DELETE CASCADE                           |
| `display_name`   | `text`        | Yes      | —          | User's display name                                                   |
| `base_currency`  | `text`        | No       | `'USD'`    | `'USD'` or `'CRC'` (CHECK)                                            |
| `country`        | `text`        | No       | `'CR'`     | Country code (default Costa Rica)                                     |
| `risk_tolerance` | `text`        | No       | `'Medium'` | `'Conservative'`, `'Medium'`, `'Medium-High'`, `'Aggressive'` (CHECK) |
| `created_at`     | `timestamptz` | No       | `now()`    | Row creation time                                                     |
| `updated_at`     | `timestamptz` | No       | `now()`    | Last update time                                                      |

**Triggers:**

- `on_auth_user_created` → calls `handle_new_user()` on INSERT to `auth.users`, auto-creates a profile row.

**Read by**: `getUserCountry()` in `_actions.ts` — determines whether to show Costa Rica tax note.

---

### Relationships

```
auth.users(id)
  ├──< profiles(id)                    1:1
  ├──< portfolios(user_id)             1:N
  │     ├──< positions(portfolio_id)   1:N
  │     │     └──< transactions(position_id)  1:N
  │     └──< portfolio_snapshots(portfolio_id)  1:N
  └──< dca_schedules(user_id)          1:N
```

---

## Testing

#### `__tests__/_utils.test.ts`

| Describe Block                 | Tests | Key Edge Cases                                                                                      |
| ------------------------------ | ----- | --------------------------------------------------------------------------------------------------- |
| `calculateTotalReturn`         | 5     | Zero investment, zero cost basis, negative returns                                                  |
| `calculatePerAssetPerformance` | 1     | Multi-asset breakdown (VOO + BTC)                                                                   |
| `calculateTWRR`                | 4     | No cash flows, cash flow adjustment, <2 snapshots, zero-value snapshots                             |
| `calculateBenchmarkReturn`     | 4     | Unsorted prices, <2 prices, zero start price                                                        |
| `compareToBenchmark`           | 2     | Outperformance, underperformance                                                                    |
| `aggregateMonthlyReport`       | 2     | Normal month, month with no snapshots                                                               |
| `aggregateYearlyReport`        | 1     | Full year with snapshots                                                                            |
| `calculateDcaAdherence`        | 4     | 83% (10/12), 0 scheduled, perfect adherence, zero executions                                        |
| `calculateFifoRealizedGains`   | 6     | Simple buy-sell, multiple lots FIFO, partial lot sells, DCA as tax lots, no sells, multiple symbols |
| `generateCsv`                  | 3     | Basic generation, header note, field escaping (commas, quotes)                                      |
| `realizedGainsToCsvRows`       | 1     | Format conversion                                                                                   |
| `transactionsToCsvRows`        | 1     | Format conversion                                                                                   |
| `getTaxNote`                   | 3     | Costa Rica code `CR`, full name `Costa Rica`, unknown country (`US` → undefined)                    |

**Run this feature's tests:**

```bash
npm test -- app/dashboard/analytics
```

### Test Gaps

- No tests for `_actions.ts` server actions (requires Supabase mocking, per project convention pure-function testing only)
- No tests for component rendering (no React Testing Library tests)
- No tests for `page.tsx` server-side orchestration logic (`fetchCurrentPrices()`, report assembly)
- `formatUsd()` and `formatPct()` helpers have no dedicated tests (used extensively but only indirectly covered)
- `downloadCsv()` has no test (DOM-dependent client-side download function)
- Zod schemas in `_schema.ts` have no validation tests (schemas are defined but not used in any action)

---

## File Tree

```
app/dashboard/analytics/
├── page.tsx                          # Server Component — main analytics page
├── _actions.ts                       # Server Actions — data fetching from Supabase
├── _schema.ts                        # Zod schemas: AnalyticsFilter, ReportFilter, TaxExportFilter
├── _utils.ts                         # Pure functions: return calculations, TWRR, FIFO, CSV, formatting
├── _constants.ts                     # BENCHMARK_SYMBOL, REPORT_PERIODS, MONTHS, COSTA_RICA_TAX_NOTE
├── _components/
│   ├── performance-summary.tsx       # 4 metric cards (portfolio value, total return, TWRR, vs VOO)
│   ├── per-asset-table.tsx           # Sortable per-asset performance table
│   ├── benchmark-chart.tsx           # Recharts AreaChart — portfolio vs S&P 500
│   ├── analytics-reports.tsx         # Report wrapper with PDF export button
│   ├── report-viewer.tsx             # Monthly cards and yearly bar chart with period selector
│   └── pdf-export-button.tsx         # Dynamic jsPDF import, PDF generation and download
├── tax/
│   ├── page.tsx                      # Server Component — tax export page
│   └── _components/
│       └── tax-export-client.tsx     # FIFO realized gains table, CSV downloads, tax note banner
└── __tests__/
    └── _utils.test.ts                # 37 tests covering all pure functions

# Related files outside the route:

lib/market/
├── stocks.ts                         # fetchPrice(), fetchHistory() — Twelve Data API
├── crypto.ts                         # fetchBitcoinPrice() — CoinGecko API
└── cache.ts                          # getCached(), CacheTTL — in-memory + Supabase market_cache

lib/date/
├── config.ts                         # CR_TIMEZONE, locale config
└── index.ts                          # daysAgoCR() — used in getAnalyticsSnapshots()

app/dashboard/portfolio/
└── _constants.ts                     # CRYPTO_COIN_IDS — symbol-to-CoinGecko ID mapping

app/api/cron/portfolio-snapshot/
└── route.ts                          # Daily cron: snapshots portfolio values

supabase/migrations/
├── 20260320000000_initial_schema.sql # positions, transactions, dca_schedules, profiles
└── 20260322000000_portfolio_snapshots.sql  # portfolio_snapshots table
```

---

## Known Limitations

- **Zod schemas unused**: `AnalyticsFilterSchema`, `ReportFilterSchema`, and `TaxExportFilterSchema` in `_schema.ts` are defined but never used in any server action or form validation. The year/month selections are handled as plain props.

- **Asset breakdown in monthly reports is a stub**: `aggregateMonthlyReport()` returns `assetBreakdown` with all zero values and a comment "simplified — per-symbol snapshots not available, show proportional." The `positions_data` JSONB in `portfolio_snapshots` contains per-asset data but is not consumed.

- **Simplified realized gains in yearly report**: `aggregateYearlyReport()` calculates `realizedGains` as sale proceeds minus fees (not true FIFO cost basis). The comment says "Simplified realized gain — actual FIFO calc is in tax section."

- **No PDF export on tax page**: Only the analytics reports section has a PDF export button. The tax page only supports CSV export.

- **Twelve Data rate limit**: Code-level threshold at 750 requests/day (free tier is 800). When near limit, falls back to stale cached data. No user-visible warning that data may be stale.

- **CoinGecko rate limit**: No explicit rate limit tracking (unlike Twelve Data). Free tier allows 10-30 req/min. Heavy use could trigger 429 errors.

- **Benchmark is hardcoded to VOO**: `BENCHMARK_SYMBOL = 'VOO'` in `_constants.ts`. Users cannot change the benchmark symbol.

- **No loading.tsx**: The analytics route has no dedicated `loading.tsx` skeleton. Relies on the parent dashboard loading fallback.

- **TWRR skips zero-denominator periods**: When `prevValue + flow <= 0`, the sub-period is silently skipped rather than handled (could understate TWRR for portfolios that were temporarily fully withdrawn).

- **Year selector is not URL-driven**: Changing the year in the reports section or tax page uses client state only. The URL does not update, so refreshing resets to the default year.

- **`eslint-disable` in PDF export**: `pdf-export-button.tsx` contains `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for the `(doc as any).lastAutoTable.finalY` access required by jspdf-autotable.

- **No `loading.tsx` or `error.tsx`**: Neither the main analytics route nor the tax sub-route has dedicated loading or error boundary files.
