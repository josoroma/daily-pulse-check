# E7: Alerts & Notifications

> Price and technical indicator alerts for VOO, QQQ, and BTC with multi-channel notification delivery. Users create alerts based on price thresholds, RSI levels, moving average crossovers, or Bitcoin MVRV Z-Score targets. A cron job evaluates all active alerts every 5 minutes, triggers notifications via in-app, email (Resend), and Telegram channels, and marks fired alerts as triggered to prevent re-firing.

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
│  USER                                                                           │
│                                                                                 │
│  1. Create/update/delete alerts                                                 │
│     └─> CreateAlertDialog (CC) ─> form submit ─> createAlert() Server Action    │
│         AlertsTable (CC) ─> toggleAlertStatus() / deleteAlert() Server Actions  │
│                                                                                 │
│  2. View alerts                                                                 │
│     └─> AlertsPage (SC) ─> getAlerts() Server Action ─> Supabase: alerts table  │
│                                                                                 │
│  3. Receive notifications                                                       │
│     └─> NotificationCenter (CC) in dashboard/layout.tsx                         │
│         ─> getNotifications() from dca/_actions.ts ─> Supabase: notifications   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  CRON JOB: /api/cron/alert-evaluation (every 5 min, Edge runtime)               │
│                                                                                 │
│  Auth: Bearer CRON_SECRET header                                                │
│  Client: createAdminClient() (service role key, bypasses RLS)                   │
│                                                                                 │
│  1. Fetch active alerts ─> Supabase: alerts (status='active', not triggered)    │
│                                                                                 │
│  2. Categorize by condition type:                                               │
│     ├─ Price (above/below):                                                     │
│     │   ├─ ETF (VOO/QQQ) ─> fetchPrice() ─> Twelve Data /price                 │
│     │   └─ Crypto (BTC) ─> fetchBitcoinPrice() ─> CoinGecko /coins/markets     │
│     ├─ RSI (rsi_above/rsi_below):                                               │
│     │   ├─ ETF ─> fetchHistory() ─> Twelve Data /time_series                    │
│     │   ├─ BTC ─> fetchBitcoinHistory() ─> CoinGecko /coins/bitcoin/market_chart│
│     │   └─ calculateRsi() ─> lib/indicators/rsi.ts                              │
│     ├─ MA crossover (ma_cross_above/ma_cross_below):                            │
│     │   ├─ Same history sources as RSI                                          │
│     │   └─ calculateMa() ─> lib/indicators/moving-average.ts                    │
│     └─ MVRV (mvrv_above/mvrv_below, BTC only):                                 │
│         └─ fetchMvrvZScore() ─> lib/bitcoin/valuation.ts                        │
│             ├─ CoinGecko /coins/bitcoin (market cap)                            │
│             ├─ CoinGecko /coins/bitcoin/market_chart (365d stddev)              │
│             └─ Blockchain.com Charts API (realized cap estimate)                │
│                                                                                 │
│  3. Evaluate: evaluatePriceAlert / evaluateRsiAlert /                           │
│     evaluateMaCrossAlert / evaluateMvrvAlert ─> _utils.ts                       │
│                                                                                 │
│  4. If fired:                                                                   │
│     ├─ UPDATE alerts ─> status='triggered', is_active=false, last_triggered_at  │
│     ├─ INSERT notifications ─> Supabase: notifications table                    │
│     └─ dispatchNotification() ─> lib/notifications/dispatcher.ts                │
│         ├─ Email ─> sendAlertEmail() ─> Resend API                              │
│         └─ Telegram ─> sendTelegramMessage() ─> Telegram Bot API                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Pages & Navigation

| Path                | Component  | Type             | Description                                              |
| ------------------- | ---------- | ---------------- | -------------------------------------------------------- |
| `/dashboard/alerts` | `page.tsx` | Server Component | Alerts management page with summary cards and alert list |

### Loading State

`loading.tsx` exists. Renders Skeleton placeholders matching the final layout:

- Page header skeleton (title + button)
- 3 summary card skeletons (Active, Triggered, Paused)
- `AlertsTableSkeleton` — 3 skeleton rows with column shapes matching the table

### Auto-Refresh

No client-side polling. The page re-fetches on the server after mutations via `revalidatePath('/dashboard/alerts')`.

### Sub-Navigation

None. Single flat page with no tabs or nested routes.

---

## Why This Feature Exists — User Flows

### Landing on the Alerts Page

