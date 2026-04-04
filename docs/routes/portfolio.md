# E4: Portfolio Tracker

> The Portfolio Tracker is the core investment management feature of the Finance Dashboard. It lets a Costa Rica-based VOO/QQQ/BTC investor manually record positions, log buy/sell/DCA transactions, visualize asset allocation and historical performance, set target allocation percentages, and receive drift-based rebalancing suggestions — all without connecting exchange APIs.

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
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Browser (Client)                                                               │
│  ┌──────────────────────────────────────┐                                       │
│  │  PortfolioTabs ('use client')        │                                       │
│  │  ├── TotalValueCard                  │  Renders 4 metric cards               │
│  │  ├── PositionsTable                  │  Sortable + edit/delete dialogs       │
│  │  │   ├── Sparkline                   │  7d crypto price mini-chart           │
│  │  │   └── PositionForm                │  React Hook Form + Zod                │
│  │  ├── TransactionsTable               │  Filterable by symbol                 │
│  │  │   └── TransactionForm             │  Log buy/sell/DCA dialog              │
│  │  ├── AllocationChart                 │  Recharts PieChart                    │
│  │  ├── TargetAllocationForm            │  Set % targets, live total            │
│  │  ├── DriftIndicator                  │  BarChart + rebalance suggestions     │
│  │  └── PerformanceChart                │  Recharts AreaChart + time ranges     │
│  └──────────────────────────────────────┘                                       │
│         │ form submit (FormData)         ▲ server-rendered data                 │
└─────────┼────────────────────────────────┼──────────────────────────────────────┘
          │                                │
          ▼                                │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Server (Next.js App Router)                                                    │
│                                                                                 │
│  page.tsx (Server Component)                                                    │
│  ├── getOrCreatePortfolio()  → Supabase: portfolios                             │
│  ├── getPositions()          → Supabase: positions                              │
│  ├── getTransactions()       → Supabase: transactions (JOIN positions)          │
│  ├── getPortfolioSnapshots() → Supabase: portfolio_snapshots                    │
│  └── fetchCurrentPrices()                                                       │
│       ├── fetchCoinsMarkets()  → lib/market/crypto.ts → CoinGecko               │
│       │   GET /coins/markets?sparkline=true                                     │
│       ├── fetchBitcoinPrice()  → lib/market/crypto.ts → CoinGecko (fallback)    │
│       │   GET /coins/markets?ids=bitcoin                                        │
│       └── fetchPrice()         → lib/market/stocks.ts → Twelve Data             │
│           GET /price?symbol=VOO                                                 │
│                                                                                 │
│  _actions.ts (Server Actions)                                                   │
│  ├── createPosition()         → Supabase INSERT positions                       │
│  ├── updatePosition()         → Supabase UPDATE positions                       │
│  ├── deletePosition()         → Supabase DELETE positions                       │
│  ├── createTransaction()      → Supabase INSERT transactions + UPDATE positions │
│  ├── updateTargetAllocations()→ Supabase UPDATE portfolios                      │
│  └── getOrCreatePortfolio()   → Supabase SELECT/INSERT portfolios               │
│                                                                                 │
│  _utils.ts (Pure Functions — no I/O)                                            │
│  ├── calculateUnrealizedPnL()                                                   │
│  ├── calculateWeightedAverageCostBasis()                                        │
│  ├── calculateRealizedPnL()                                                     │
│  ├── validateSellQuantity()                                                     │
│  ├── calculateAllocations()                                                     │
│  ├── calculateDrift()                                                           │
│  ├── needsRebalancing()                                                         │
│  ├── generateRebalanceSuggestions()                                             │
│  └── formatUsd() / formatPct() / formatQuantity() / getTimeRangeDays()          │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                                            │
          ▼                                            ▼
