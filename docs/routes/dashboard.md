# E11: Dashboard Home

> The central hub for the finance dashboard. Displays portfolio metrics (total value, day change, total return, BTC price), a 30-day performance chart, allocation donut, today's AI market briefing, and a recent activity feed — all fetched in a single parallel server action. Gives a Costa Rica-based VOO/QQQ/BTC investor a complete financial snapshot without navigating to sub-pages.

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
                              ┌───────────────────────────────────────────────┐
                              │           SERVER (page.tsx)                   │
                              │                                               │
                              │  getDashboardData()  ← _actions.ts            │
                              │    │                                          │
                              │    ├─ supabase.from('positions').select(*)    │
                              │    ├─ supabase.from('portfolio_snapshots')    │
                              │    │    .gte(daysAgoCR(30))                   │
                              │    ├─ supabase.from('portfolio_snapshots')    │
                              │    │    .limit(2) (previous snapshots)        │
                              │    ├─ supabase.from('ai_summaries')           │
                              │    │    .eq(todayCR())                        │
                              │    ├─ supabase.from('transactions').limit(5)  │
                              │    ├─ supabase.from('notifications').limit(5) │
                              │    │                                          │
                              │    └─ fetchLivePrices() (parallel per asset)  │
                              │        ├─ fetchPrice(symbol)                  │
                              │        │    → Twelve Data /price              │
                              │        └─ fetchBitcoinPrice()                 │
                              │             → CoinGecko /coins/markets        │
                              └──────────────────┬────────────────────────────┘
                                                 │
                                   DashboardData passed as props
                                                 │
          ┌──────────────────────────────────────┼──────────────────────────────┐
          │                                      │                              │
          ▼                                      ▼                              ▼
┌─────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────┐
│  DashboardMetrics   │  │  DashboardPerformance (CC)   │  │  DashboardSummary (CC)   │
│  Cards (CC)         │  │  Recharts AreaChart          │  │  AI briefing preview     │
│  4-card grid        │  │  30-day snapshots            │  │  Truncated at 300 chars  │
│  useCurrency() hook │  │  → link to /portfolio        │  │  → link to /insights     │
└─────────────────────┘  └──────────────────────────────┘  └──────────────────────────┘
          │
          │  (fetches exchange rate if CRC)
          │  → GET /api/market/exchange-rate
          │      → fetchUsdCrcRate() in lib/market/crypto.ts
          ▼
┌─────────────────────────────┐  ┌──────────────────────────────────┐
│  DashboardAllocation (CC)   │  │  DashboardActivity (CC)          │
│  Recharts PieChart (donut)  │  │  Merged tx + notifications feed  │
│  ASSET_COLORS from          │  │  Top 5 items by timestamp        │
│  portfolio/_constants.ts    │  │  Icons per type (Buy/Sell/DCA)   │
│  → link to /portfolio       │  │  → links to /portfolio, /alerts  │
└─────────────────────────────┘  └──────────────────────────────────┘