The user navigates to `/dashboard/alerts` from the sidebar. The Server Component `page.tsx` calls `getAlerts()` to fetch all alerts for the authenticated user. Three summary cards display counts of Active, Triggered, and Paused alerts. Below, the `AlertsTable` lists all alerts.

---

#### Summary Cards (`page.tsx` — inline)

**What the user sees**: Three `Card` components in a responsive grid (3 columns on md+). Each shows a count with a colored dot indicator:

- Active Alerts — emerald dot
- Triggered — sky dot
- Paused — amber dot

**Data source**: Counts computed from `getAlerts()` response, filtered by `status` field.

**Why it matters**: Quick status overview — how many alerts are monitoring, how many have fired, and how many are paused.

---

#### Alerts Table (`_components/alerts-table.tsx`)

**What the user sees**: A `Table` with columns: Symbol, Condition, Target, Status, Created, Actions. Each row shows:

- Symbol with color coding (VOO=blue, QQQ=purple, BTC=orange)
- Human-readable condition label (e.g., "Price above", "RSI below", "Crosses above MA")
- Target value formatted by type (USD for price, integer for RSI, decimal for MVRV)
- Status badge (Active/Triggered/Paused with semantic colors)
- Creation date
- Action buttons

**What the user can do**:

- **Pause/Resume**: Click the pause/play icon button to toggle between `active` and `paused` status. Calls `toggleAlertStatus()` server action. Not available for already triggered alerts.
- **Delete**: Click the trash icon to open a confirmation `AlertDialog`. Confirming calls `deleteAlert()` server action. Permanent removal.

**Data source**: `getAlerts()` server action in `_actions.ts`

**Why it matters**: Central management point for all alerts. Users can quickly see which alerts are monitoring their portfolio and take action.

**States**:

- Empty: Centered empty state with bell icon, "No alerts yet" heading, and descriptive text encouraging the user to create alerts
- Loading: `AlertsTableSkeleton` — 3 skeleton rows matching table column layout
- Error: Toast notifications via Sonner for action failures (toggle, delete)

---

#### Alert Status Badge (`_components/alert-status-badge.tsx`)

**What the user sees**: An outline `Badge` with semantic color for each status:

- Active: emerald (`bg-emerald-500/10 text-emerald-400 border-emerald-500/20`)
- Triggered: sky (`bg-sky-500/10 text-sky-400 border-sky-500/20`)
- Paused: amber (`bg-amber-500/10 text-amber-400 border-amber-500/20`)

**Why it matters**: Instant visual distinction between alert states.

---

#### Create Alert Dialog (`_components/create-alert-dialog.tsx`)

**What the user sees**: A "Create Alert" button (with Plus icon) in the page header. Clicking opens a `Dialog` modal with a form:

1. **Asset** (`Select`): VOO, QQQ, or BTC
2. **Condition** (`Select`): Available options adapt to the selected asset:
   - All assets: Price above, Price below, RSI above, RSI below, Crosses above MA, Crosses below MA
   - BTC only: MVRV Z-Score above, MVRV Z-Score below
3. **Threshold** (`Input`): Numeric input. Label and step change by condition type:
   - Price: "Target Price ($)", step 0.01, placeholder "470.00"
   - RSI: "RSI Threshold (0–100)", step 1, max 100, placeholder "30"
   - MVRV: "MVRV Z-Score Threshold", step 0.1, placeholder "6.0"
4. **RSI Period** (`Input`): Shown only for RSI conditions. Min 2, max 100, default 14.
5. **MA Period & Type** (shown only for MA conditions):
   - Period (`Input`): Min 5, max 500, default 200
   - Type (`Select`): SMA or EMA

**What the user can do**:

- Fill out the form and submit. Validated client-side via `zodResolver(CreateAlertSchema)` with React Hook Form.
- On submit, data is serialized to `FormData` and passed to `createAlert()` server action.
- Success: toast "Alert created", form resets, dialog closes.
- Error: toast with error message from server.

**Data source**: Form state managed by React Hook Form. No server data fetch in the dialog.

**Why it matters**: Enables the core use case — setting alerts for VOO, QQQ, and BTC with price targets or technical indicator thresholds so the user can be notified of significant market events without constantly watching prices.

**States**:

- Loading: Submit button shows "Creating..." while pending
- Error: Field-level validation messages in rose text; server errors via toast

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`_actions.ts`)