┌──────────────────────┐              ┌─────────────────────────────────────┐
│  lib/market/cache.ts │              │  Supabase (Postgres + RLS)          │
│  ├── In-memory cache │              │  ├── portfolios                     │
│  │   TTL: 5 min      │              │  ├── positions                      │
│  └── market_cache    │              │  ├── transactions                   │
│      (Supabase table)│              │  └── portfolio_snapshots            │
│      Stale fallback  │              └─────────────────────────────────────┘
└──────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│  External APIs                                       │
│  ├── CoinGecko  (api.coingecko.com/api/v3)           │
│  │   Crypto prices, sparklines, market data          │
│  └── Twelve Data (api.twelvedata.com)                │
│      ETF real-time prices                            │
└──────────────────────────────────────────────────────┘
```

---

## Pages & Navigation

| Path                   | Component  | Type             | Description                                          |
| ---------------------- | ---------- | ---------------- | ---------------------------------------------------- |
| `/dashboard/portfolio` | `page.tsx` | Server Component | Portfolio entry point — fetches prices, enriches P&L |

### Loading State

`loading.tsx` renders a skeleton with:

- Header placeholder (title + subtitle)
- 4 metric `Card` skeletons (Total Value, 24h Change, Unrealized P&L, Cost Basis)
- Tab bar skeleton + 5-row table skeleton

### Auto-refresh

No automatic polling. Prices are fetched server-side on each page load via `fetchCurrentPrices()`.

### Sub-navigation

Four tabs within `PortfolioTabs` (client component):

1. **Positions** — positions table + "Add Position" button
2. **Transactions** — transaction log + "Log Transaction" button
3. **Allocation** — pie chart + target allocation form + drift indicator
4. **Performance** — area chart with time range buttons (1W/1M/3M/6M/1Y/ALL)

---

## Why This Feature Exists — User Flows

#### Total Value Card (`_components/total-value-card.tsx`)

**What the user sees**: A 4-card grid displaying Total Value ($), 24h Change ($, %), Unrealized P&L ($, %), and Cost Basis ($). Each card has an icon and an info tooltip explaining the metric. Positive values are emerald green, negative values are rose red. All numbers use monospace tabular-nums for alignment.

**What the user can do**:

- View current portfolio value at a glance — no interactive actions

**Data source**: Computed in `page.tsx` by aggregating `positions` with live prices from Twelve Data and CoinGecko

**Why it matters**: The "dashboard of dashboards" — a VOO/QQQ/BTC investor needs to know total wealth, today's market impact, and how their investments compare to what they paid.

**States**:

- Empty: Not rendered (empty state shown instead)
- Loading: 4 `Card` skeletons with `Skeleton` rectangles
- Error: Stale cached price used; if all fail, `ErrorToasts` banner shown

---

#### Empty State (`_components/empty-state.tsx`)

**What the user sees**: A centered card with a `Briefcase` icon, "No positions yet" heading, a description encouraging them to add their first position, and a prominent "Add Position" button.

**What the user can do**:

- Click "Add Position" → opens the `AddPositionModal`

**Data source**: Rendered when `rawPositions.length === 0`

**Why it matters**: Onboarding UX — guides a new user to add VOO, QQQ, or BTC positions immediately.

**States**:

- Only one state: empty

---

#### Positions Table (`_components/positions-table.tsx`)

**What the user sees**: A full-width table with columns: Symbol (color-coded badge), Type, Quantity, Avg Price, Current Price, Value, P&L, P&L %, 7d sparkline (desktop only), and action buttons (edit, delete). Column headers for Symbol, Value, P&L, and P&L % are sortable via `ArrowUpDown` icons. Prices use the `useCurrency` hook for formatting.

**What the user can do**:

- Sort by symbol (alphabetical), value, P&L, or P&L % — toggling asc/desc
- Click **Edit** (pencil icon) → opens Edit Position dialog with `PositionForm` pre-filled
- Click **Delete** (trash icon) → opens `AlertDialog` confirmation → calls `deletePosition(id)` server action

**Data source**: `positions` array enriched with `PositionWithPnL` from `page.tsx`

**Why it matters**: The primary inventory of all holdings — P&L per position tells the investor which bets are working.

**States**:

- Empty: Not rendered (global empty state shown)
- Loading: `PositionsTableSkeleton` — 3 placeholder rows
- Error: Falls back to buy price as current price if live fetch fails

---

#### Position Form (`_components/position-form.tsx`)

**What the user sees**: A form with fields: Asset Type (Select: ETF/Crypto), Symbol (text input), Quantity (number), Buy Price USD (number), Notes (optional text). Buttons show a spinner when submitting. Server-side errors render in a rose-colored banner.

**What the user can do**:

- Fill out the form → `createPosition(FormData)` or `updatePosition(FormData)` server action
- Validation: React Hook Form + `CreatePositionSchema` (Zod) — client-side hints, server-side enforcement

**Data source**: User input → server action → Supabase `positions` table

**Why it matters**: Manual entry means the user doesn't need to expose API keys or grant exchange permissions.

**States**:

- Empty: Default values — ETF asset type, blank fields
- Loading: Submit button disabled with `Loader2` spinner
- Error: Server error message shown in rose banner

---

#### Add Position Modal (`_components/add-position-modal.tsx`)

**What the user sees**: A `Button` reading "+ Add Position" that opens a `Dialog` with the title "Add Position", a description, and the `PositionForm` inside.

**What the user can do**:

- Click the button → dialog opens
- Submit form → dialog auto-closes on success

**Data source**: Wraps `PositionForm` with `portfolioId` prop

**Why it matters**: Entry point for building the portfolio from zero.

**States**:

- Open/Closed dialog states

---

#### Transactions Table (`_components/transactions-table.tsx`)

**What the user sees**: A symbol filter dropdown ("All Symbols" or specific symbols), a transaction count label, and a table with columns: Date, Type (Buy/Sell/DCA badge in green/red/sky), Symbol (color-coded badge), Quantity, Price, Fee, Total. Dates use `formatDateISO()` from `lib/date`.

**What the user can do**:

- Filter transactions by symbol using the `Select` dropdown
- View total cost per transaction (quantity × price + fee)

**Data source**: `transactions` array from `getTransactions()` server action (Supabase SELECT with JOIN on positions for symbol/asset_type)

**Why it matters**: Full paper trail of every buy/sell — essential for tax reporting and tracking DCA discipline.

**States**:

- Empty: "No transactions found." centered message
- Loading: Parent loading skeleton covers this
- Error: Handled at page level

---

#### Transaction Form (`_components/transaction-form.tsx`)

**What the user sees**: A "Log Transaction" outline button that opens a `Dialog`. Form fields: Position (select from existing), Type (Buy/Sell/DCA), Quantity, Price USD, Fee USD, Date (date picker), Notes. Shows available units for Sell type. Success message with realized P&L shown briefly before dialog auto-closes.

**What the user can do**:

- Select a position and log a transaction → `createTransaction(FormData)` server action
- For Sell: oversell prevention — server returns "Insufficient quantity" if selling more than held
- For Buy/DCA: weighted average cost basis recalculated automatically
- Success: shows "Transaction logged. Realized P&L: $X.XX" for sells

**Data source**: User input → server action → Supabase `transactions` + `positions` (updated)

**Why it matters**: Tracks every trade with cost basis and realized P&L — core portfolio accounting.

**States**:

- Empty: Default — Buy type, blank fields
- Loading: Submit button disabled with spinner
- Error: Server error in rose banner
- Success: Green banner with P&L info, auto-closes after 1.5s

---

#### Allocation Chart (`_components/allocation-chart.tsx`)

**What the user sees**: A `Card` with title "Asset Allocation" and info tooltip. Contains a Recharts donut `PieChart` (inner radius 60, outer 90) with asset-colored segments and white gaps. A legend shows each asset's color dot, symbol, percentage, and USD value. Total is shown at the bottom. Tooltip on hover shows symbol, value, and percentage.

**What the user can do**:

- Hover over pie segments to see exact values
- Visual check: is the allocation close to their mental model?

**Data source**: `calculateAllocations()` from `_utils.ts`, fed by enriched positions

**Why it matters**: Visual confirmation of portfolio balance — whether VOO/QQQ/BTC split matches strategy.

**States**:

- Empty: Not rendered when `data.length === 0`
- Loading: Parent skeleton
- Error: Inherited from page

---

#### Target Allocation Form (`_components/target-allocation-form.tsx`)

**What the user sees**: A `Card` with title "Target Allocation" and a description. One row per symbol (or defaults to VOO, QQQ, BTC if no positions) with a label and a number input (0–100, step 0.01). A live "Total" counter turns emerald when exactly 100%, rose otherwise. A "Save Targets" button disables until the total is valid.

**What the user can do**:

- Adjust percentage inputs per symbol
- Click "Save Targets" → `updateTargetAllocations(portfolioId, allocations)` server action
- Server validates sum equals 100% (±0.01 tolerance)

**Data source**: `target_allocations` JSONB column on `portfolios` table

**Why it matters**: Defines the investor's ideal split — e.g., VOO 50%, QQQ 20%, BTC 20%, Cash 10% — against which drift is measured.

**States**:

- Empty: Uses `DEFAULT_ASSETS` = ['VOO', 'QQQ', 'BTC'] with 0% values
- Loading: `useTransition` — button shows "Saving…"
- Error: Red message below inputs
- Success: Green "Targets saved" message

---

#### Drift Indicator (`_components/drift-indicator.tsx`)

**What the user sees**: Two `Card` sections. First card: "Allocation Drift" title with a "Rebalance Needed" (rose) or "On Track" (emerald) badge. Contains a Recharts horizontal `BarChart` comparing target (muted, 30% opacity) vs actual (asset-colored bars) per symbol. Second card (if suggestions exist): "Rebalance Suggestions" — a list of Buy/Sell badges with symbol, USD amount, and unit count.

**What the user can do**:

- Read drift magnitude per asset
- See actionable buy/sell suggestions to restore target allocation

**Data source**: `calculateDrift()` and `generateRebalanceSuggestions()` from `_utils.ts`, only rendered when targets are set and drift items exist

**Why it matters**: Automated rebalancing advice — tells the investor "buy $1,000 of VOO, sell $500 of BTC" to stay disciplined.

**States**:

- Empty: Not rendered when no target allocations are set
- Loading: Parent skeleton
- Error: Inherited from page

---

#### Performance Chart (`_components/performance-chart.tsx`)

**What the user sees**: A `Card` with title "Performance" and a change summary ($ and %) in the description. Time range buttons (1W/1M/3M/6M/1Y/ALL) in the header. A Recharts `AreaChart` with gradient fill — emerald for positive, rose for negative periods. X-axis shows dates, Y-axis shows values in $Xk format. Tooltip shows exact date and value.

**What the user can do**:

- Click time range buttons to filter the chart data
- Hover for exact values on any date

**Data source**: `portfolio_snapshots` table via `getPortfolioSnapshots(null)` — all snapshots loaded, then filtered client-side using `daysAgoCR()` cutoff

**Why it matters**: Historical performance trend — shows if the portfolio is growing over weeks, months, or years.

**States**:

- Empty: "Not enough data for the selected time range. Portfolio snapshots will appear after your first day."
- Loading: Parent skeleton
- Error: Inherited from page

---

#### Sparkline (`_components/sparkline.tsx`)

**What the user sees**: A tiny 80×28px area chart in the "7d" column of the positions table. Green gradient for upward trend, red for downward, based on first vs last price in the 7-day window.

**What the user can do**:

- Visual glance — no interaction

**Data source**: `sparkline_in_7d.price` array from CoinGecko's `/coins/markets` endpoint (crypto only)

**Why it matters**: At-a-glance 7-day price trend without leaving the positions table.

**States**:

- Empty: "—" text when sparkline data has fewer than 2 points
- Loading: Part of positions table skeleton
- Error: Falls back to "—"

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`_actions.ts`)

| Function                    | Zod Schema                | Tables Read                 | Tables Written              | Returns                                    |
| --------------------------- | ------------------------- | --------------------------- | --------------------------- | ------------------------------------------ |
| `getOrCreatePortfolio()`    | —                         | `portfolios`                | `portfolios`                | `{ data: Portfolio } \| { error: string }` |
| `getPortfolio()`            | —                         | `portfolios`                | —                           | `Portfolio \| null`                        |
| `updateTargetAllocations()` | Runtime (sum check)       | —                           | `portfolios`                | `{ success: true } \| { error: string }`   |
| `getPositions()`            | —                         | `positions`                 | —                           | `Position[]`                               |
| `createPosition()`          | `CreatePositionSchema`    | —                           | `positions`                 | `{ success: true } \| { error: string }`   |
| `updatePosition()`          | `UpdatePositionSchema`    | —                           | `positions`                 | `{ success: true } \| { error: string }`   |
| `deletePosition()`          | —                         | —                           | `positions`                 | `{ success: true } \| { error: string }`   |
| `getTransactions()`         | —                         | `transactions`, `positions` | —                           | `Transaction[]`                            |
| `createTransaction()`       | `CreateTransactionSchema` | `positions`                 | `transactions`, `positions` | `{ success, realizedPnl? } \| { error }`   |
| `getPortfolioSnapshots()`   | —                         | `portfolio_snapshots`       | —                           | `PortfolioSnapshot[]`                      |

#### `getOrCreatePortfolio()`

- **Auth**: `createClient()` → `getUser()` — returns `{ error: 'Not authenticated' }` if no user
- **Logic**: SELECT first portfolio by `created_at` ASC; if none exists, INSERT one with name "Main Portfolio"
- **Revalidation**: None (read + conditional write)

#### `updateTargetAllocations(portfolioId, allocations)`

- **Auth**: `createClient()` → `getUser()`
- **Validation**: Sum of values must equal 100 (±0.01 tolerance)
- **Logic**: UPDATE `portfolios.target_allocations` JSONB where `id = portfolioId AND user_id = user.id`
- **Revalidation**: `revalidatePath('/dashboard/portfolio')`

#### `createPosition(formData)`

- **Auth**: `createClient()` → `getUser()`
- **Validation**: `CreatePositionSchema.safeParse()` — asset_type, symbol (uppercased), quantity (positive), average_buy_price (non-negative)
- **Logic**: INSERT into `positions` with `user_id`
- **Revalidation**: `revalidatePath('/dashboard/portfolio')`

#### `updatePosition(formData)`

- **Auth**: `createClient()` → `getUser()`
- **Validation**: `UpdatePositionSchema.safeParse()` — partial fields + required `id`
- **Logic**: UPDATE `positions` where `id AND user_id`
- **Revalidation**: `revalidatePath('/dashboard/portfolio')`

#### `deletePosition(id)`

- **Auth**: `createClient()` → `getUser()`
- **Logic**: DELETE from `positions` where `id AND user_id`
- **Revalidation**: `revalidatePath('/dashboard/portfolio')`

#### `createTransaction(formData)`

- **Auth**: `createClient()` → `getUser()`
- **Validation**: `CreateTransactionSchema.safeParse()` — position_id, type (Buy/Sell/DCA), quantity (positive), price (non-negative), fee (non-negative, default 0), executed_at (coerced Date)
- **Sell logic**: `validateSellQuantity()` → rejects if `sellQuantity > currentQuantity`
- **Buy/DCA logic**: `calculateWeightedAverageCostBasis()` → updates position quantity and average_buy_price
- **Sell logic**: Reduces quantity; if quantity reaches 0, deletes the position
- **Return**: Includes `realizedPnl` for Sell transactions via `calculateRealizedPnL()`
- **Revalidation**: `revalidatePath('/dashboard/portfolio')`

#### `getTransactions(positionId?)`

- **Auth**: `createClient()` → `getUser()`
- **Logic**: SELECT from `transactions` with JOIN on `positions(symbol, asset_type)`, ordered by `executed_at DESC`. Optional filter by `position_id`.

#### `getPortfolioSnapshots(days)`

- **Auth**: `createClient()` → `getUser()`
- **Logic**: SELECT from `portfolio_snapshots` ordered by `snapshot_date ASC`. If `days` is not null, filter using `daysAgoCR(days)` as the lower bound.

### API Routes

No dedicated API routes exist under `app/api/` for portfolio-specific operations. All mutations and queries are handled via Server Actions in `_actions.ts`. Price data is fetched server-side in `page.tsx` using `lib/market/` functions.

### Cron Jobs

None specific to the portfolio feature. Portfolio snapshot creation uses snapshot data from the `portfolio_snapshots` table but the cron mechanism that populates it is outside this feature boundary.

### External APIs

##### Twelve Data

| Detail                  | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| Base URL                | `https://api.twelvedata.com`                                                |
| Auth                    | `TWELVE_DATA_API_KEY` via query parameter `apikey`                          |
| Free tier limit         | 800 requests/day (rate-limited at 750 threshold in code)                    |
| Cache TTL               | 5 minutes (real-time), 24 hours (daily history)                             |
| Fallback if unavailable | Stale data from `market_cache` Supabase table, else position uses buy price |

