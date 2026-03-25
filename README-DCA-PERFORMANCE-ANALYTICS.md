# E5 — DCA Automation & Performance Analytics

Dollar-Cost Averaging (DCA) automation for the finance dashboard. Schedule recurring investments in VOO, QQQ, or Bitcoin, receive reminders when it's time to buy, record executions with real market prices, and track how your DCA strategy performs over time — including a head-to-head comparison against lump-sum investing.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Cron Job — Reminder Dispatch](#cron-job--reminder-dispatch)
- [Server Actions](#server-actions)
- [Validation (Zod Schemas)](#validation-zod-schemas)
- [Utility Functions](#utility-functions)
- [UI Components](#ui-components)
- [User Flows](#user-flows)
- [External Services & APIs](#external-services--apis)
- [Testing](#testing)
- [File Tree](#file-tree)

---

## What It Does

| User Story                        | Description                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **US-5.1** Schedule Configuration | Create, edit, pause, and delete DCA schedules with 4 frequency options (Daily, Weekly, Biweekly, Monthly)              |
| **US-5.2** Reminder Notifications | Automated cron job checks all active schedules daily and generates in-app notifications when a purchase is due         |
| **US-5.3** Performance Analytics  | Summary cards (total invested, current value, avg cost basis), cost basis trend chart, and DCA vs. lump-sum comparison |

---

## Architecture

E5 follows the project's colocated feature-based architecture. All DCA-specific code lives inside `app/dashboard/dca/`, with the notification center in the shared dashboard layout.

```
User creates schedule  →  Stored in dca_schedules (Supabase)
                               │
Vercel Cron (daily)  →  GET /api/cron/dca-reminders
                               │
                       isScheduleDue() check per schedule
                               │
                       Insert into notifications table
                               │
User sees bell icon  →  NotificationCenter (dropdown)
                               │
                       Clicks "Done" → MarkDoneDialog
                               │
                       markDcaAsDone(scheduleId, price, qty)
                               │
                       Creates/updates position + records transaction
                               │
User visits Analytics tab  →  DCA summary, charts, DCA vs lump sum
```

---

## Database Schema

### `dca_schedules` table

Created in `20260320000000_initial_schema.sql`, extended in `20260322100000_dca_schedule_day_columns.sql`.

| Column              | Type                   | Description                                         |
| ------------------- | ---------------------- | --------------------------------------------------- |
| `id`                | uuid (PK)              | Auto-generated                                      |
| `user_id`           | uuid (FK → auth.users) | Owner                                               |
| `portfolio_id`      | uuid (FK → portfolios) | Associated portfolio                                |
| `symbol`            | text                   | Asset ticker (VOO, QQQ, BTC)                        |
| `asset_type`        | text                   | `'ETF'` or `'Crypto'`                               |
| `amount`            | numeric                | Target dollar amount per execution                  |
| `frequency`         | text                   | `'Daily'`, `'Weekly'`, `'Biweekly'`, or `'Monthly'` |
| `day_of_week`       | smallint (0–6)         | For Weekly/Biweekly: 0=Sun, 6=Sat                   |
| `day_of_month`      | smallint (1–31)        | For Monthly schedules                               |
| `is_active`         | boolean                | Pause/resume toggle                                 |
| `next_execution_at` | timestamptz            | Reserved for future use                             |
| `created_at`        | timestamptz            | Used by biweekly even-week calculation              |
| `updated_at`        | timestamptz            | Auto-updated via trigger                            |

**RLS**: Users can only SELECT/INSERT/UPDATE/DELETE their own rows (`auth.uid() = user_id`).

**Indexes**: `idx_dca_schedules_user_id`, `idx_dca_schedules_active` (partial index on `is_active = true`).

### `notifications` table

Created in `20260322100000_dca_schedule_day_columns.sql`. Shared by DCA reminders and future alert types.

| Column       | Type                   | Description                                                        |
| ------------ | ---------------------- | ------------------------------------------------------------------ |
| `id`         | uuid (PK)              | Auto-generated                                                     |
| `user_id`    | uuid (FK → auth.users) | Recipient                                                          |
| `type`       | text                   | `'dca_reminder'`, `'price_alert'`, `'indicator_alert'`, `'system'` |
| `title`      | text                   | e.g. `"DCA Reminder: VOO"`                                         |
| `body`       | text                   | e.g. `"Time to invest $500.00 in VOO"`                             |
| `read`       | boolean                | Mark-as-read state                                                 |
| `related_id` | uuid                   | Links back to `dca_schedules.id`                                   |
| `created_at` | timestamptz            | When the notification was generated                                |

**RLS**: Full per-user isolation (`auth.uid() = user_id`).

**Indexes**: `idx_notifications_user_id`, `idx_notifications_unread` (partial index on `read = false`).

---

## Cron Job — Reminder Dispatch

**File**: `app/api/cron/dca-reminders/route.ts`

| Property | Value                                             |
| -------- | ------------------------------------------------- |
| Runtime  | Edge                                              |
| Method   | `GET`                                             |
| Auth     | `Authorization: Bearer <CRON_SECRET>`             |
| Trigger  | Vercel Cron (scheduled daily) or manual HTTP call |

### How it works

1. Validates the `CRON_SECRET` bearer token — rejects unauthorized requests with 401.
2. Fetches all active DCA schedules using a **Supabase admin client** (bypasses RLS to read across all users).
3. For each schedule, calls `isScheduleDue(schedule, now)` to determine if a reminder is needed today.
4. Batch-inserts all due reminders into the `notifications` table.
5. Returns `{ processed: <total_schedules>, reminders: <notifications_created> }`.

### Schedule due logic (`isScheduleDue`)

| Frequency | Due when...                                                            |
| --------- | ---------------------------------------------------------------------- |
| Daily     | Always                                                                 |
| Weekly    | `getDay(now) === schedule.day_of_week`                                 |
| Biweekly  | Day matches AND `differenceInCalendarWeeks(now, created_at) % 2 === 0` |
| Monthly   | `now.getDate() === schedule.day_of_month`                              |

### Environment variable

```env
CRON_SECRET=your-secret-here
```

### Vercel cron configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/dca-reminders",
      "schedule": "0 14 * * *"
    }
  ]
}
```

The schedule `0 14 * * *` runs at 14:00 UTC daily (8:00 AM Costa Rica time, UTC-6).

---

## Server Actions

**File**: `app/dashboard/dca/_actions.ts`

All actions use `'use server'`, check `auth.uid()` before any database operation, and validate inputs with Zod where applicable.

| Action                                                         | Purpose                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| `getDcaSchedules()`                                            | Fetch all user's schedules, ordered by `created_at` DESC             |
| `createDcaSchedule(formData)`                                  | Validate with `CreateDcaScheduleSchema`, insert into `dca_schedules` |
| `updateDcaSchedule(formData)`                                  | Partial update (amount, frequency, day fields, is_active)            |
| `toggleDcaSchedule(id, isActive)`                              | Pause or activate a schedule                                         |
| `deleteDcaSchedule(id)`                                        | Remove a schedule (recorded transactions are preserved)              |
| `getNotifications()`                                           | Fetch latest 20 notifications for the current user                   |
| `markNotificationRead(id)`                                     | Mark a single notification as read                                   |
| `markAllNotificationsRead()`                                   | Mark all unread notifications as read                                |
| `getDcaTransactions(symbol?)`                                  | Fetch all DCA-type transactions, optionally filtered by symbol       |
| `markDcaAsDone(scheduleId, executionPrice, executionQuantity)` | Record a DCA execution (see below)                                   |

### `markDcaAsDone` flow

This is the core action that bridges DCA reminders with the portfolio tracker:

1. **Validates** that `executionPrice > 0` and `executionQuantity > 0`.
2. **Fetches** the schedule (symbol, portfolio_id, asset_type).
3. **Finds or creates a position** for the symbol in the user's portfolio.
4. **If position exists**: recalculates weighted average buy price and updates quantity.
5. **If new position**: creates it with the execution price as the initial average.
6. **Records a transaction** with `type: 'DCA'`, linking to the position.
7. **Marks related notifications** as read.
8. **Revalidates** both `/dashboard/dca` and `/dashboard/portfolio` routes.

---

## Validation (Zod Schemas)

**File**: `app/dashboard/dca/_schema.ts`

### `CreateDcaScheduleSchema`

```typescript
z.object({
  portfolio_id: z.string().uuid(),
  symbol: z.string().min(1).max(10).toUpperCase(),
  asset_type: z.enum(['ETF', 'Crypto']),
  amount: z.number().positive(),
  frequency: z.enum(['Daily', 'Weekly', 'Biweekly', 'Monthly']),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
}).superRefine(...)
```

**Conditional validation via `superRefine`**:

- Weekly or Biweekly frequency → `day_of_week` is required
- Monthly frequency → `day_of_month` is required

### `UpdateDcaScheduleSchema`

Requires `id` (uuid). All other fields are optional for partial updates.

### Exported labels

- `FREQUENCY_LABELS` — maps frequency keys to display strings
- `DAY_OF_WEEK_LABELS` — `['Sunday', 'Monday', ..., 'Saturday']`

---

## Utility Functions

**File**: `app/dashboard/dca/_utils.ts`

### Calculations

| Function                                                                | Purpose                                                                             |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `isScheduleDue(schedule, now)`                                          | Determines if a schedule should fire today based on frequency and day fields        |
| `calculateDcaReturns(transactions)`                                     | Aggregates total invested, total quantity, weighted average cost basis, fees, count |
| `calculateLumpSumComparison(transactions, currentPrice, firstDayPrice)` | Compares DCA result vs. hypothetical lump-sum investment made on day one            |
| `calculateCostBasisTrend(transactions)`                                 | Returns an array of data points with running average cost basis over time           |

### Formatting

| Function                                                 | Purpose                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `formatUsd(value)`                                       | Formats as `$1,234.56`                                          |
| `formatPct(value)`                                       | Formats as `+12.34%` or `-5.67%`                                |
| `formatFrequencyLabel(frequency, dayOfWeek, dayOfMonth)` | Human-readable label: `"Every Monday"`, `"Monthly on the 15th"` |

---

## UI Components

**Files**: `app/dashboard/dca/_components/`

### Schedules tab

| Component                | Description                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schedule-form.tsx`      | React Hook Form + Zod. Fields: symbol (select), amount, frequency, conditional day picker. Calls `createDcaSchedule` or `updateDcaSchedule`.                                                                               |
| `add-schedule-modal.tsx` | Dialog wrapper around `ScheduleForm` for creating new schedules.                                                                                                                                                           |
| `schedules-list.tsx`     | Table displaying all schedules with columns: symbol, amount, frequency, status. Inline actions: toggle (pause/play), edit (opens dialog), delete (with confirmation). Includes `SchedulesListSkeleton` for loading states. |
| `empty-state.tsx`        | Centered placeholder with Calendar icon when no schedules exist. Includes the "Add Schedule" button.                                                                                                                       |

### Analytics tab

| Component               | Description                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dca-summary-cards.tsx` | 4 stat cards: Total Invested, Current Value (with return %), Average Cost Basis, DCA Buys count. Uses emerald/rose coloring for positive/negative returns.                        |
| `dca-history-chart.tsx` | Recharts `ComposedChart` with: Line (running average cost basis), Scatter (individual DCA buy markers), ReferenceLine (current market price). Tooltip shows buy details on hover. |
| `dca-vs-lumpsum.tsx`    | Side-by-side comparison panels showing DCA result vs. hypothetical lump-sum result. Badges highlight which strategy won. Bottom summary shows the advantage percentage.           |

### Notification flow

| Component                 | Location                         | Description                                                                                                                                                                                          |
| ------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notification-center.tsx` | `app/dashboard/_components/`     | Bell icon dropdown in the dashboard sidebar. Shows unread count badge. DCA reminders include a "Done" button that opens the mark-done dialog. Parses symbol and amount from notification title/body. |
| `mark-done-dialog.tsx`    | `app/dashboard/dca/_components/` | Dialog with price-per-unit and quantity inputs. Shows live total cost calculation. Calls `markDcaAsDone` on confirmation.                                                                            |

### DCA page composition

**File**: `app/dashboard/dca/page.tsx`

Server Component that:

1. Calls `getOrCreatePortfolio()` — redirects if no portfolio exists.
2. Fetches schedules and DCA transactions in parallel.
3. Groups transactions by symbol for per-asset analytics.
4. Renders two tabs:
   - **Schedules** — `SchedulesList` with `AddScheduleModal`, or `EmptyState` if none exist.
   - **Analytics** — Per-symbol breakdown: `DcaSummaryCards`, `DcaHistoryChart`, `DcaVsLumpsum`.

---

## User Flows

### Creating a DCA schedule

1. Navigate to **Dashboard → DCA**.
2. Click **"Add Schedule"** (or the button in the empty state).
3. Fill in: symbol (VOO/QQQ/BTC), amount ($), frequency, and the day (if weekly/biweekly/monthly).
4. Submit → validated with `CreateDcaScheduleSchema` → inserted into `dca_schedules`.

### Receiving and acting on a reminder

1. Vercel Cron triggers `GET /api/cron/dca-reminders` daily.
2. The cron job checks each active schedule with `isScheduleDue()`.
3. Due schedules get a notification inserted: `"DCA Reminder: VOO — Time to invest $500.00 in VOO"`.
4. User sees the bell icon badge in the dashboard header.
5. Opens the dropdown → clicks **"Done"** on the reminder.
6. The **Mark Done Dialog** opens with the symbol/amount pre-populated.
7. User enters the actual execution price and quantity purchased.
8. On confirm: position is updated (or created), transaction is recorded with `type: 'DCA'`, notification is marked read.

### Viewing performance analytics

1. Navigate to **Dashboard → DCA → Analytics** tab.
2. For each symbol with DCA transactions:
   - **Summary cards** show total invested, current portfolio value, weighted average cost basis, and number of DCA buys.
   - **History chart** plots the running average cost basis over time with scatter dots for each individual buy and a reference line at the current market price.
   - **DCA vs Lump Sum** shows what your returns would have been if you had invested the entire amount on day one, and whether the DCA strategy outperformed or underperformed.

---

## External Services & APIs

| Service                              | Usage                                                          | File                                              |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------- |
| **Supabase (Postgres + Auth + RLS)** | All data storage, authentication, row-level security           | `lib/supabase/server.ts`, `lib/supabase/admin.ts` |
| **Vercel Cron**                      | Daily trigger for the DCA reminder dispatch endpoint           | `vercel.json` cron config                         |
| **Next.js Edge Runtime**             | Cron handler runs on the edge for low-latency global execution | `app/api/cron/dca-reminders/route.ts`             |

No external third-party APIs are called by E5 directly. Market prices used in the analytics tab come from the existing market data layer (E3) which integrates with Twelve Data (stocks/ETFs) and CoinGecko (crypto).

---

## Testing

**Test files**: `app/dashboard/dca/__tests__/`

### `_schema.test.ts` — 15 tests

- `CreateDcaScheduleSchema`: validates Daily, Weekly, Biweekly, Monthly inputs; rejects missing `day_of_week` for Weekly/Biweekly; rejects missing `day_of_month` for Monthly; rejects out-of-range values, zero/negative amounts, invalid frequencies.
- `UpdateDcaScheduleSchema`: requires `id`; accepts partial updates.

### `_utils.test.ts` — 17+ tests

- `isScheduleDue`: Daily always true; Weekly day matching; Biweekly even-week logic; Monthly day matching; null day fields return false; inactive schedules return false.
- `calculateDcaReturns`: empty returns zeros; single transaction; weighted average for multiple buys; fee accumulation.
- `calculateLumpSumComparison`: empty transactions; advantage calculation.
- `calculateCostBasisTrend`: running cost basis over time.

### Running tests

```bash
npm test
```

All 191 tests pass across 13 test suites (as of latest run).

---

## File Tree

```
app/
├── api/
│   └── cron/
│       └── dca-reminders/
│           └── route.ts              # Cron job: check schedules, dispatch reminders
├── dashboard/
│   ├── _components/
│   │   └── notification-center.tsx   # Bell dropdown with DCA "Done" integration
│   └── dca/
│       ├── page.tsx                  # Server Component: Schedules + Analytics tabs
│       ├── loading.tsx               # Suspense fallback with skeleton loaders
│       ├── _schema.ts               # Zod: CreateDcaScheduleSchema (superRefine), Update
│       ├── _actions.ts              # 10 Server Actions: CRUD, notifications, markDcaAsDone
│       ├── _utils.ts                # isScheduleDue, calculateDcaReturns, lump sum, cost basis
│       ├── _constants.ts            # Frequency options, status colors, defaults
│       ├── _components/
│       │   ├── add-schedule-modal.tsx
│       │   ├── schedule-form.tsx
│       │   ├── schedules-list.tsx
│       │   ├── empty-state.tsx
│       │   ├── dca-summary-cards.tsx
│       │   ├── dca-history-chart.tsx
│       │   ├── dca-vs-lumpsum.tsx
│       │   └── mark-done-dialog.tsx
│       └── __tests__/
│           ├── _schema.test.ts
│           └── _utils.test.ts
supabase/
└── migrations/
    ├── 20260320000000_initial_schema.sql         # Base dca_schedules table
    └── 20260322100000_dca_schedule_day_columns.sql  # day_of_week, day_of_month + notifications table
```