| Function              | Zod Schema          | Tables Read | Tables Written | Returns                    |
| --------------------- | ------------------- | ----------- | -------------- | -------------------------- |
| `getAlerts()`         | None                | `alerts`    | None           | `AlertRow[]`               |
| `createAlert()`       | `CreateAlertSchema` | None        | `alerts`       | `{ success } \| { error }` |
| `updateAlert()`       | `UpdateAlertSchema` | None        | `alerts`       | `{ success } \| { error }` |
| `toggleAlertStatus()` | `z.string().uuid()` | None        | `alerts`       | `{ success } \| { error }` |
| `deleteAlert()`       | `z.string().uuid()` | None        | `alerts`       | `{ success } \| { error }` |

#### `getAlerts()`

- **Auth**: Calls `createClient()` + `supabase.auth.getUser()`. Returns `[]` if unauthenticated.
- **Validation**: None (read-only).
- **DB operation**: `SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC`.
- **Return type**: `AlertRow[]` (cast from Supabase response).

#### `createAlert(formData: FormData)`

- **Auth**: Calls `createClient()` + `supabase.auth.getUser()`. Returns `{ error: 'Not authenticated' }` if no user.
- **Validation**: Parses `FormData` into `CreateAlertSchema`. Returns first Zod issue message on failure.
- **DB operation**: `INSERT INTO alerts` with `user_id`, `symbol`, `asset_type` (from `SYMBOL_ASSET_MAP`), `condition`, `threshold`, `notification_channels`, `parameters`, `status='active'`, `is_active=true`.
- **Side effect**: `revalidatePath('/dashboard/alerts')`.

#### `updateAlert(formData: FormData)`

- **Auth**: Calls `createClient()` + `supabase.auth.getUser()`.
- **Validation**: Parses `FormData` into `UpdateAlertSchema`.
- **DB operation**: `UPDATE alerts SET ... WHERE id = $1 AND user_id = $2`. Syncs `is_active` with `status` (active → true, otherwise false).
- **Side effect**: `revalidatePath('/dashboard/alerts')`.

#### `toggleAlertStatus(id: string, status: 'active' | 'paused')`

- **Auth**: Calls `createClient()` + `supabase.auth.getUser()`.
- **Validation**: `z.string().uuid()` on `id`.
- **DB operation**: `UPDATE alerts SET status = $1, is_active = $2 WHERE id = $3 AND user_id = $4`.
- **Side effect**: `revalidatePath('/dashboard/alerts')`.

#### `deleteAlert(id: string)`

- **Auth**: Calls `createClient()` + `supabase.auth.getUser()`.
- **Validation**: `z.string().uuid()` on `id`.
- **DB operation**: `DELETE FROM alerts WHERE id = $1 AND user_id = $2`.
- **Side effect**: `revalidatePath('/dashboard/alerts')`.

---

### API Routes

| Method | Path                         | Auth                 | Request Body | Response                                                                 | External APIs                                            |
| ------ | ---------------------------- | -------------------- | ------------ | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| `GET`  | `/api/cron/alert-evaluation` | `Bearer CRON_SECRET` | None         | `{ processed: number, triggered: number, symbols: { symbol, price }[] }` | Twelve Data, CoinGecko, Blockchain.com, Resend, Telegram |

#### `/api/cron/alert-evaluation`

- **Runtime**: Edge (`export const runtime = 'edge'`)
- **Auth**: Checks `authorization` header against `Bearer ${process.env.CRON_SECRET}`. Returns 401 if mismatch.
- **Rate limiting**: None at the route level. External API rate limits handled by `lib/market/cache.ts` (stale cache fallback).
- **Cache behavior**: Uses in-memory + Supabase `market_cache` table via `getCached()` in `lib/market/stocks.ts` and `lib/market/crypto.ts`.
- **Error response**: `{ error: string }` with status 500 on database errors. Individual API failures are caught and logged — processing continues for other alerts.
- **Flow**:
  1. Fetch all active, non-triggered alerts via `createAdminClient()` (bypasses RLS).
  2. Categorize alerts into price, RSI, MA, and MVRV buckets.
  3. Fetch current prices and historical data in parallel (one API call per unique symbol).
  4. Evaluate each alert against current data using functions from `_utils.ts`.
  5. Update triggered alerts: set `status='triggered'`, `is_active=false`, `last_triggered_at=now()`.
  6. Insert notification records into `notifications` table.
  7. Dispatch to external channels: fetch user profiles for channel preferences, look up email from `auth.admin.listUsers()`, call `dispatchNotification()`.