SC = Server Component    CC = Client Component ('use client')
```

### Layout Shell (`dashboard/layout.tsx` — Server Component)

The dashboard layout wraps all sub-routes and provides:

1. **Auth gate**: Calls `createClient()` → `getUser()` to validate the session.
2. **Profile fetch**: Calls `getProfile()` from `app/profile/_actions.ts`.
3. **Notifications fetch**: Calls `getNotifications()` from `app/dashboard/dca/_actions.ts`.
4. **AuthProvider** (CC): Hydrates `userAtom` and `profileAtom` Jotai atoms, subscribes to `onAuthStateChange`.
5. **SidebarNav** (CC): Renders `NAV_ITEMS` (9 routes) from `_constants.ts`, with `UserMenu` and `ThemeToggle`.
6. **NotificationCenter** (CC): Bell icon dropdown with mark-read, mark-all-read, and DCA "Mark Done" dialog.
7. **OnboardingModal** (CC): Conditionally rendered when `!profile.base_currency`.

---

## Pages & Navigation

| Path         | Component  | Type             | Description                                             |
| ------------ | ---------- | ---------------- | ------------------------------------------------------- |
| `/dashboard` | `page.tsx` | Server Component | Dashboard home — metric cards, charts, AI summary, feed |

### Loading State

`loading.tsx` exists and renders `DashboardSkeleton` — a full-page skeleton matching the exact layout: header placeholder, 4 metric card skeletons, chart + AI summary row skeletons, allocation + activity row skeletons.

### Auto-refresh

None. The dashboard is rendered server-side on each navigation. The `useCurrency()` hook in `_hooks.ts` fetches the CRC exchange rate client-side via `GET /api/market/exchange-rate` if the user's `base_currency` is `'CRC'`.

### Sub-navigation

No tabs or sub-routes. The dashboard home is a single page. Cross-links to `/dashboard/portfolio`, `/dashboard/insights`, and `/dashboard/alerts` are embedded in component CTAs.

### Sidebar Navigation (`_constants.ts`)

| Title     | Path                   | Icon            |
| --------- | ---------------------- | --------------- |
| Dashboard | `/dashboard`           | LayoutDashboard |
| Portfolio | `/dashboard/portfolio` | Briefcase       |
| Markets   | `/dashboard/market`    | TrendingUp      |
| Bitcoin   | `/dashboard/bitcoin`   | Bitcoin         |
| DCA       | `/dashboard/dca`       | RefreshCw       |
| Alerts    | `/dashboard/alerts`    | Bell            |
| Insights  | `/dashboard/insights`  | Lightbulb       |
| Analytics | `/dashboard/analytics` | BarChart3       |
| Settings  | `/dashboard/settings`  | Settings        |

---

## Why This Feature Exists — User Flows

### Metric Cards (`_components/dashboard-metrics.tsx`)

**What the user sees**: A responsive 4-column grid of cards: Total Value, Day Change, Total Return, BTC Price. Each card has a title with info tooltip, an icon, and a large monospace number.

**What the user can do**:

- Glance at portfolio health: total value formatted in base currency (USD or CRC via `useCurrency()`)
- See day-over-day change with color coding: emerald for gains, rose for losses
- See total unrealized return (current value minus cost basis)
- Check live BTC spot price with 24h change percentage

**Data source**: `getDashboardData()` → `metrics` field (type `DashboardMetrics`)

**Why it matters**: Provides the "pulse check" for a VOO/QQQ/BTC investor — total portfolio value, daily movement, lifetime returns, and the most volatile asset (BTC) at a glance.

**States**:

- Empty: Shows `$0.00` for Total Value, `—` for Day Change/Total Return/BTC Price when no positions or data
- Loading: `DashboardSkeleton` renders 4 card skeletons with pulsing placeholders
- Error: Non-fatal — `ErrorToasts` component fires `sonner` toast notifications for any errors in `data.errors`

---

### Performance Chart (`_components/dashboard-performance.tsx`)

**What the user sees**: An area chart spanning `lg:col-span-4` showing portfolio value over the last 30 days. Emerald gradient fill for upward trends, rose for downward. Header shows 30-day dollar and percentage change. A "View all" ghost button links to `/dashboard/portfolio`.

**What the user can do**:

- Hover data points to see exact date and value in a custom tooltip (USD formatted, no decimals)
- Navigate to Portfolio page for full historical view

**Data source**: `getDashboardData()` → `snapshots` field (type `DashboardSnapshot[]` — `{ date, value }`)

**Why it matters**: Visual trend line shows whether the portfolio is growing or declining, helping the investor decide whether to adjust positions or stay the course.

**States**:

- Empty: Centered icon + "Portfolio snapshots will appear here after your first day" + "Go to Portfolio" button
- Loading: Full-width skeleton rectangle (250px height)
- Data: Recharts `AreaChart` with `CartesianGrid`, `XAxis` (date), `YAxis` (USD compact), gradient fill

---

### AI Briefing (`_components/dashboard-summary.tsx`)

**What the user sees**: A card spanning `lg:col-span-3` with a Sparkles icon, "AI Briefing" title, and today's AI-generated market summary truncated to 300 characters. A "Full insights" link navigates to `/dashboard/insights`.

**What the user can do**:

- Read a preview of today's AI market analysis
- Click through to the full Insights page

**Data source**: `getDashboardData()` → `aiSummary` field (type `string | null`, from `ai_summaries` table where `summary_date = todayCR()`)

**Why it matters**: Delivers AI context about market conditions without the user needing to manually generate or navigate to the Insights page.

**States**:

- Empty: Sparkles icon + "No summary yet today. Generate one on the Insights page." + "Go to Insights" button
- Data: Truncated at `MAX_PREVIEW_LENGTH = 300` characters with "Read more →" link if longer
- Loading: Skeleton text lines (5 rows)

---

### Allocation Chart (`_components/dashboard-allocation.tsx`)

**What the user sees**: A donut chart spanning `lg:col-span-3` showing portfolio allocation by asset. Each slice uses the asset's designated color from `ASSET_COLORS`: VOO (blue), QQQ (purple), BTC (orange). A legend beside the chart shows symbol, percentage, and color dot.

**What the user can do**:

- Hover segments to see symbol, dollar value, and percentage in a custom tooltip
- Click "Details" ghost button to navigate to `/dashboard/portfolio`

**Data source**: `getDashboardData()` → `allocations` field (type `DashboardAllocation[]` — `{ symbol, value, percentage, color }`)

**Why it matters**: Shows whether the portfolio is balanced across ETFs and crypto according to the investor's target allocation strategy.

**States**:

- Empty: PieChart icon + "Add positions to see allocation breakdown." + "Add Position" button
- Loading: Full-width skeleton rectangle (200px height)
- Data: Recharts `PieChart` with `Pie` (innerRadius 50, outerRadius 75) and `Cell` per asset

---

### Recent Activity (`_components/dashboard-activity.tsx`)

**What the user sees**: A card spanning `lg:col-span-4` with the 5 most recent combined transactions and notifications. Each item has a colored icon (emerald for Buy, rose for Sell, sky for DCA/notifications), title, description (quantity @ price for transactions, body text for notifications), and relative timestamp ("2h ago", "3d ago").

**What the user can do**:

- Scan recent portfolio actions at a glance
- Click "View all" to navigate to `/dashboard/portfolio`

**Data source**: `getDashboardData()` → `recentActivity` field (type `ActivityItem[]`, built by `buildActivityFeed()` in `_utils.ts`)

**Why it matters**: Tracks the user's most recent transactions and triggered alerts so they don't lose context about what happened recently.

**States**:

- Empty: Activity icon + "No recent activity" + "Add Position" and "Set Alert" buttons
- Loading: 4 rows of avatar + text skeletons
- Data: Up to 5 items sorted by timestamp descending, merging both transactions and notifications

---

### Error Toasts (`_components/error-toasts.tsx`)

**What the user sees**: Nothing visible in DOM — fires `sonner` toast notifications.

**What it does**: Receives `errors: string[]` from `getDashboardData()`. On mount, shows a `toast.error()` for each unique error message (deduped via `useRef<Set<string>>`).

**Why it matters**: Non-fatal errors (failed price fetches, API timeouts) are surfaced without breaking the page. The dashboard renders partial data gracefully.

---

### Notification Center (`_components/notification-center.tsx`)

**What the user sees**: A bell icon button in the header bar. Unread count badge (destructive variant, "9+" overflow). Dropdown menu listing notifications with unread dot, title, body, and time ago.

**What the user can do**:

- Open dropdown to see notifications
- Click a notification to mark it read (calls `markNotificationRead()`)
- Click "Mark all read" (calls `markAllNotificationsRead()`)
- For `dca_reminder` notifications: Click "Done" to open a `MarkDoneDialog` that records a DCA transaction via `markDcaAsDone()`

**Data source**: `getNotifications()` from `app/dashboard/dca/_actions.ts`, passed via `dashboard/layout.tsx`

---

### Auth Provider (`_components/auth-provider.tsx`)

**What the user sees**: Nothing — invisible wrapper.

**What it does**: Hydrates `userAtom` and `profileAtom` from server-fetched `initialUser` and `initialProfile` props. Subscribes to `supabase.auth.onAuthStateChange()` for real-time session updates.

---

### Sidebar Nav (`_components/sidebar-nav.tsx`)

**What the user sees**: Sidebar with "Finance Dashboard" header, `ThemeToggle` button, 9 navigation items from `NAV_ITEMS`, and `UserMenu` in the footer.

**What the user can do**:

- Navigate between dashboard sub-pages
- Toggle theme (light/dark/system) via `ThemeToggle`
- Open user dropdown (profile link, logout) via `UserMenu`

---

### User Menu (`_components/user-menu.tsx`)

**What the user sees**: Avatar with initials, display name, and email in the sidebar footer. Dropdown with "Profile" link (→ `/dashboard/settings`) and "Log out" button.

**What the user can do**:

- Navigate to settings/profile
- Log out (calls `logout()` from `app/auth/_actions.ts`)

**Data source**: `userAtom` and `profileAtom` via Jotai. Display name computed by `getDisplayName()`, initials by `getInitials()`.

---

### Theme Toggle (`_components/theme-toggle.tsx`)

**What the user sees**: A small icon button (Sun/Moon) in the sidebar header.

**What the user can do**:

- Switch between Light, Dark, and System themes via dropdown menu (uses `next-themes` `setTheme()`)

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`app/dashboard/_actions.ts`)

| Function             | Zod Schema | Tables Read                                                                         | Tables Written | Returns         |
| -------------------- | ---------- | ----------------------------------------------------------------------------------- | -------------- | --------------- |
| `getDashboardData()` | —          | `positions`, `portfolio_snapshots`, `ai_summaries`, `transactions`, `notifications` | —              | `DashboardData` |

**Auth requirement**: Yes — calls `createClient()` → `getUser()`. Returns `emptyDashboard(['Not authenticated'])` if no user.

**Query strategy**: Uses `Promise.allSettled()` to parallel-fetch 6 Supabase queries plus live prices. Individual failures don't crash the page — errors are collected in `data.errors[]`.

**Live price fetching** (`fetchLivePrices` helper):

- For ETFs (VOO, QQQ): `fetchPrice(symbol)` from `lib/market/stocks.ts` → Twelve Data API
- For Crypto (BTC): `fetchBitcoinPrice()` from `lib/market/crypto.ts` → CoinGecko API
- BTC is always fetched (even if not in positions) for the BTC Price metric card
- Failed symbols are tracked and reported in `errors[]`

**Computations**:

- Total value and cost basis: Summed from positions × current prices
- Unrealized P&L: Uses `calculateUnrealizedPnL()` from `app/dashboard/portfolio/_utils.ts`
- Day change: Uses `computeDayChange()` from `_utils.ts` comparing current value against the 2nd-most-recent snapshot
- Allocations: Each position's value as a percentage of total, colored via `ASSET_COLORS`

### API Routes

| Method | Path                        | Auth | Request Body | Response           | External APIs                   |
| ------ | --------------------------- | ---- | ------------ | ------------------ | ------------------------------- |
| `GET`  | `/api/market/exchange-rate` | Yes  | —            | `{ rate: number }` | BCCR via `lib/market/crypto.ts` |

Called by the `useCurrency()` hook when the user's `base_currency` is `'CRC'`. Returns the USD→CRC exchange rate.

### Cron Jobs

None directly owned by the dashboard home. However, it reads data written by:

| Cron                           | Table Written         | Dashboard Reads It Via                       |
| ------------------------------ | --------------------- | -------------------------------------------- |
| `/api/cron/portfolio-snapshot` | `portfolio_snapshots` | `getDashboardData()` → snapshots, day change |
| `/api/cron/ai-summary`         | `ai_summaries`        | `getDashboardData()` → AI briefing card      |

### External APIs

##### Twelve Data (via `lib/market/stocks.ts`)

| Detail                  | Value                                                           |
| ----------------------- | --------------------------------------------------------------- |
| Base URL                | `https://api.twelvedata.com`                                    |
| Auth                    | `TWELVE_DATA_API_KEY` via query param `apikey`                  |
| Free tier limit         | 800 requests/day (throttled at 750 via code)                    |
| Cache TTL               | `CacheTTL.REALTIME_PRICE` (in-memory + Supabase `market_cache`) |
| Fallback if unavailable | Falls back to `average_buy_price` from position                 |