**Endpoints called:**

| Endpoint     | Parameters          | Returns                                  | Used for          |
| ------------ | ------------------- | ---------------------------------------- | ----------------- |
| `GET /price` | `symbol=VOO&apikey` | `{ symbol, price, timestamp, currency }` | ETF current price |

##### CoinGecko

| Detail                  | Value                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Base URL                | `https://api.coingecko.com/api/v3`                                                                          |
| Auth                    | `COINGECKO_API_KEY` via `x-cg-demo-api-key` header (optional)                                               |
| Free tier limit         | 10–30 calls/minute (demo API key)                                                                           |
| Cache TTL               | 5 minutes (real-time)                                                                                       |
| Fallback if unavailable | Stale data from `market_cache` Supabase table; for crypto, falls back to `fetchBitcoinPrice()` individually |

**Endpoints called:**

| Endpoint             | Parameters                                                                           | Returns                                  | Used for                           |
| -------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------- |
| `GET /coins/markets` | `vs_currency=usd&ids=bitcoin,ethereum&sparkline=true&price_change_percentage=7d,30d` | Array of `CoinMarketData` with sparkline | Batch crypto prices + 7d sparkline |
| `GET /coins/markets` | `vs_currency=usd&ids=bitcoin&sparkline=false`                                        | Array with `current_price`, `market_cap` | Fallback single Bitcoin price      |