---

### Cron Jobs

| Schedule      | Route                        | What It Does                                                                    | Tables Affected                                                     | External APIs                                            |
| ------------- | ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| `*/5 * * * *` | `/api/cron/alert-evaluation` | Evaluates all active alerts against current market data, triggers notifications | `alerts` (read+update), `notifications` (insert), `profiles` (read) | Twelve Data, CoinGecko, Blockchain.com, Resend, Telegram |

---

### External APIs

##### Twelve Data

| Detail                  | Value                                                                             |
| ----------------------- | --------------------------------------------------------------------------------- |
| Base URL                | `https://api.twelvedata.com`                                                      |
| Auth                    | `TWELVE_DATA_API_KEY` via query param `apikey`                                    |
| Free tier limit         | 800 requests/day (threshold at 750)                                               |
| Cache TTL               | `CacheTTL.REALTIME_PRICE` for current price, `CacheTTL.DAILY_HISTORY` for history |
| Fallback if unavailable | Serves stale data from `market_cache` Supabase table                              |

**Endpoints called:**

| Endpoint           | Parameters                              | Returns                                  | Used for                          |
| ------------------ | --------------------------------------- | ---------------------------------------- | --------------------------------- |
| `GET /price`       | `symbol`, `apikey`                      | `{ symbol, price, timestamp, currency }` | Current price for VOO/QQQ alerts  |
| `GET /time_series` | `symbol`, `interval=1day`, `outputsize` | `{ meta: { symbol }, values: OHLCV[] }`  | Historical data for RSI/MA alerts |

##### CoinGecko

| Detail                  | Value                                                                     |
| ----------------------- | ------------------------------------------------------------------------- |
| Base URL                | `https://api.coingecko.com/api/v3`                                        |
| Auth                    | `COINGECKO_API_KEY` via `x-cg-demo-api-key` header                        |
| Free tier limit         | 10,000 requests/month (demo key)                                          |
| Cache TTL               | `CacheTTL.REALTIME_PRICE` for price, `CacheTTL.DAILY_HISTORY` for history |
| Fallback if unavailable | Serves stale data from `market_cache` Supabase table                      |

**Endpoints called:**

| Endpoint                          | Parameters                                      | Returns                                         | Used for                           |
| --------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| `GET /coins/markets`              | `vs_currency=usd`, `ids=bitcoin`                | `[{ current_price, market_cap, ... }]`          | Current BTC price for price alerts |
| `GET /coins/bitcoin/market_chart` | `vs_currency=usd`, `days=N`                     | `{ prices: [[timestamp, price]] }`              | BTC history for RSI/MA alerts      |
| `GET /coins/bitcoin`              | `localization=false`, `tickers=false`           | `{ market_data: { market_cap, total_supply } }` | MVRV Z-Score calculation           |
| `GET /coins/bitcoin/market_chart` | `vs_currency=usd`, `days=365`, `interval=daily` | `{ market_caps: [[timestamp, cap]] }`           | MVRV Z-Score stddev calculation    |

##### Blockchain.com Charts API

| Detail                  | Value                                              |
| ----------------------- | -------------------------------------------------- |
| Base URL                | `https://api.blockchain.info`                      |
| Auth                    | None required                                      |
| Free tier limit         | Undocumented (public API)                          |
| Cache TTL               | `CacheTTL.DAILY_HISTORY`                           |
| Fallback if unavailable | MVRV calculation falls back to thermocap heuristic |

**Endpoints called:**

| Endpoint                   | Parameters                    | Returns                               | Used for                                         |
| -------------------------- | ----------------------------- | ------------------------------------- | ------------------------------------------------ |
| `GET /charts/market-price` | `timespan=all`, `format=json` | `{ values: [{ x: unix, y: price }] }` | Full BTC price history for realized cap estimate |

##### Resend (Email)

| Detail                  | Value                                               |
| ----------------------- | --------------------------------------------------- |
| Base URL                | `https://api.resend.com`                            |
| Auth                    | `RESEND_API_KEY` via `Authorization: Bearer` header |
| Free tier limit         | 100 emails/day, 3,000/month                         |
| Cache TTL               | None (transactional)                                |
| Fallback if unavailable | Email silently fails; logged to console             |

**Endpoints called:**

| Endpoint       | Parameters                          | Returns  | Used for                          |
| -------------- | ----------------------------------- | -------- | --------------------------------- |
| `POST /emails` | `{ from, to, subject, html, text }` | `{ id }` | Sending alert notification emails |