**Endpoints called:**

| Endpoint     | Parameters     | Returns                            | Used for             |
| ------------ | -------------- | ---------------------------------- | -------------------- |
| `GET /price` | `symbol={VOO}` | `{ price: number, close: string }` | Live stock/ETF price |

##### CoinGecko (via `lib/market/crypto.ts`)

| Detail                  | Value                                                           |
| ----------------------- | --------------------------------------------------------------- |
| Base URL                | `https://api.coingecko.com/api/v3`                              |
| Auth                    | `COINGECKO_API_KEY` via `x-cg-demo-api-key` header (optional)   |
| Free tier limit         | 10-30 requests/min (demo key)                                   |
| Cache TTL               | `CacheTTL.REALTIME_PRICE` (in-memory + Supabase `market_cache`) |
| Fallback if unavailable | BTC Price card shows `—`, dashboard renders normally            |

**Endpoints called:**

| Endpoint             | Parameters                                      | Returns                                                             | Used for               |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| `GET /coins/markets` | `vs_currency=usd&ids=bitcoin&per_page=1&page=1` | `[{ current_price, market_cap, price_change_percentage_24h, ... }]` | BTC price + 24h change |

### Types & Interfaces (`_utils.ts`)

| Type                    | Fields                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `DashboardMetrics`      | `totalValue`, `totalCostBasis`, `dayChangeAmount`, `dayChangePct`, `btcPrice`, `btcChange24h` |
| `DashboardAllocation`   | `symbol`, `value`, `percentage`, `color`                                                      |
| `DashboardSnapshot`     | `date`, `value`                                                                               |
| `DashboardTransaction`  | `id`, `type`, `symbol`, `quantity`, `price`, `executed_at`                                    |
| `DashboardNotification` | `id`, `title`, `body`, `type`, `read`, `created_at`                                           |
| `ActivityItem`          | `id`, `kind` (`'transaction' \| 'notification'`), `title`, `description`, `timestamp`         |
| `DashboardData`         | `metrics`, `allocations`, `snapshots`, `aiSummary`, `recentActivity`, `errors`                |