### Zod Schemas (`app/portfolio/_schema.ts`)

##### `CreatePositionSchema` → `type CreatePosition`

| Field               | Type                | Constraints                      | Description                    |
| ------------------- | ------------------- | -------------------------------- | ------------------------------ |
| `portfolio_id`      | `string`            | `uuid()`                         | FK to portfolios table         |
| `asset_type`        | `'ETF' \| 'Crypto'` | enum                             | Asset category                 |
| `symbol`            | `string`            | `min(1), max(10), toUpperCase()` | Ticker symbol (e.g., VOO, BTC) |
| `quantity`          | `number`            | `positive()`                     | Number of shares/units         |
| `average_buy_price` | `number`            | `nonnegative()`                  | Average cost per unit          |
| `notes`             | `string`            | `max(500), optional()`           | Optional notes                 |

**Example valid data:**

```typescript
const example: CreatePosition = {
  portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
  asset_type: 'ETF',
  symbol: 'VOO',
  quantity: 10,
  average_buy_price: 450.0,
  notes: 'Initial position via Schwab',
}
```

##### `UpdatePositionSchema` → `type UpdatePosition`

Same fields as `CreatePositionSchema` but all optional via `.partial()`, plus a required `id: string (uuid)`.

##### `CreateTransactionSchema` → `type CreateTransaction`