Sender address from `RESEND_FROM_EMAIL` env var (defaults to `alerts@finance.local`).

##### Telegram Bot API

| Detail                  | Value                                      |
| ----------------------- | ------------------------------------------ |
| Base URL                | `https://api.telegram.org`                 |
| Auth                    | `TELEGRAM_BOT_TOKEN` in URL path           |
| Free tier limit         | 30 messages/second per bot                 |
| Cache TTL               | None (transactional)                       |
| Fallback if unavailable | Telegram silently fails; logged to console |

**Endpoints called:**

| Endpoint                       | Parameters                              | Returns                          | Used for                            |
| ------------------------------ | --------------------------------------- | -------------------------------- | ----------------------------------- |
| `POST /bot{token}/sendMessage` | `{ chat_id, text, parse_mode: 'HTML' }` | `{ ok, result: { message_id } }` | Sending alert notification messages |

---

### Zod Schemas (`_schema.ts`)

##### `CreateAlertSchema` → `type CreateAlert`

| Field                   | Type                                    | Constraints                                  | Description                    |
| ----------------------- | --------------------------------------- | -------------------------------------------- | ------------------------------ |
| `symbol`                | `'VOO' \| 'QQQ' \| 'BTC'`               | `z.enum(ALERT_SYMBOLS)`                      | Asset to monitor               |
| `condition`             | `AlertCondition`                        | `z.enum(ALL_CONDITIONS)`                     | Alert trigger condition        |
| `threshold`             | `number`                                | `positive()`, RSI refine: 0–100              | Target value for the condition |
| `notification_channels` | `('in_app' \| 'email' \| 'telegram')[]` | `min(1)`, default `['in_app']`               | Channels to notify on trigger  |
| `parameters`            | `{ rsi_period?, ma_period?, ma_type? }` | RSI: int 2–100; MA: int 5–500; type: SMA/EMA | Indicator-specific config      |

Refinement: If condition starts with `rsi_`, threshold must be 0–100.

**Example valid data:**

```typescript
const example: CreateAlert = {
  symbol: 'VOO',
  condition: 'above',
  threshold: 470,
  notification_channels: ['in_app', 'email'],
  parameters: {},
}
```

```typescript
const rsiExample: CreateAlert = {
  symbol: 'QQQ',
  condition: 'rsi_below',
  threshold: 30,
  notification_channels: ['in_app', 'telegram'],
  parameters: { rsi_period: 14 },
}
```

```typescript
const mvrvExample: CreateAlert = {
  symbol: 'BTC',
  condition: 'mvrv_above',
  threshold: 6,
  notification_channels: ['in_app'],
  parameters: {},
}
```

##### `UpdateAlertSchema` → `type UpdateAlert`

| Field                   | Type                                    | Constraints            | Description                 |
| ----------------------- | --------------------------------------- | ---------------------- | --------------------------- |
| `id`                    | `string`                                | `uuid()`               | Alert ID to update          |
| `status`                | `'active' \| 'triggered' \| 'paused'`   | Optional               | New status                  |
| `threshold`             | `number`                                | `positive()`, optional | New threshold value         |
| `notification_channels` | `('in_app' \| 'email' \| 'telegram')[]` | `min(1)`, optional     | Updated channel preferences |

**Example valid data:**

```typescript
const example: UpdateAlert = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  status: 'paused',
}
```

---

## Database Schema

#### `alerts`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`
**Modified in**: `supabase/migrations/20260325000000_alerts_status_and_indicators.sql`

| Column                  | Type          | Nullable | Default             | Description                                      |
| ----------------------- | ------------- | -------- | ------------------- | ------------------------------------------------ |
| `id`                    | `uuid`        | No       | `gen_random_uuid()` | Primary key                                      |
| `user_id`               | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE          |
| `symbol`                | `text`        | No       | —                   | Asset symbol: VOO, QQQ, or BTC                   |
| `asset_type`            | `text`        | No       | —                   | `'ETF'` or `'Crypto'`                            |
| `condition`             | `text`        | No       | —                   | Alert condition (see CHECK constraint)           |
| `threshold`             | `numeric`     | No       | —                   | Target value for the condition                   |
| `status`                | `text`        | No       | `'active'`          | `'active'`, `'triggered'`, or `'paused'`         |
| `is_active`             | `boolean`     | No       | `true`              | Redundant with status — kept for backward compat |
| `parameters`            | `jsonb`       | No       | `'{}'`              | Indicator config: rsi_period, ma_period, ma_type |
| `notification_channels` | `text[]`      | No       | `'{in_app}'`        | Delivery channels for this alert                 |
| `last_triggered_at`     | `timestamptz` | Yes      | —                   | When the alert last fired (null = never)         |
| `created_at`            | `timestamptz` | No       | `now()`             | Creation timestamp                               |
| `updated_at`            | `timestamptz` | No       | `now()`             | Last update timestamp (auto via trigger)         |

