# E7: Alerts & Notifications

> Epic scope: Create, evaluate, and deliver multi-channel alerts for price thresholds, technical indicators (RSI, MA crossover, MVRV Z-Score), and notification preferences across in-app, email, and Telegram channels.

---

## Architecture Overview

```
Vercel Cron (5 min)
        │
        ▼
┌──────────────────────┐     ┌─────────────────────┐
│ alert-evaluation     │────►│ lib/market/*.ts     │  Fetch prices
│ route.ts (GET)       │     │ lib/indicators/*.ts │  Calculate RSI, MA
│                      │────►│ lib/bitcoin/        │  MVRV Z-Score
└──────────┬───────────┘     │   valuation.ts      │
           │                 └─────────────────────┘
           ▼
┌──────────────────────┐     ┌─────────────────────┐
│ _utils.ts            │     │ Supabase            │
│ Evaluation Engine    │────►│ alerts (status)     │  Update triggered
│  • Price evaluator   │     │ notifications (row) │  Insert in-app
│  • RSI evaluator     │     └─────────────────────┘
│  • MA cross evaluator│
│  • MVRV evaluator    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌─────────────────────┐
│ lib/notifications/   │────►│ Resend API (email)  │
│ dispatcher.ts        │────►│ Telegram Bot API    │
└──────────────────────┘     └─────────────────────┘
```

The alerts page (`app/dashboard/alerts/page.tsx`) is a **Server Component** that fetches alerts via Server Actions. A Vercel Cron job runs every 5 minutes to evaluate active alerts against live market data and dispatch notifications through configured channels.

---

## User Stories

| Story  | Title                          | Status |
| ------ | ------------------------------ | ------ |
| US-7.1 | Price Alerts                   | ✅     |
| US-7.2 | Technical Indicator Alerts     | ✅     |
| US-7.3 | Notification Delivery Channels | ✅     |

---

## Alert Conditions

### Price Conditions

| Condition | Description             | Example       |
| --------- | ----------------------- | ------------- |
| `above`   | Price rises above value | VOO > $500    |
| `below`   | Price drops below value | BTC < $50,000 |

### Indicator Conditions

| Condition        | Description                    | Parameters                | Example                       |
| ---------------- | ------------------------------ | ------------------------- | ----------------------------- |
| `rsi_above`      | RSI rises above threshold      | `rsi_period` (default 14) | VOO RSI(14) > 70              |
| `rsi_below`      | RSI drops below threshold      | `rsi_period` (default 14) | QQQ RSI(14) < 30              |
| `ma_cross_above` | Price crosses above moving avg | `ma_period`, `ma_type`    | VOO crosses above 200-day SMA |
| `ma_cross_below` | Price crosses below moving avg | `ma_period`, `ma_type`    | QQQ crosses below 50-day EMA  |
| `mvrv_above`     | MVRV Z-Score above threshold   | —                         | BTC MVRV Z > 7 (cycle top)    |
| `mvrv_below`     | MVRV Z-Score below threshold   | —                         | BTC MVRV Z < 0 (undervalued)  |

**Symbol restrictions:** MVRV conditions are Bitcoin-only. Price and RSI/MA conditions support VOO, QQQ, and BTC.

---

## Technical Indicators

### RSI (Relative Strength Index)

**File:** `lib/indicators/rsi.ts`

- Algorithm: Wilder's smoothing method
- Default period: 14
- Input: closing prices array (oldest → newest), minimum `period + 1` data points
- Output: `{ value: number (0–100), period: number }`
- Edge cases: all gains → 100, all losses → near 0, flat → 50

**Interpretation:**

| RSI Value | Signal     |
| --------- | ---------- |
| > 70      | Overbought |
| 30–70     | Neutral    |
| < 30      | Oversold   |

### Moving Averages (SMA / EMA)

**File:** `lib/indicators/moving-average.ts`

| Function             | Description                                       |
| -------------------- | ------------------------------------------------- |
| `calculateSma()`     | Simple Moving Average — arithmetic mean of last N |
| `calculateEma()`     | Exponential Moving Average — multiplier `2/(N+1)` |
| `calculateMa()`      | Delegates to SMA or EMA based on `type` parameter |
| `calculateMaCross()` | Detects if short MA crosses above/below long MA   |

**Cross detection:** Compares price against MA value. Returns `{ shortMa, longMa, isAbove }`.