| Field         | Type                       | Constraints                 | Description                 |
| ------------- | -------------------------- | --------------------------- | --------------------------- |
| `position_id` | `string`                   | `uuid()`                    | FK to positions table       |
| `type`        | `'Buy' \| 'Sell' \| 'DCA'` | enum                        | Transaction type            |
| `quantity`    | `number`                   | `positive()`                | Units traded                |
| `price`       | `number`                   | `nonnegative()`             | Price per unit at execution |
| `fee`         | `number`                   | `nonnegative(), default(0)` | Brokerage/network fee       |
| `executed_at` | `Date`                     | `coerce.date()`             | When the trade was executed |
| `notes`       | `string`                   | `max(500), optional()`      | Optional notes              |

**Example valid data:**

```typescript
const example: CreateTransaction = {
  position_id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'DCA',
  quantity: 5,
  price: 452.0,
  fee: 0,
  executed_at: new Date('2026-03-15T10:00:00Z'),
  notes: 'Weekly DCA buy',
}
```

##### `CreatePortfolioSchema` → `type CreatePortfolio`

| Field         | Type     | Constraints            | Description            |
| ------------- | -------- | ---------------------- | ---------------------- |
| `name`        | `string` | `min(1), max(100)`     | Portfolio display name |
| `description` | `string` | `max(500), optional()` | Optional description   |

---

## Database Schema

#### `portfolios`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`

| Column               | Type          | Nullable | Default             | Description                                                       |
| -------------------- | ------------- | -------- | ------------------- | ----------------------------------------------------------------- |
| `id`                 | `uuid`        | No       | `gen_random_uuid()` | Primary key                                                       |
| `user_id`            | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE                           |
| `name`               | `text`        | No       | `'Main Portfolio'`  | Display name                                                      |
| `description`        | `text`        | Yes      | —                   | Optional description                                              |
| `target_allocations` | `jsonb`       | Yes      | `'{}'`              | Target % per asset, e.g. `{"VOO":50,"QQQ":20,"BTC":20,"Cash":10}` |
| `created_at`         | `timestamptz` | No       | `now()`             | Row creation timestamp                                            |
| `updated_at`         | `timestamptz` | No       | `now()`             | Auto-updated via trigger                                          |

**RLS Policies:**

