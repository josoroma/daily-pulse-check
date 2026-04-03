# E9: Analytics & Reporting

> **Status**: Completed (3/3 user stories done, all tasks finished)
> **Route**: `app/dashboard/analytics/`
> **SPECS reference**: E9 — US-9.1, US-9.2, US-9.3

## Overview

Epic 9 provides the analytics and reporting layer for the finance dashboard. It calculates portfolio performance metrics, generates monthly/yearly reports with DCA adherence tracking, and produces tax-relevant CSV exports tailored for Costa Rica's territorial tax system. All data is fetched server-side via Supabase with RLS enforcement, computed through pure utility functions, and rendered with client-side components.

---

## Plan

### User Stories

| ID     | Title                            | Status  | Description                                                            |
| ------ | -------------------------------- | ------- | ---------------------------------------------------------------------- |
| US-9.1 | Performance Metrics              | ✅ Done | Total return, TWRR, per-asset breakdown, benchmark comparison vs VOO   |
| US-9.2 | Monthly / Yearly Reports         | ✅ Done | Period-based report aggregation, DCA adherence scoring, PDF export     |
| US-9.3 | Tax-Relevant Export (Costa Rica) | ✅ Done | FIFO realized gains calculator, CSV export, country-specific tax notes |

### Task Breakdown

**US-9.1: Performance Metrics** (6 tasks)

| Task    | Description                                            | File(s)                              |
| ------- | ------------------------------------------------------ | ------------------------------------ |
| T-9.1.1 | Total return calculation (cost basis vs current value) | `_utils.ts` → `calculateTotalReturn` |
| T-9.1.2 | Time-Weighted Rate of Return (TWRR) calculation        | `_utils.ts` → `calculateTWRR`        |
| T-9.1.3 | Per-asset performance table component                  | `_components/per-asset-table.tsx`    |
| T-9.1.4 | Benchmark comparison (portfolio vs VOO)                | `_utils.ts` → `compareToBenchmark`   |
| T-9.1.5 | Analytics page (Server Component entry point)          | `page.tsx`                           |
| T-9.1.6 | Unit tests for return calculations and edge cases      | `__tests__/_utils.test.ts`           |

**US-9.2: Monthly / Yearly Reports** (6 tasks)

| Task    | Description                                     | File(s)                                                  |
| ------- | ----------------------------------------------- | -------------------------------------------------------- |
| T-9.2.1 | Monthly report data aggregation                 | `_utils.ts` → `aggregateMonthlyReport`                   |
| T-9.2.2 | Yearly report data aggregation                  | `_utils.ts` → `aggregateYearlyReport`                    |
| T-9.2.3 | DCA adherence score (scheduled vs executed)     | `_utils.ts` → `calculateDcaAdherence`                    |
| T-9.2.4 | Report viewer component with period selector    | `_components/report-viewer.tsx`, `analytics-reports.tsx` |
| T-9.2.5 | PDF export via jsPDF                            | `_components/pdf-export-button.tsx`                      |
| T-9.2.6 | Unit tests for report aggregation and adherence | `__tests__/_utils.test.ts`                               |

**US-9.3: Tax-Relevant Export** (5 tasks)

| Task    | Description                                             | File(s)                                                 |
| ------- | ------------------------------------------------------- | ------------------------------------------------------- |
| T-9.3.1 | FIFO realized gains calculator                          | `_utils.ts` → `calculateFifoRealizedGains`              |
| T-9.3.2 | CSV export utility for transactions and gains           | `_utils.ts` → `generateCsv`, `downloadCsv`              |
| T-9.3.3 | Country-specific tax notes based on user profile        | `_utils.ts` → `getTaxNote`                              |
| T-9.3.4 | Tax export page with year selector                      | `tax/page.tsx`, `tax/_components/tax-export-client.tsx` |
| T-9.3.5 | Unit tests for FIFO gain calculation with multiple lots | `__tests__/_utils.test.ts`                              |

### Dependencies

- **E3 (Portfolio Tracker)**: `positions` and `transactions` tables must be populated.
- **E5 (DCA Automation)**: `dca_schedules` table required for adherence scoring.
- **E4 (Market Data Engine)**: Live prices from Twelve Data and CoinGecko for current value calculations.
- **Portfolio Snapshots**: `portfolio_snapshots` table populated by the cron job for TWRR and chart data.

---

## Implementation

### File Structure