### Utility Functions (`_utils.ts`)

| Function              | Parameters                                                  | Returns                             | Description                                                     |
| --------------------- | ----------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `buildActivityFeed()` | `transactions[]`, `notifications[]`                         | `ActivityItem[]`                    | Merges tx + notifications, sorts by timestamp desc, limits to 5 |
| `computeDayChange()`  | `currentValue: number`, `snapshotValues: { total_value }[]` | `{ dayChangeAmount, dayChangePct }` | Computes day-over-day change from snapshot history              |

### Hooks (`_hooks.ts`)

| Hook            | Returns                                    | Description                                                                                      |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `useCurrency()` | `{ baseCurrency, exchangeRate, format() }` | Reads `profileAtom` for base currency, fetches CRC rate if needed, returns a `format()` function |

### Jotai Atoms (`_atoms.ts`)

| Atom          | Type              | Description                                                                       |
| ------------- | ----------------- | --------------------------------------------------------------------------------- |
| `userAtom`    | `User \| null`    | Supabase auth user, hydrated by `AuthProvider`                                    |
| `profileAtom` | `Profile \| null` | User profile (`id`, `display_name`, `base_currency`, `country`, `risk_tolerance`) |

---

## Database Schema

### `positions`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`

| Column              | Type          | Nullable | Default             | Description                             |
| ------------------- | ------------- | -------- | ------------------- | --------------------------------------- |
| `id`                | `uuid`        | No       | `gen_random_uuid()` | Primary key                             |
| `user_id`           | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE |
| `portfolio_id`      | `uuid`        | No       | —                   | FK → `portfolios(id)` ON DELETE CASCADE |
| `asset_type`        | `text`        | No       | —                   | `CHECK ('ETF', 'Crypto')`               |
| `symbol`            | `text`        | No       | —                   | e.g. `VOO`, `QQQ`, `BTC`                |
| `quantity`          | `numeric`     | No       | —                   | `CHECK (quantity > 0)`                  |
| `average_buy_price` | `numeric`     | No       | —                   | `CHECK (average_buy_price >= 0)`        |
| `notes`             | `text`        | Yes      | —                   | User notes                              |
| `created_at`        | `timestamptz` | No       | `now()`             | Row creation timestamp                  |
| `updated_at`        | `timestamptz` | No       | `now()`             | Last update timestamp                   |