### MVRV Z-Score (Bitcoin Only)

**File:** `lib/bitcoin/valuation.ts`

**Formula:** `Z-Score = (Market Cap − Realized Cap) / StdDev(Market Cap, 365d)`

**Data sources:**

- Market cap: CoinGecko `/coins/markets`
- Realized cap: Blockchain.info `/q/output-volume` (with heuristic fallback)
- Historical market cap: CoinGecko `/coins/bitcoin/market_chart?days=365`

**Output:**

```typescript
{
  marketCap: number,
  realizedCap: number,
  mvrvRatio: number,      // Market Cap / Realized Cap
  zScore: number,          // Standard deviations from mean
  lastUpdated: string
}
```

**Interpretation:**

| Z-Score | Signal                      |
| ------- | --------------------------- |
| > 7     | Historically near cycle top |
| 3–7     | Elevated                    |
| 0–3     | Fair value                  |
| < 0     | Historically undervalued    |

---

## Evaluation Engine

**File:** `app/dashboard/alerts/_utils.ts`

Four evaluator functions, each returning `{ fired: boolean, message: string }`:

| Evaluator                | Condition types                    | Data required                       |
| ------------------------ | ---------------------------------- | ----------------------------------- |
| `evaluatePriceAlert()`   | `above`, `below`                   | Current price                       |
| `evaluateRsiAlert()`     | `rsi_above`, `rsi_below`           | 200+ historical closing prices      |
| `evaluateMaCrossAlert()` | `ma_cross_above`, `ma_cross_below` | 500+ historical closing prices      |
| `evaluateMvrvAlert()`    | `mvrv_above`, `mvrv_below`         | MVRV Z-Score (CoinGecko + on-chain) |

**Safety rules:**

- Only `active` alerts are evaluated (not `triggered` or `paused`)
- Already-triggered alerts do not re-fire (`last_triggered_at` check)
- Price formatting: 2 decimals for stocks, 8+ decimals for crypto

**Message examples:**

- `"VOO has risen above $470.00 (current: $475.32)"`
- `"QQQ RSI is oversold at 28.5 (threshold: 30)"`
- `"VOO has crossed below its 200-day SMA (MA: $445.12, Price: $442.88)"`
- `"BTC MVRV Z-Score is elevated at 6.2 — historically near cycle tops"`

---

## Cron Job — Alert Evaluation

**File:** `app/api/cron/alert-evaluation/route.ts`

| Detail          | Value                                           |
| --------------- | ----------------------------------------------- |
| Schedule        | Every 5 minutes (`*/5 * * * *`)                 |
| Auth            | `CRON_SECRET` in `Authorization: Bearer` header |
| Supabase client | Admin (service_role) — bypasses RLS             |

**Execution flow:**

1. Verify `CRON_SECRET` bearer token
2. Fetch all alerts where `status = 'active'`
3. Group alerts by condition type and symbol
4. Fetch market data in parallel:
   - Current prices (Twelve Data for VOO/QQQ, CoinGecko for BTC)
   - Historical prices for RSI/MA calculations (200+ candles)
   - MVRV Z-Score for Bitcoin alerts
5. Evaluate each alert against its condition
6. For each triggered alert:
   - Set `status = 'triggered'` and `last_triggered_at = now()`
   - Insert notification row (in-app)
7. Dispatch external notifications:
   - Fetch user profile preferences
   - Send email (Resend) and/or Telegram in parallel
8. Return JSON summary: `{ processed, triggered, symbols }`

**Optimization:** Alerts are grouped by symbol to minimize duplicate API calls.

---

## Notification Channels

### In-App (Always Enabled)

- Notification row inserted into `notifications` table on trigger
- Bell icon in dashboard sidebar with unread count badge
- Dropdown list with read/unread indicators and time-ago labels
- Notification types: `price_alert`, `indicator_alert`, `dca_reminder`

**Component:** `app/dashboard/_components/notification-center.tsx`

### Email (Resend API)

**File:** `lib/notifications/email.ts`