**CHECK constraints:**

- `asset_type IN ('ETF', 'Crypto')`
- `condition IN ('above', 'below', 'pct_change_up', 'pct_change_down', 'rsi_above', 'rsi_below', 'ma_cross_above', 'ma_cross_below', 'mvrv_above', 'mvrv_below')`
- `status IN ('active', 'triggered', 'paused')`

**RLS Policies:**

| Policy                      | Operation | Condition              |
| --------------------------- | --------- | ---------------------- |
| Users can view own alerts   | SELECT    | `auth.uid() = user_id` |
| Users can insert own alerts | INSERT    | `auth.uid() = user_id` |
| Users can update own alerts | UPDATE    | `auth.uid() = user_id` |
| Users can delete own alerts | DELETE    | `auth.uid() = user_id` |

**Indexes:**

- `idx_alerts_user_id` on `user_id`
- `idx_alerts_symbol` on `symbol`
- `idx_alerts_active` on `status` WHERE `status = 'active'` (partial index for cron job)

**Triggers:**

- No explicit `set_updated_at` trigger for alerts in the migration (the initial schema only creates triggers for `profiles`, `portfolios`, `positions`, and `dca_schedules`). The `updated_at` column exists but is not auto-updated via trigger.

**Written by**: `createAlert()`, `updateAlert()`, `toggleAlertStatus()` in `_actions.ts`; `/api/cron/alert-evaluation/route.ts` (bulk update triggered alerts via admin client)
**Read by**: `getAlerts()` in `_actions.ts`; `/api/cron/alert-evaluation/route.ts` (fetch active alerts)

**Example row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "symbol": "VOO",
  "asset_type": "ETF",
  "condition": "above",
  "threshold": 470,
  "status": "active",
  "is_active": true,
  "parameters": {},
  "notification_channels": ["in_app", "email"],
  "last_triggered_at": null,
  "created_at": "2026-03-25T14:30:00Z",
  "updated_at": "2026-03-25T14:30:00Z"
}
```

---

#### `notifications`

**Created in**: `supabase/migrations/20260322100000_dca_schedule_day_columns.sql`

| Column       | Type          | Nullable | Default             | Description                                                           |
| ------------ | ------------- | -------- | ------------------- | --------------------------------------------------------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | Primary key                                                           |
| `user_id`    | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE                               |
| `type`       | `text`        | No       | —                   | `'dca_reminder'`, `'price_alert'`, `'indicator_alert'`, or `'system'` |
| `title`      | `text`        | No       | —                   | Notification title                                                    |
| `body`       | `text`        | No       | —                   | Notification body text                                                |
| `read`       | `boolean`     | No       | `false`             | Whether the user has read this notification                           |
| `related_id` | `uuid`        | Yes      | —                   | FK to the alert ID that triggered this notification                   |
| `created_at` | `timestamptz` | No       | `now()`             | Creation timestamp                                                    |

**RLS Policies:**

| Policy                             | Operation | Condition              |
| ---------------------------------- | --------- | ---------------------- |
| Users can view own notifications   | SELECT    | `auth.uid() = user_id` |
| Users can insert own notifications | INSERT    | `auth.uid() = user_id` |
| Users can update own notifications | UPDATE    | `auth.uid() = user_id` |
| Users can delete own notifications | DELETE    | `auth.uid() = user_id` |

**Indexes:**

- `idx_notifications_user_id` on `user_id`
- `idx_notifications_unread` on `user_id` WHERE `read = false` (partial index)

**Triggers:** None

**Written by**: `/api/cron/alert-evaluation/route.ts` (INSERT via admin client); `markNotificationRead()`, `markAllNotificationsRead()` in `dca/_actions.ts`
**Read by**: `getNotifications()` in `dca/_actions.ts`; `getDashboardData()` in `dashboard/_actions.ts`

**Example row:**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "user_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "type": "price_alert",
  "title": "Alert: VOO ↑",
  "body": "VOO has risen above $470.00 (current: $472.35)",
  "read": false,
  "related_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-04-01T15:05:00Z"
}
```