**RLS Policies**: SELECT / INSERT / UPDATE / DELETE where `auth.uid() = user_id`

**Read by**: `getDashboardData()` — fetches all positions, computes allocation and total value.

---

### `portfolio_snapshots`

**Created in**: `supabase/migrations/20260322000000_portfolio_snapshots.sql`

| Column           | Type            | Nullable | Default             | Description                             |
| ---------------- | --------------- | -------- | ------------------- | --------------------------------------- |
| `id`             | `uuid`          | No       | `gen_random_uuid()` | Primary key                             |
| `user_id`        | `uuid`          | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE |
| `portfolio_id`   | `uuid`          | No       | —                   | FK → `portfolios(id)` ON DELETE CASCADE |
| `snapshot_date`  | `date`          | No       | `current_date`      | Date of snapshot                        |
| `total_value`    | `numeric(20,2)` | No       | `0`                 | Total portfolio value at snapshot time  |
| `positions_data` | `jsonb`         | No       | `'[]'::jsonb`       | Individual position data at snapshot    |
| `created_at`     | `timestamptz`   | No       | `now()`             | Row creation timestamp                  |

**Unique constraint**: `(portfolio_id, snapshot_date)` — one snapshot per portfolio per day.

**Indexes**:

- `idx_portfolio_snapshots_user` on `(user_id)`
- `idx_portfolio_snapshots_portfolio_date` on `(portfolio_id, snapshot_date)`