| Detail   | Value                        |
| -------- | ---------------------------- |
| Provider | [Resend](https://resend.com) |
| Auth     | `RESEND_API_KEY` env var     |
| From     | Configured sender address    |

- HTML template with styled alert card
- Returns `{ ok: boolean, id?: string, error?: string }`
- Requires user to enable email in notification preferences

### Telegram (Bot API)

**File:** `lib/notifications/telegram.ts`

| Detail     | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Provider   | [Telegram Bot API](https://core.telegram.org/bots/api) |
| Auth       | `TELEGRAM_BOT_TOKEN` env var                           |
| Parse mode | HTML                                                   |

- `formatAlertTelegram(title, body)` — Bold `<b>title</b>` + body with HTML entity escaping
- `sendTelegramMessage(chatId, text)` — POST to `/bot{token}/sendMessage`
- Returns `{ ok: boolean, messageId?: number, error?: string }`
- Requires user to provide `telegram_chat_id` in notification preferences

### Dispatcher

**File:** `lib/notifications/dispatcher.ts`

- `dispatchNotification(config, title, body, channels)` — Routes to enabled channels in parallel
- `hasExternalChannels(config)` — Returns `true` if user has email or Telegram configured + enabled
- In-app is always handled via DB insert (by cron); dispatcher handles external channels only

---

## Database Schema

### Migration

**File:** `supabase/migrations/20260325000000_alerts_status_and_indicators.sql`

### `alerts` Table (Extended)

| Column                  | Type          | Description                                            |
| ----------------------- | ------------- | ------------------------------------------------------ |
| `id`                    | `UUID` PK     | Alert identifier                                       |
| `user_id`               | `UUID` FK     | Owner (references `auth.users`)                        |
| `symbol`                | `TEXT`        | Asset symbol (VOO, QQQ, BTC)                           |
| `asset_type`            | `TEXT`        | `etf` or `crypto`                                      |
| `condition`             | `TEXT`        | One of 8 condition types (see Alert Conditions above)  |
| `threshold`             | `NUMERIC`     | Target value (price, RSI level, MA value, Z-Score)     |
| `status`                | `TEXT`        | `active`, `triggered`, or `paused`                     |
| `parameters`            | `JSONB`       | Indicator config: `{ rsi_period, ma_period, ma_type }` |
| `notification_channels` | `TEXT[]`      | Array of channels: `in_app`, `email`, `telegram`       |
| `is_active`             | `BOOLEAN`     | Legacy compat, synced with `status`                    |
| `last_triggered_at`     | `TIMESTAMPTZ` | Timestamp of last trigger (prevents re-fire)           |
| `created_at`            | `TIMESTAMPTZ` | Creation timestamp                                     |

**Constraints:**

- `condition` CHECK: `above`, `below`, `rsi_above`, `rsi_below`, `ma_cross_above`, `ma_cross_below`, `mvrv_above`, `mvrv_below`
- `status` CHECK: `active`, `triggered`, `paused`

**Index:** `idx_alerts_active` on `status` WHERE `status = 'active'` (optimizes cron lookups)

**RLS:** Users can only CRUD their own alerts (`user_id = auth.uid()`).

### `profiles` Table (Extended Columns)

| Column                          | Type      | Default | Description                   |
| ------------------------------- | --------- | ------- | ----------------------------- |
| `notification_email_enabled`    | `BOOLEAN` | `false` | Enable email notifications    |
| `notification_telegram_enabled` | `BOOLEAN` | `false` | Enable Telegram notifications |
| `telegram_chat_id`              | `TEXT`    | `null`  | User's Telegram chat ID       |

### `notifications` Table

| Column       | Type          | Description                                      |
| ------------ | ------------- | ------------------------------------------------ |
| `id`         | `UUID` PK     | Notification identifier                          |
| `user_id`    | `UUID` FK     | Recipient                                        |
| `type`       | `TEXT`        | `price_alert`, `indicator_alert`, `dca_reminder` |
| `title`      | `TEXT`        | Notification title                               |
| `body`       | `TEXT`        | Notification body/message                        |
| `is_read`    | `BOOLEAN`     | Read status                                      |
| `related_id` | `UUID`        | Related alert or DCA schedule ID                 |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp                               |

---

## Server Actions

**File:** `app/dashboard/alerts/_actions.ts`

| Action                | Input                | Description                                               |
| --------------------- | -------------------- | --------------------------------------------------------- |
| `getAlerts()`         | —                    | Fetch all user alerts, newest first                       |
| `createAlert()`       | `FormData`           | Create alert with Zod validation + asset_type map         |
| `updateAlert()`       | `FormData`           | Update status, threshold, channels (partial)              |
| `toggleAlertStatus()` | `id: UUID`, `status` | Quick toggle between `active` / `paused` (UUID validated) |
| `deleteAlert()`       | `id: UUID`           | Delete alert (UUID validated)                             |

**Pattern:** `FormData → Zod safeParse → Supabase mutation → revalidatePath('/dashboard/alerts')`

**Security:**

- Auth guard: `supabase.auth.getUser()` on every action
- UUID validation: `z.string().uuid()` on `id` parameters
- RLS: Supabase policies enforce `user_id = auth.uid()`

---

## Zod Schemas

**File:** `app/dashboard/alerts/_schema.ts`

### Constants

```typescript
ALERT_SYMBOLS = ['VOO', 'QQQ', 'BTC']
ALERT_STATUSES = ['active', 'triggered', 'paused']
PRICE_CONDITIONS = ['above', 'below']
INDICATOR_CONDITIONS = [
  'rsi_above',
  'rsi_below',
  'ma_cross_above',
  'ma_cross_below',
  'mvrv_above',
  'mvrv_below',
]
ALL_CONDITIONS = [...PRICE_CONDITIONS, ...INDICATOR_CONDITIONS]
```

### `CreateAlertSchema`

| Field                   | Type       | Validation                                                                   |
| ----------------------- | ---------- | ---------------------------------------------------------------------------- |
| `symbol`                | `enum`     | One of `ALERT_SYMBOLS`                                                       |
| `condition`             | `enum`     | One of `ALL_CONDITIONS`                                                      |
| `threshold`             | `number`   | Positive; RSI conditions enforce 0–100 range                                 |
| `notification_channels` | `string[]` | Min 1 item, defaults to `['in_app']`                                         |
| `parameters`            | `object`   | Optional: `rsi_period` (2–100), `ma_period` (5–500), `ma_type` (`sma`/`ema`) |

### `UpdateAlertSchema`

| Field                   | Type        | Validation                        |
| ----------------------- | ----------- | --------------------------------- |
| `id`                    | `string`    | UUID format                       |
| `status`                | `enum?`     | Optional, one of `ALERT_STATUSES` |
| `threshold`             | `number?`   | Optional, positive                |
| `notification_channels` | `string[]?` | Optional, min 1 if provided       |

---

## What the User Sees

### Alerts Page (`/dashboard/alerts`)

**Header row:** "Alerts" title + "Create Alert" button (opens dialog)

**Summary cards (3 columns):**

| Card      | Color       | Shows                     |
| --------- | ----------- | ------------------------- |
| Active    | emerald-500 | Count of active alerts    |
| Triggered | sky-500     | Count of triggered alerts |
| Paused    | amber-500   | Count of paused alerts    |

**Alerts table:**

| Column    | Content                                                            |
| --------- | ------------------------------------------------------------------ |
| Symbol    | Color-coded badge (VOO blue, QQQ purple, BTC orange)               |
| Condition | Human-readable label from `CONDITION_LABELS` map                   |
| Target    | Formatted threshold ($ for price, 0–100 for RSI, decimal for MVRV) |
| Status    | `AlertStatusBadge` (emerald/sky/amber)                             |
| Created   | Date formatted                                                     |
| Actions   | Play/Pause toggle + Delete button (with confirmation dialog)       |

**Empty state:** Icon + "No alerts yet" message + call-to-action button

### Create Alert Dialog

**Form fields (conditional):**

| Field      | Always visible | Condition-dependent                                              |
| ---------- | -------------- | ---------------------------------------------------------------- |
| Symbol     | ✅             | MVRV conditions force BTC-only                                   |
| Condition  | ✅             | 8 options, filtered by symbol                                    |
| Threshold  | ✅             | Label changes: "Target Price ($)" / "RSI Level" / "MVRV Z-Score" |
| RSI Period | —              | Shown for `rsi_above` / `rsi_below` (default 14)                 |
| MA Period  | —              | Shown for `ma_cross_above` / `ma_cross_below`                    |
| MA Type    | —              | SMA / EMA selector (with MA conditions)                          |
| Channels   | ✅             | Checkboxes: In-App, Email, Telegram                              |

### Notification Center (Sidebar)

- Bell icon with unread count badge (shows "9+" overflow)
- Dropdown list: title, body, time-ago, read indicator
- "Mark all read" action
- DCA reminders show "Mark as Done" action

### Notification Preferences (Settings)

Card with 3 channel sections:

| Channel  | Toggle    | Additional field                                              |
| -------- | --------- | ------------------------------------------------------------- |
| In-App   | Always on | —                                                             |
| Email    | Toggle    | —                                                             |
| Telegram | Toggle    | Chat ID input (placeholder: "Message @userinfobot to get ID") |

---

## Environment Variables

| Variable             | Required | Used by                            |
| -------------------- | -------- | ---------------------------------- |
| `CRON_SECRET`        | Yes      | Cron route auth (Bearer token)     |
| `RESEND_API_KEY`     | No       | Email notifications via Resend     |
| `TELEGRAM_BOT_TOKEN` | No       | Telegram notifications via Bot API |

---

## File Map

```
app/dashboard/alerts/
├── page.tsx                     # Server Component — summary cards + table
├── loading.tsx                  # Suspense skeleton (cards + table rows)
├── _schema.ts                   # Zod schemas, condition constants, AlertRow type
├── _actions.ts                  # Server Actions (CRUD + toggle)
├── _utils.ts                    # Evaluation engine (4 evaluators)
├── _components/
│   ├── create-alert-dialog.tsx  # Form dialog with conditional indicator fields
│   ├── alerts-table.tsx         # Sortable table + empty state + skeleton
│   └── alert-status-badge.tsx   # Status badge (active/triggered/paused)
└── __tests__/
    ├── _schema.test.ts          # Schema validation tests
    └── _utils.test.ts           # Evaluator tests (price, RSI, MA, MVRV)

lib/indicators/
├── rsi.ts                       # RSI with Wilder's smoothing
├── moving-average.ts            # SMA, EMA, cross detection
└── __tests__/
    ├── rsi.test.ts              # RSI calculation tests
    └── moving-average.test.ts   # SMA/EMA/cross tests

lib/bitcoin/
└── valuation.ts                 # MVRV Z-Score calculation

lib/notifications/
├── dispatcher.ts                # Multi-channel routing
├── email.ts                     # Resend API integration
├── telegram.ts                  # Telegram Bot API integration
└── __tests__/
    ├── dispatcher.test.ts       # Channel routing tests
    └── telegram.test.ts         # Message formatting tests

app/api/cron/
└── alert-evaluation/
    └── route.ts                 # Vercel Cron (every 5 min)

app/dashboard/_components/
└── notification-center.tsx      # Bell icon + dropdown list

app/dashboard/settings/_components/
└── notification-preferences-card.tsx  # Channel toggles + Telegram ID

supabase/migrations/
└── 20260325000000_alerts_status_and_indicators.sql
```

---

## Test Coverage

| Test file                                     | Tests | Covers                                                                    |
| --------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| `alerts/__tests__/_schema.test.ts`            | 15    | Schema validation (symbols, conditions, thresholds, RSI bounds, channels) |
| `alerts/__tests__/_utils.test.ts`             | 23    | All 4 evaluators, edge cases, re-fire prevention, message formatting      |
| `indicators/__tests__/rsi.test.ts`            | 13    | RSI range, period, trends, all-gains/losses, flat prices, minimum data    |
| `indicators/__tests__/moving-average.test.ts` | 20    | SMA accuracy, EMA weighting, cross detection, type delegation             |
| `notifications/__tests__/dispatcher.test.ts`  | 6     | `hasExternalChannels()` logic, enabled + credential checks                |
| `notifications/__tests__/telegram.test.ts`    | 5     | HTML formatting, entity escaping, title/body separation                   |

**Total:** 82 tests across 6 test files

---

## Key Patterns

### Grouped Evaluation

The cron job groups alerts by symbol before fetching market data. This means 10 VOO alerts result in 1 price fetch, not 10.

### Status Machine

```
active ──► triggered    (by cron evaluation)
active ◄──► paused      (by user toggle)
triggered ──► active    (not allowed — must create new alert)
```

### Conditional Form Fields

The create dialog dynamically shows/hides fields based on the selected condition:

- Price conditions: threshold only
- RSI conditions: threshold (0–100) + RSI period input
- MA conditions: threshold + MA period + MA type (SMA/EMA) selector
- MVRV conditions: threshold only, forces BTC symbol

### Parallel Dispatch

When an alert triggers, external notifications (email + Telegram) are dispatched in parallel via `Promise.allSettled()`, so a Telegram failure doesn't block email delivery.