| Policy                            | Operation | Condition              |
| --------------------------------- | --------- | ---------------------- |
| `Users can view own portfolios`   | SELECT    | `auth.uid() = user_id` |
| `Users can insert own portfolios` | INSERT    | `auth.uid() = user_id` |
| `Users can update own portfolios` | UPDATE    | `auth.uid() = user_id` |
| `Users can delete own portfolios` | DELETE    | `auth.uid() = user_id` |

**Indexes:**

- `idx_portfolios_user_id` on `user_id`

**Triggers:**

- `set_updated_at` → calls `update_updated_at()` on UPDATE

**Written by**: `getOrCreatePortfolio()`, `updateTargetAllocations()` in `_actions.ts`
**Read by**: `getOrCreatePortfolio()`, `getPortfolio()` in `_actions.ts`, `page.tsx`

**Example row:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "d4e5f6a7-b8c9-0123-def0-123456789abc",
  "name": "Main Portfolio",
  "description": null,
  "target_allocations": { "VOO": 50, "QQQ": 20, "BTC": 20, "Cash": 10 },
  "created_at": "2026-03-01T06:00:00Z",
  "updated_at": "2026-03-20T14:30:00Z"
}
```

---

#### `positions`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`

| Column              | Type          | Nullable | Default             | Description                             |
| ------------------- | ------------- | -------- | ------------------- | --------------------------------------- |
| `id`                | `uuid`        | No       | `gen_random_uuid()` | Primary key                             |
| `user_id`           | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE |
| `portfolio_id`      | `uuid`        | No       | —                   | FK → `portfolios(id)` ON DELETE CASCADE |
| `asset_type`        | `text`        | No       | —                   | CHECK `('ETF', 'Crypto')`               |
| `symbol`            | `text`        | No       | —                   | Ticker symbol (e.g., VOO, BTC)          |
| `quantity`          | `numeric`     | No       | —                   | CHECK `quantity > 0`                    |
| `average_buy_price` | `numeric`     | No       | —                   | CHECK `average_buy_price >= 0`          |
| `notes`             | `text`        | Yes      | —                   | Optional notes                          |
| `created_at`        | `timestamptz` | No       | `now()`             | Row creation timestamp                  |
| `updated_at`        | `timestamptz` | No       | `now()`             | Auto-updated via trigger                |

**RLS Policies:**

| Policy                           | Operation | Condition              |
| -------------------------------- | --------- | ---------------------- |
| `Users can view own positions`   | SELECT    | `auth.uid() = user_id` |
| `Users can insert own positions` | INSERT    | `auth.uid() = user_id` |
| `Users can update own positions` | UPDATE    | `auth.uid() = user_id` |
| `Users can delete own positions` | DELETE    | `auth.uid() = user_id` |

**Indexes:**

- `idx_positions_user_id` on `user_id`
- `idx_positions_portfolio_id` on `portfolio_id`
- `idx_positions_symbol` on `symbol`

**Triggers:**

- `set_updated_at` → calls `update_updated_at()` on UPDATE

**Written by**: `createPosition()`, `updatePosition()`, `deletePosition()`, `createTransaction()` in `_actions.ts`
**Read by**: `getPositions()` in `_actions.ts`, `createTransaction()` (to fetch current position for cost basis update)

**Example row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "d4e5f6a7-b8c9-0123-def0-123456789abc",
  "portfolio_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "asset_type": "ETF",
  "symbol": "VOO",
  "quantity": 15,
  "average_buy_price": 452.5,
  "notes": "VOO core position",
  "created_at": "2026-03-01T10:00:00Z",
  "updated_at": "2026-03-15T14:00:00Z"
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
| `type`        | `text`        | No       | —                   | CHECK `('Buy', 'Sell', 'DCA')`          |
| `quantity`    | `numeric`     | No       | —                   | CHECK `quantity > 0`                    |
| `price`       | `numeric`     | No       | —                   | CHECK `price >= 0`                      |
| `fee`         | `numeric`     | No       | `0`                 | CHECK `fee >= 0`                        |
| `executed_at` | `timestamptz` | No       | `now()`             | When the trade happened                 |
| `notes`       | `text`        | Yes      | —                   | Optional notes                          |
| `created_at`  | `timestamptz` | No       | `now()`             | Row creation timestamp                  |

**RLS Policies:**

| Policy                              | Operation | Condition              |
| ----------------------------------- | --------- | ---------------------- |
| `Users can view own transactions`   | SELECT    | `auth.uid() = user_id` |
| `Users can insert own transactions` | INSERT    | `auth.uid() = user_id` |
| `Users can update own transactions` | UPDATE    | `auth.uid() = user_id` |
| `Users can delete own transactions` | DELETE    | `auth.uid() = user_id` |

**Indexes:**

- `idx_transactions_user_id` on `user_id`
- `idx_transactions_position_id` on `position_id`

**Triggers:**

- None (`transactions` has no `updated_at` column)

**Written by**: `createTransaction()` in `_actions.ts`
**Read by**: `getTransactions()` in `_actions.ts`