**RLS Policies**: SELECT / INSERT / DELETE where `auth.uid() = user_id`

**Written by**: `/api/cron/portfolio-snapshot`
**Read by**: `getDashboardData()` — 30-day performance chart + day change calculation.

---

### `ai_summaries`

**Created in**: `supabase/migrations/20260323000000_ai_provider_and_summaries.sql`

| Column         | Type          | Nullable | Default             | Description                             |
| -------------- | ------------- | -------- | ------------------- | --------------------------------------- |
| `id`           | `uuid`        | No       | `gen_random_uuid()` | Primary key                             |
| `user_id`      | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE |
| `summary_date` | `date`        | No       | `current_date`      | Date of summary                         |
| `content`      | `text`        | No       | —                   | AI-generated summary text               |
| `model_used`   | `text`        | No       | —                   | Model identifier used for generation    |
| `created_at`   | `timestamptz` | No       | `now()`             | Row creation timestamp                  |

**Unique constraint**: `(user_id, summary_date)` — one summary per user per day.

**RLS Policies**: SELECT / INSERT / UPDATE / DELETE where `auth.uid() = user_id`

**Written by**: `/api/cron/ai-summary`, `/api/ai/health/` routes (Insights page)
**Read by**: `getDashboardData()` — AI briefing card preview.

---

### `transactions`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`

| Column        | Type          | Nullable | Default             | Description                             |
| ------------- | ------------- | -------- | ------------------- | --------------------------------------- |
| `id`          | `uuid`        | No       | `gen_random_uuid()` | Primary key                             |
| `user_id`     | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE |
| `position_id` | `uuid`        | No       | —                   | FK → `positions(id)` ON DELETE CASCADE  |
| `type`        | `text`        | No       | —                   | `CHECK ('Buy', 'Sell', 'DCA')`          |
| `quantity`    | `numeric`     | No       | —                   | `CHECK (quantity > 0)`                  |
| `price`       | `numeric`     | No       | —                   | `CHECK (price >= 0)`                    |
| `fee`         | `numeric`     | No       | `0`                 | `CHECK (fee >= 0)`                      |
| `executed_at` | `timestamptz` | No       | `now()`             | When the transaction occurred           |
| `notes`       | `text`        | Yes      | —                   | User notes                              |
| `created_at`  | `timestamptz` | No       | `now()`             | Row creation timestamp                  |