---

### Relationships

```
auth.users
  │
  ├─── alerts (user_id FK, ON DELETE CASCADE)
  │       │
  │       └─── notifications.related_id (logical FK, not enforced)
  │
  ├─── notifications (user_id FK, ON DELETE CASCADE)
  │
  └─── profiles (id FK, ON DELETE CASCADE)
           ├── notification_email_enabled
           ├── notification_telegram_enabled
           └── telegram_chat_id
```

The `profiles` table (modified in `20260325000000_alerts_status_and_indicators.sql`) stores notification channel preferences:

- `notification_email_enabled` (boolean, default false)
- `notification_telegram_enabled` (boolean, default false)
- `telegram_chat_id` (text, nullable)

---

## Testing

#### `__tests__/_schema.test.ts`

| Describe Block      | Tests | Key Edge Cases                                                                         |
| ------------------- | ----- | -------------------------------------------------------------------------------------- |
| `CreateAlertSchema` | 9     | Invalid symbol (AAPL), negative threshold, RSI >100, empty channels, invalid condition |
| `UpdateAlertSchema` | 4     | Status-only update, threshold update, invalid UUID, invalid status                     |
| `SYMBOL_ASSET_MAP`  | 2     | VOO/QQQ → ETF, BTC → Crypto                                                            |

#### `__tests__/_utils.test.ts`

| Describe Block         | Tests | Key Edge Cases                                                                                  |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `evaluatePriceAlert`   | 8     | Fires at threshold (above/below), paused alerts, triggered alerts, already-triggered no re-fire |
| `evaluateRsiAlert`     | 5     | Oversold (28.5), overbought (72.3), within range, inactive, at threshold                        |
| `evaluateMaCrossAlert` | 4     | Cross below MA, cross above MA, price above MA (no fire), already triggered                     |
| `evaluateMvrvAlert`    | 3     | Z-Score above threshold, below threshold, within range                                          |
| `getNotificationType`  | 2     | Price conditions → price_alert, indicator conditions → indicator_alert                          |

#### `lib/notifications/__tests__/dispatcher.test.ts`

| Describe Block        | Tests | Key Edge Cases                                                                      |
| --------------------- | ----- | ----------------------------------------------------------------------------------- |
| `hasExternalChannels` | 6     | No channels, email enabled no address, telegram enabled no chat_id, both configured |

#### `lib/notifications/__tests__/telegram.test.ts`

| Describe Block        | Tests | Key Edge Cases                                                       |
| --------------------- | ----- | -------------------------------------------------------------------- |
| `formatAlertTelegram` | 5     | Bold HTML title, body text, HTML entity escaping, newline separation |

**Run this feature's tests:**

```bash
npm test -- app/dashboard/alerts
npm test -- lib/notifications
```

---

### Test Gaps

- `_actions.ts` — no tests for `createAlert()`, `updateAlert()`, `toggleAlertStatus()`, `deleteAlert()`, `getAlerts()` (server actions require Supabase mocking)
- `/api/cron/alert-evaluation/route.ts` — no integration tests for the cron endpoint
- `lib/notifications/email.ts` — no tests for `sendAlertEmail()` or `formatAlertEmailHtml()`
- `lib/notifications/dispatcher.ts` — `dispatchNotification()` function itself is not tested (only `hasExternalChannels` helper is tested)
- `_components/` — no component tests for `AlertsTable`, `CreateAlertDialog`, or `AlertStatusBadge`

---

## File Tree