```
app/dashboard/analytics/
├── page.tsx                        # Server Component — data fetching & orchestration
├── _actions.ts                     # Server Actions — Supabase queries with RLS
├── _utils.ts                       # Pure functions — all calculations & CSV generation
├── _schema.ts                      # Zod schemas — AnalyticsFilter, ReportFilter, TaxExportFilter
├── _constants.ts                   # BENCHMARK_SYMBOL, MONTHS, COSTA_RICA_TAX_NOTE
├── _components/
│   ├── performance-summary.tsx     # 4-card grid: value, return, TWRR, benchmark
│   ├── per-asset-table.tsx         # Sortable table: symbol, cost, value, P&L, return %
│   ├── benchmark-chart.tsx         # Recharts line chart: portfolio vs VOO over time
│   ├── analytics-reports.tsx       # Report container with period/year selector
│   ├── report-viewer.tsx           # Monthly/yearly detail view with breakdown
│   └── pdf-export-button.tsx       # Client-side PDF generation via jsPDF
├── tax/
│   ├── page.tsx                    # Server Component — tax export entry point
│   └── _components/
│       └── tax-export-client.tsx   # Year selector, FIFO table, CSV download buttons
└── __tests__/
    └── _utils.test.ts              # 30+ test cases covering all pure functions
```

### Database Tables Used

The analytics feature reads from five Supabase tables, all protected by Row Level Security (RLS) — users can only access their own data.

| Table                 | Columns Used                                                                               | Purpose in Analytics                               |
| --------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `positions`           | `id`, `user_id`, `symbol`, `asset_type`, `quantity`, `average_buy_price`                   | Source of current holdings for return calculations |
| `transactions`        | `id`, `user_id`, `position_id`, `type`, `quantity`, `price`, `fee`, `executed_at`, `notes` | FIFO lots, cash flow tracking, report aggregation  |
| `portfolio_snapshots` | `user_id`, `snapshot_date`, `total_value`, `positions_data`                                | Historical daily values for TWRR and charts        |
| `dca_schedules`       | `user_id`, `frequency`, `is_active`                                                        | Estimating scheduled DCA count for adherence       |
| `profiles`            | `id`, `country`                                                                            | Country-specific tax notes (Costa Rica)            |

### Server Actions (`_actions.ts`)

All data access is via server actions that authenticate the user and query Supabase:

| Function                            | Query                                                               | Returns                                     |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| `getAnalyticsPositions()`           | `positions` → `SELECT *, portfolio:portfolios(id, name)` by user    | All user positions with portfolio info      |
| `getAnalyticsSnapshots(days)`       | `portfolio_snapshots` by user, optional date filter via `daysAgoCR` | Historical value snapshots                  |
| `getAnalyticsTransactions(year?)`   | `transactions` → `SELECT *, position:positions(symbol, asset_type)` | Transactions with position symbol join      |
| `getDcaScheduleStats(year, month?)` | `dca_schedules` + `transactions` (type=DCA) count                   | `{ scheduled, executed }` counts            |
| `getUserCountry()`                  | `profiles` → `SELECT country` by user                               | Country code for tax note selection         |
| `getTransactionYears()`             | `transactions` → distinct years from `executed_at`                  | Available years for year selector dropdowns |

### External APIs

| API         | Function               | Usage                                                    |
| ----------- | ---------------------- | -------------------------------------------------------- |
| Twelve Data | `fetchPrice(symbol)`   | Live ETF prices (VOO, QQQ) for current portfolio value   |
| Twelve Data | `fetchHistory(symbol)` | 365-day VOO price history for benchmark chart            |
| CoinGecko   | `fetchBitcoinPrice()`  | Live BTC price from CoinGecko via `lib/market/crypto.ts` |

### Core Algorithms

#### Total Return (T-9.1.1)

```
totalCostBasis    = Σ (quantity × average_buy_price)
totalCurrentValue = Σ (quantity × currentPrice)
totalReturn       = totalCurrentValue − totalCostBasis
totalReturnPct    = (totalReturn / totalCostBasis) × 100
```

#### Time-Weighted Rate of Return — TWRR (T-9.1.2)

Eliminates the impact of cash flows (deposits/withdrawals) to show pure investment performance:

```
For each sub-period between snapshots:
  subPeriodReturn = endValue / (startValue + cashFlowOnStartDate)

TWRR = (∏ subPeriodReturn − 1) × 100
```

#### Benchmark Comparison (T-9.1.4)

Compares portfolio return against S&P 500 (VOO) over the same period:

```
benchmarkReturn   = ((endPrice − startPrice) / startPrice) × 100
outperformancePct = portfolioReturnPct − benchmarkReturnPct
```

#### DCA Adherence Score (T-9.2.3)

Measures investing discipline:

```
scheduledCount = Σ (schedules × frequency multiplier × months)
adherencePct   = round((executedCount / scheduledCount) × 100)
```

Frequency multipliers: Daily=30/mo, Weekly=4/mo, Biweekly=2/mo, Monthly=1/mo.

#### FIFO Realized Gains (T-9.3.1)

Uses First-In-First-Out lot matching for tax calculations:

1. Maintain a per-symbol FIFO queue of buy lots (Buy and DCA transactions)
2. On Sell: consume lots from the front of the queue
3. For each lot consumed: `realizedGain = (sellPrice − costPerUnit) × quantity − proratedFee`
4. Track holding period in days for each disposal

Handles partial lot sells, multiple lots per sell, and multi-symbol portfolios independently.

### Zod Schemas (`_schema.ts`)