**RLS Policies**: SELECT / INSERT / UPDATE / DELETE where `auth.uid() = user_id`

**Read by**: `getDashboardData()` — last 5 transactions joined with `positions(symbol)` for the activity feed.

---

### `notifications`

**Created in**: `supabase/migrations/20260322100000_dca_schedule_day_columns.sql`

| Column       | Type          | Nullable | Default             | Description                                                          |
| ------------ | ------------- | -------- | ------------------- | -------------------------------------------------------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | Primary key                                                          |
| `user_id`    | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE                              |
| `type`       | `text`        | No       | —                   | `CHECK ('dca_reminder', 'price_alert', 'indicator_alert', 'system')` |
| `title`      | `text`        | No       | —                   | Notification title                                                   |
| `body`       | `text`        | No       | —                   | Notification body text                                               |
| `read`       | `boolean`     | No       | `false`             | Whether the notification has been read                               |
| `related_id` | `uuid`        | Yes      | —                   | Optional FK to related entity (e.g. DCA schedule)                    |
| `created_at` | `timestamptz` | No       | `now()`             | Row creation timestamp                                               |

**Indexes**:

- `idx_notifications_user_id` on `(user_id)`
- `idx_notifications_unread` on `(user_id)` WHERE `read = false`

**RLS Policies**: SELECT / INSERT / UPDATE / DELETE where `auth.uid() = user_id`

**Read by**: `getDashboardData()` — last 5 notifications for the activity feed. Also read by `getNotifications()` in `dca/_actions.ts` for the `NotificationCenter` dropdown.

---

### Relationships

```
auth.users ──1:1──► profiles
auth.users ──1:N──► portfolios ──1:N──► positions ──1:N──► transactions
                                    └──1:N──► portfolio_snapshots
auth.users ──1:N──► ai_summaries
auth.users ──1:N──► notifications
```

---

## Testing

### `app/dashboard/__tests__/_utils.test.ts`

| Describe Block      | Tests | Key Edge Cases                                                                                                  |
| ------------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| `buildActivityFeed` | 6     | Empty arrays, 5-item limit, array position from Supabase join, null position → `???`, quantity/price formatting |
| `computeDayChange`  | 5     | 2+ snapshots (uses 2nd), single snapshot, empty array, zero previous value, negative change                     |

**Run this feature's tests:**

```bash
npm test -- app/dashboard/__tests__
```

### Test Gaps

- `getDashboardData()` in `_actions.ts` has no unit tests — depends on Supabase client and external API calls
- `fetchLivePrices()` helper has no unit tests
- `useCurrency()` hook in `_hooks.ts` has no unit tests
- `DashboardMetricsCards`, `DashboardPerformance`, `DashboardAllocation`, `DashboardSummary`, `DashboardActivity` components have no tests (UI components)
- `NotificationCenter` component (mark read, mark DCA done flows) has no tests
- `emptyDashboard()` helper is trivial but untested

---

## File Tree