```
app/dashboard/alerts/
├── page.tsx                         # Server Component — fetches alerts, renders summary cards + table
├── loading.tsx                      # Suspense fallback with Skeleton placeholders
├── _actions.ts                      # Server Actions: getAlerts, createAlert, updateAlert, toggleAlertStatus, deleteAlert
├── _schema.ts                       # Zod schemas (CreateAlertSchema, UpdateAlertSchema), types, constants, condition labels
├── _utils.ts                        # Alert evaluation: evaluatePriceAlert, evaluateRsiAlert, evaluateMaCrossAlert, evaluateMvrvAlert, getNotificationType
├── _components/
│   ├── alerts-table.tsx             # Client Component — alert list table with toggle/delete actions + AlertsTableSkeleton
│   ├── create-alert-dialog.tsx      # Client Component — dialog form for creating new alerts (RHF + zodResolver)
│   └── alert-status-badge.tsx       # Server-safe component — status Badge with semantic colors
└── __tests__/
    ├── _schema.test.ts              # 15 tests — CreateAlertSchema, UpdateAlertSchema, SYMBOL_ASSET_MAP
    └── _utils.test.ts               # 22 tests — all evaluator functions + getNotificationType

# Related files outside the route:

app/api/cron/alert-evaluation/
└── route.ts                         # Edge cron job — evaluates active alerts, triggers notifications

app/dashboard/_components/
└── notification-center.tsx          # Client Component — bell icon dropdown, renders triggered alert notifications

app/dashboard/dca/
└── _actions.ts                      # getNotifications(), markNotificationRead(), markAllNotificationsRead()

lib/notifications/
├── dispatcher.ts                    # dispatchNotification() — routes to enabled channels
├── email.ts                         # sendAlertEmail() — Resend API integration
├── telegram.ts                      # sendTelegramMessage(), formatAlertTelegram() — Telegram Bot API
└── __tests__/
    ├── dispatcher.test.ts           # 6 tests — hasExternalChannels
    └── telegram.test.ts             # 5 tests — formatAlertTelegram

lib/indicators/
├── rsi.ts                           # calculateRsi() — Wilder's smoothing RSI
└── moving-average.ts                # calculateSma(), calculateEma(), calculateMa(), calculateMaCross()

lib/bitcoin/
└── valuation.ts                     # fetchMvrvZScore() — MVRV Z-Score via CoinGecko + Blockchain.com

lib/market/
├── stocks.ts                        # fetchPrice(), fetchHistory() — Twelve Data API
├── crypto.ts                        # fetchBitcoinPrice(), fetchBitcoinHistory() — CoinGecko API
└── cache.ts                         # getCached(), getStaleFromSupabaseCache() — in-memory + Supabase cache

lib/supabase/
└── admin.ts                         # createAdminClient() — service role client for cron jobs

supabase/migrations/
├── 20260320000000_initial_schema.sql               # alerts table, RLS policies, indexes
└── 20260325000000_alerts_status_and_indicators.sql  # status column, parameters jsonb, expanded condition check, notification profile columns, partial index
```

---

## Known Limitations

- **`pct_change_up` / `pct_change_down` conditions**: Present in the database CHECK constraint but not implemented in the evaluator (`_utils.ts`), not exposed in the UI (`_schema.ts` uses `ALL_CONDITIONS` which excludes them), and not handled by the cron job. Dead conditions from the initial schema.
- **`is_active` column redundancy**: The `is_active` boolean column is kept alongside the `status` text column for backward compatibility. Both are synced in `_actions.ts` and the cron job, but they represent duplicate state. A migration to remove `is_active` would simplify the schema.
- **Missing `set_updated_at` trigger for alerts**: The initial migration creates `update_updated_at()` triggers for `profiles`, `portfolios`, `positions`, and `dca_schedules` — but not for `alerts`. The `updated_at` column exists but is only updated when explicitly set (e.g., the `updateAlert()` action relies on the client's update payload, not a trigger).
- **Notification channel selection not persisted per-alert in UI**: The `CreateAlertDialog` hardcodes `notification_channels` to `['in_app']` (the default). The form does not expose a channel selector — channels are stored in the DB but users cannot currently choose email or Telegram at alert creation time.
- **No pagination on alerts table**: `getAlerts()` fetches all alerts without limit. For users with many alerts, this could become slow.
- **No re-arm / repeat functionality**: Once an alert triggers, it stays in `triggered` status permanently. Users must create a new alert to monitor the same condition again.
- **MVRV Z-Score realized cap is estimated**: The `fetchMvrvZScore()` function estimates realized cap from full BTC price history rather than using actual UTXO-based on-chain data, which may produce less accurate Z-Score values.
- **Cron job uses `auth.admin.listUsers()`**: To get user emails for email notifications, the cron job calls `supabase.auth.admin.listUsers()` which returns all users. This works at small scale but would not scale to many users.
- **No email lib test coverage**: `lib/notifications/email.ts` (`sendAlertEmail()`, `formatAlertEmailHtml()`) has no unit tests.
- **No `updateAlert()` UI surface**: The `updateAlert()` server action exists but is not exposed via any UI component. Users cannot edit an existing alert's threshold or channels without deleting and recreating it.