**Example row:**

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "user_id": "d4e5f6a7-b8c9-0123-def0-123456789abc",
  "position_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "DCA",
  "quantity": 5,
  "price": 452.0,
  "fee": 0,
  "executed_at": "2026-03-15T10:00:00Z",
  "notes": "Weekly DCA buy",
  "created_at": "2026-03-15T10:01:23Z"
}
```

---

#### `portfolio_snapshots`

**Created in**: `supabase/migrations/20260322000000_portfolio_snapshots.sql`

| Column           | Type            | Nullable | Default             | Description                             |
| ---------------- | --------------- | -------- | ------------------- | --------------------------------------- |
| `id`             | `uuid`          | No       | `gen_random_uuid()` | Primary key                             |
| `user_id`        | `uuid`          | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE |
| `portfolio_id`   | `uuid`          | No       | —                   | FK → `portfolios(id)` ON DELETE CASCADE |
| `snapshot_date`  | `date`          | No       | `current_date`      | One snapshot per portfolio per day      |
| `total_value`    | `numeric(20,2)` | No       | `0`                 | Portfolio value at snapshot time        |
| `positions_data` | `jsonb`         | No       | `'[]'::jsonb`       | Snapshot of per-position data           |
| `created_at`     | `timestamptz`   | No       | `now()`             | Row creation timestamp                  |

**Unique constraint**: `(portfolio_id, snapshot_date)` — one snapshot per portfolio per day.

**RLS Policies:**

| Policy                                     | Operation | Condition              |
| ------------------------------------------ | --------- | ---------------------- |
| `Users can read own portfolio snapshots`   | SELECT    | `auth.uid() = user_id` |
| `Users can insert own portfolio snapshots` | INSERT    | `auth.uid() = user_id` |
| `Users can delete own portfolio snapshots` | DELETE    | `auth.uid() = user_id` |

**Indexes:**

- `idx_portfolio_snapshots_user` on `user_id`
- `idx_portfolio_snapshots_portfolio_date` on `(portfolio_id, snapshot_date)`

**Triggers:**

- None

**Written by**: External cron job (outside this feature boundary)
**Read by**: `getPortfolioSnapshots()` in `_actions.ts`

**Example row:**

```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-012345678901",
  "user_id": "d4e5f6a7-b8c9-0123-def0-123456789abc",
  "portfolio_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "snapshot_date": "2026-03-20",
  "total_value": 28750.5,
  "positions_data": [
    { "symbol": "VOO", "value": 14375.25 },
    { "symbol": "QQQ", "value": 5750.1 },
    { "symbol": "BTC", "value": 8625.15 }
  ],
  "created_at": "2026-03-20T06:00:01Z"
}
```

---

### Relationships

```
auth.users
  │
  ├── 1:N ── portfolios (user_id → auth.users.id)
  │             │
  │             ├── 1:N ── positions (portfolio_id → portfolios.id)
  │             │             │
  │             │             └── 1:N ── transactions (position_id → positions.id)
  │             │
  │             └── 1:N ── portfolio_snapshots (portfolio_id → portfolios.id)
  │
  ├── 1:N ── positions (user_id → auth.users.id, redundant FK for RLS)
  ├── 1:N ── transactions (user_id → auth.users.id, redundant FK for RLS)
  └── 1:N ── portfolio_snapshots (user_id → auth.users.id, redundant FK for RLS)