```
app/dashboard/
├── page.tsx                        # Server Component — assembles all dashboard sections
├── layout.tsx                      # Server Component — auth gate, sidebar, notifications
├── loading.tsx                     # Suspense fallback using DashboardSkeleton
├── _actions.ts                     # getDashboardData() — parallel data aggregator
├── _atoms.ts                       # userAtom, profileAtom (Jotai)
├── _constants.ts                   # NAV_ITEMS (9 sidebar routes)
├── _hooks.ts                       # useCurrency() — base currency formatting
├── _utils.ts                       # Types + buildActivityFeed, computeDayChange
├── _components/
│   ├── auth-provider.tsx           # Jotai hydration + onAuthStateChange
│   ├── dashboard-activity.tsx      # Recent activity feed (tx + notifications)
│   ├── dashboard-allocation.tsx    # Donut chart (Recharts PieChart)
│   ├── dashboard-metrics.tsx       # 4-card metric grid
│   ├── dashboard-performance.tsx   # 30-day area chart (Recharts AreaChart)
│   ├── dashboard-skeleton.tsx      # Full-page loading skeleton
│   ├── dashboard-summary.tsx       # AI briefing preview card
│   ├── error-toasts.tsx            # Non-fatal error toast notifications
│   ├── notification-center.tsx     # Bell dropdown with mark-read + DCA done
│   ├── sidebar-nav.tsx             # Sidebar navigation with NAV_ITEMS
│   ├── theme-toggle.tsx            # Light/dark/system theme switcher
│   └── user-menu.tsx               # Avatar, name, email, logout dropdown
└── __tests__/
    └── _utils.test.ts              # buildActivityFeed + computeDayChange tests

# Related files outside the route:

app/dashboard/portfolio/
├── _constants.ts                   # ASSET_COLORS, ASSET_COLOR_CLASSES, CRYPTO_COIN_IDS
└── _utils.ts                       # calculateUnrealizedPnL()

app/dashboard/dca/
└── _actions.ts                     # getNotifications(), markNotificationRead(), markAllNotificationsRead(), markDcaAsDone()

app/profile/
├── _actions.ts                     # getProfile()
└── _components/
    └── onboarding-modal.tsx        # Conditionally rendered in layout

app/auth/
├── _actions.ts                     # logout()
└── _utils.ts                       # getDisplayName(), getInitials()

lib/market/
├── stocks.ts                       # fetchPrice() → Twelve Data
├── crypto.ts                       # fetchBitcoinPrice(), fetchUsdCrcRate() → CoinGecko, BCCR
└── cache.ts                        # getCached(), CacheTTL, rate limit tracking

lib/date/
└── index.ts                        # todayCR(), daysAgoCR()

lib/currency.ts                     # formatCurrency() utility

lib/supabase/
├── server.ts                       # createClient() for Server Components/Actions
└── client.ts                       # createClient() for Client Components

supabase/migrations/
├── 20260320000000_initial_schema.sql           # positions, transactions tables
├── 20260322000000_portfolio_snapshots.sql       # portfolio_snapshots table
├── 20260322100000_dca_schedule_day_columns.sql  # notifications table
└── 20260323000000_ai_provider_and_summaries.sql # ai_summaries table
```

---

## Known Limitations

- **No real-time updates**: The dashboard is statically rendered per request. Live price changes require a page refresh — there is no WebSocket or polling mechanism for the dashboard home.
- **Day change requires snapshots**: If the `/api/cron/portfolio-snapshot` cron hasn't run yet, day change shows `—`. New users see no day change until their second day.
- **BTC always fetched**: Even if the user has no BTC position, `fetchBitcoinPrice()` is called for the BTC Price metric card. This consumes a CoinGecko API call on every page load.
- **Exchange rate fetch on every mount**: The `useCurrency()` hook fetches `/api/market/exchange-rate` via `useEffect` on every component mount when `baseCurrency === 'CRC'`. No client-side caching.
- **Twelve Data rate limit**: Throttled at 750 requests/day (free tier is 800). When near limit, stale cached data is served. If cache is also empty, the position's `average_buy_price` is used as fallback.
- **CoinGecko free tier**: 10-30 requests/min. No explicit rate limit tracking in `crypto.ts` (unlike `stocks.ts`). High traffic could hit limits.
- **Activity feed limited to 5**: `buildActivityFeed()` only shows the 5 most recent items. No pagination or "view more" within the dashboard home.
- **AI summary truncation**: Fixed at 300 characters. Long summaries lose context in the preview. The truncation point may split mid-sentence.
- **Onboarding trigger condition**: `needsOnboarding = profile && !profile.base_currency`, but `base_currency` defaults to `'USD'` in the migration. Auto-created profiles always have a `base_currency`, so the onboarding modal may never trigger for email/password signups (it would only trigger if the column is somehow `null`).
- **No error boundary**: No `error.tsx` exists for the dashboard root. Unhandled server errors during `getDashboardData()` will propagate to the nearest parent error boundary.