| Schema                  | Fields                            | Used By                        |
| ----------------------- | --------------------------------- | ------------------------------ |
| `AnalyticsFilterSchema` | `year: int (2020–2100)`           | Year filter for analytics page |
| `ReportFilterSchema`    | `year: int`, `month?: int (1–12)` | Period selector for reports    |
| `TaxExportFilterSchema` | `year: int (2020–2100)`           | Year selector for tax exports  |

### UI Components

| Component            | Type   | Description                                                                     |
| -------------------- | ------ | ------------------------------------------------------------------------------- |
| `PerformanceSummary` | Client | 4-card grid: Portfolio Value, Total Return, TWRR, Benchmark Comparison          |
| `PerAssetTable`      | Client | Sortable table with symbol, cost basis, current value, unrealized P&L, return % |
| `BenchmarkChart`     | Client | Recharts dual-line chart comparing portfolio value vs VOO over time             |
| `AnalyticsReports`   | Client | Container with year selector, monthly tab, yearly tab                           |
| `ReportViewer`       | Client | Detailed monthly/yearly view with breakdown and month-by-month chart            |
| `PdfExportButton`    | Client | Generates and downloads PDF report via jsPDF + jspdf-autotable                  |
| `TaxExportClient`    | Client | Year selector, FIFO realized gains table, CSV download buttons                  |

---

## Review

### Gherkin Acceptance Criteria Coverage

**US-9.1: Performance Metrics** ✅

- ✅ Display total return — `calculateTotalReturn` renders as `$X,XXX (XX.XX%)` via `PerformanceSummary`
- ✅ Display time-weighted return — `calculateTWRR` eliminates cash flow impact
- ✅ Display per-asset performance — `PerAssetTable` shows cost basis, current value, P&L, return % per symbol
- ✅ Compare to benchmarks — Portfolio return compared against VOO (S&P 500) with outperformance indicator

**US-9.2: Monthly / Yearly Reports** ✅

- ✅ Monthly report — Shows starting value, ending value, net deposits, withdrawals, return %, DCA adherence, asset breakdown
- ✅ Yearly report — Shows total invested, total value, realized/unrealized gains, total return %, month-by-month chart
- ✅ DCA adherence score — `calculateDcaAdherence(12, 10)` = 83% matches Gherkin scenario
- ✅ Export report as PDF — `PdfExportButton` generates formatted PDF with all report data

**US-9.3: Tax-Relevant Export** ✅

- ✅ Export realized gains summary — CSV with date, symbol, quantity sold, cost basis, sale price, gain/loss, holding period
- ✅ Export full transaction history — CSV with all buy/sell/DCA transactions
- ✅ Costa Rica tax note — Banner and CSV header: "Costa Rica territorial tax system — foreign investment gains may be exempt. Consult your accountant."
- ✅ Filter by year — Year selector dropdown filters transactions before export

### Test Coverage

The test file (`__tests__/_utils.test.ts`) contains 30+ test cases covering:

| Function                       | Tests                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `calculateTotalReturn`         | Normal return, 15% Gherkin scenario, zero investment, zero cost basis, negative returns |
| `calculatePerAssetPerformance` | Multi-asset breakdown (VOO + BTC)                                                       |
| `calculateTWRR`                | No cash flows, cash flow adjustment, < 2 snapshots, zero value snapshots                |
| `calculateBenchmarkReturn`     | Normal, unsorted prices, < 2 prices, zero start price                                   |
| `compareToBenchmark`           | Outperformance and underperformance detection                                           |
| `aggregateMonthlyReport`       | Normal month aggregation, months with no snapshots                                      |
| `aggregateYearlyReport`        | Full year aggregation with monthly returns                                              |
| `calculateDcaAdherence`        | 83% (10/12), zero scheduled, perfect (100%), zero executions (0%)                       |
| `calculateFifoRealizedGains`   | Simple buy-sell, multiple lots FIFO, partial sells, DCA as lots, no sells, multi-symbol |
| `generateCsv`                  | Basic CSV, header notes, field escaping (commas, quotes)                                |
| `realizedGainsToCsvRows`       | Gain-to-CSV mapping                                                                     |
| `transactionsToCsvRows`        | Transaction-to-CSV mapping                                                              |
| `getTaxNote`                   | CR country code, full name "Costa Rica", unknown country returns undefined              |

### Architecture Compliance

- **Colocated feature boundary**: All analytics logic lives inside `app/dashboard/analytics/` — actions, utils, schemas, components, and tests
- **Server Component entry**: `page.tsx` is a Server Component that fetches data and passes props to client components
- **Pure functions**: All calculations in `_utils.ts` are pure, with no side effects — easy to test
- **RLS enforcement**: Every server action authenticates the user and queries with `user_id` filter
- **Naming conventions**: underscore-prefixed module files (`_actions.ts`, `_utils.ts`, `_schema.ts`), kebab-case components, PascalCase component names
- **No `any` or `@ts-ignore`**: TypeScript strict throughout, proper type exports for all interfaces
- **Dependencies**: jsPDF + jspdf-autotable for PDF generation (client-side only)