```

Both `positions` and `transactions` carry a `user_id` FK in addition to their parent FK (`portfolio_id`, `position_id`). This redundant FK enables efficient RLS policies without requiring joins.

---

## Testing

#### `__tests__/_utils.test.ts`

| Describe Block                      | Tests | Key Edge Cases                                     |
| ----------------------------------- | ----- | -------------------------------------------------- |
| `calculateUnrealizedPnL`            | 4     | Zero cost basis, fractional crypto quantities      |
| `calculateWeightedAverageCostBasis` | 4     | Starting from zero, zero total quantity, fractions |
| `calculateRealizedPnL`              | 3     | Profit, loss, zero fee                             |
| `validateSellQuantity`              | 3     | Valid sell, exact sell, oversell rejection         |
| `calculateAllocations`              | 2     | Correct percentages, empty array                   |
| `calculateDrift`                    | 1     | Multi-asset drift with missing allocations         |
| `needsRebalancing`                  | 2     | Exceeds threshold, within threshold                |
| `generateRebalanceSuggestions`      | 1     | Buy/sell amounts and unit counts                   |
| `formatUsd`                         | 3     | Positive, negative, zero                           |
| `formatPct`                         | 2     | Positive with + sign, negative                     |
| `formatQuantity`                    | 2     | ETF (4 decimals), crypto (8 decimals)              |
| `getTimeRangeDays`                  | 1     | All 6 time ranges including ALL → null             |

#### `app/portfolio/__tests__/_schema.test.ts`

| Describe Block            | Tests | Key Edge Cases                                                                                         |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `CreatePositionSchema`    | 7     | Valid data, uppercase symbol, negative/zero quantity, empty symbol, invalid asset type, optional notes |
| `UpdatePositionSchema`    | 2     | Partial update with id, missing id rejection                                                           |
| `CreateTransactionSchema` | 3     | Valid buy, negative fee rejection, date coercion                                                       |
| `CreateAlertSchema`       | 3     | Valid alert, default channels, invalid condition                                                       |
| `CreateProfileSchema`     | 1     | Valid profile                                                                                          |

**Run this feature's tests:**

```bash
npm test -- app/dashboard/portfolio
npm test -- app/portfolio
```

### Test Gaps

- No tests for server actions (`_actions.ts`) — these involve Supabase calls which the project convention excludes from testing
- No tests for `page.tsx` server component rendering or price fetching logic
- No tests for `fetchCurrentPrices()` in `page.tsx` — batch price fetch with crypto/ETF branching and fallback logic
- `_constants.ts` has no tests (static values only — acceptable)

---

## File Tree

```
app/dashboard/portfolio/
├── page.tsx                            # Server Component — fetches prices, calculates P&L, renders tabs
├── loading.tsx                         # Suspense skeleton — metric cards + table placeholders
├── _actions.ts                         # Server Actions — portfolio, position, transaction CRUD + snapshots
├── _constants.ts                       # CRYPTO_COIN_IDS, ASSET_COLORS, ASSET_COLOR_CLASSES, TIME_RANGES
├── _utils.ts                           # Pure calculations — P&L, cost basis, allocations, drift, formatting
├── _components/
│   ├── portfolio-tabs.tsx              # Client — tab container (Positions, Transactions, Allocation, Performance)
│   ├── total-value-card.tsx            # Server — 4-card metric grid
│   ├── positions-table.tsx             # Client — sortable table + edit/delete dialogs + skeleton
│   ├── position-form.tsx               # Client — React Hook Form + Zod for add/edit position
│   ├── add-position-modal.tsx          # Client — Dialog trigger for PositionForm
│   ├── transactions-table.tsx          # Client — filterable transaction log
│   ├── transaction-form.tsx            # Client — Dialog form for logging buy/sell/DCA
│   ├── allocation-chart.tsx            # Client — Recharts PieChart donut with legend
│   ├── target-allocation-form.tsx      # Client — percentage inputs with live total validation
│   ├── drift-indicator.tsx             # Client — horizontal BarChart + rebalance suggestions
│   ├── performance-chart.tsx           # Client — Recharts AreaChart with time range buttons
│   ├── sparkline.tsx                   # Client — mini 80×28 area chart for 7d price trend
│   └── empty-state.tsx                 # Server — onboarding UI with Briefcase icon
└── __tests__/
    └── _utils.test.ts                  # 28 tests — P&L, cost basis, allocations, drift, formatting

# Shared schema (used by this feature + alerts):
app/portfolio/
├── _schema.ts                          # Zod schemas: Position, Transaction, Portfolio, Profile, Alert
└── __tests__/
    └── _schema.test.ts                 # 16 tests — schema validation edge cases

# Market data dependencies:
lib/market/
├── stocks.ts                           # fetchPrice() — Twelve Data API
├── crypto.ts                           # fetchBitcoinPrice(), fetchCoinsMarkets() — CoinGecko API
└── cache.ts                            # getCached(), CacheTTL — in-memory + Supabase cache

# Date utilities:
lib/date/
├── index.ts                            # daysAgoCR(), formatDateISO(), toISO()
└── config.ts                           # CR_TIMEZONE, setDefaultOptions()

# Dashboard shared:
app/dashboard/
├── _hooks.ts                           # useCurrency() — currency formatting hook
└── _components/
    └── error-toasts.tsx                # ErrorToasts — renders toast notifications for price failures

# Database:
supabase/migrations/
├── 20260320000000_initial_schema.sql   # portfolios, positions, transactions tables
└── 20260322000000_portfolio_snapshots.sql  # portfolio_snapshots table
```

---

## Known Limitations

- **No real 24h change data**: The "24h Change" card currently shows unrealized P&L (total value minus cost basis), not actual 24-hour price movement. The prop name `dayChangeAmount`/`dayChangePct` is misleading — it passes `totalPnl`/`totalPnlPct` from `page.tsx`.
- **No auto-refresh**: Prices are fetched once on page load. The user must manually refresh the browser to get updated prices. No polling or real-time subscriptions.
- **Snapshot population is external**: The `portfolio_snapshots` table is read by `getPortfolioSnapshots()` but no code in this feature creates snapshots. The performance chart depends on an external cron job.
- **Transaction filtering limited to symbol**: The transactions table only supports filtering by symbol. SPECS.md mentions filtering by type and date range (US-4.3 scenario) but only symbol filtering is implemented.
- **No realized P&L history**: Realized P&L is calculated and returned from `createTransaction()` for Sell transactions but is not persisted or displayed in a summary view.
- **Hardcoded crypto coin IDs**: `CRYPTO_COIN_IDS` only maps BTC, ETH, and SOL. Adding a new crypto requires a code change to `_constants.ts`.
- **Hardcoded asset colors**: `ASSET_COLORS` and `ASSET_COLOR_CLASSES` only cover VOO, QQQ, BTC, ETH, and Cash. Other symbols use a default zinc color.
- **No pagination**: Both positions and transactions tables load all rows without pagination. Could be problematic for users with many transactions.
- **ETF sparklines unavailable**: Sparkline data (7d chart) comes from CoinGecko and is only available for crypto assets. ETF positions show "—" in the 7d column.
- **Position actions path discrepancy with SPECS.md**: SPECS.md T-4.1.3 references `app/portfolio/_actions.ts`, but actual actions are in `app/dashboard/portfolio/_actions.ts`. The shared `app/portfolio/` only contains schemas.
