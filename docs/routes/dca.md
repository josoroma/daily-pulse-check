# E5: DCA Automation

> Dollar-cost averaging management for a Costa Rica-based investor tracking VOO, QQQ, and Bitcoin. This feature lets users create recurring DCA schedules, receive reminders when buys are due, record executed purchases that update portfolio positions and transactions, and analyze DCA performance with cost-basis trends and DCA-vs-lump-sum comparisons.

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
│ Browser                                                                  │
│                                                                          │
│  DCA Page (Server Component)                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Tabs: [Schedules] [Analytics]                                      │  │
│  │                                                                    │  │
│  │ Schedules Tab:                                                     │  │
│  │   SchedulesList ('use client')                                     │  │
│  │     ├─ toggle → toggleDcaSchedule()  ──► Supabase: dca_schedules   │  │
│  │     ├─ edit   → ScheduleForm → updateDcaSchedule() ──► dca_sched.  │  │
│  │     └─ delete → deleteDcaSchedule()  ──► Supabase: dca_schedules   │  │
│  │   AddScheduleModal ('use client')                                  │  │
│  │     └─ ScheduleForm → createDcaSchedule() ──► Supabase             │  │
│  │   EmptyState (Server Component)                                    │  │
│  │                                                                    │  │
│  │ Analytics Tab:                                                     │  │
│  │   DcaSummaryCards ('use client')  ◄── calculateDcaReturns()        │  │
│  │   DcaHistoryChart ('use client')  ◄── calculateCostBasisTrend()    │  │
│  │   DcaVsLumpsum ('use client')     ◄── calculateLumpSumComparison() │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Dashboard Header:                                                       │
│   NotificationCenter ('use client')                                      │
│     ├─ markNotificationRead()  ──► Supabase: notifications               │
│     ├─ markAllNotificationsRead() ──► Supabase: notifications            │
│     └─ "Done" button → MarkDoneDialog → markDcaAsDone()                  │
│           ├──► Supabase: positions (create or update avg buy price)      │
│           ├──► Supabase: transactions (INSERT type='DCA')                │
│           └──► Supabase: notifications (mark related as read)            │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Cron Job: GET /api/cron/dca-reminders (Edge Runtime)                     │
│   Trigger: Vercel Cron (schedule not in vercel.json — manual/external)   │
│   Auth: Bearer CRON_SECRET header                                        │
│   Flow:                                                                  │
│     1. createAdminClient() — bypasses RLS                                │
│     2. SELECT active dca_schedules                                       │
│     3. isScheduleDue(schedule, now) from _utils.ts                       │
│     4. INSERT notifications (type='dca_reminder') for due schedules      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Pages & Navigation

| Path             | Component  | Type             | Description                                                        |
| ---------------- | ---------- | ---------------- | ------------------------------------------------------------------ |
| `/dashboard/dca` | `page.tsx` | Server Component | DCA schedules list + analytics with two tabs: Schedules, Analytics |

### Loading State

`loading.tsx` renders a skeleton with a header placeholder (h-8 title + h-4 subtitle), a tab bar skeleton, and a `Card` with 3 rows of `h-12` skeletons simulating a table.

### Auto-Refresh

No client-side polling. Data is fetched server-side on each navigation. `revalidatePath('/dashboard/dca')` is called after every mutation in `_actions.ts`.

### Sub-Navigation

Two tabs via shadcn `Tabs`:

- **Schedules** (default): shows the schedules table or empty state
- **Analytics**: shows per-symbol DCA summary cards, history chart, and DCA-vs-lump-sum comparison

---

## Why This Feature Exists — User Flows

#### Empty State (`_components/empty-state.tsx`)

**What the user sees**: A centered column with a `Calendar` icon in a muted circle, heading "No DCA Schedules", explanatory text, and an "Add Schedule" button that opens the `AddScheduleModal`.

**What the user can do**:

- Click "New DCA Schedule" to open the creation modal

**Data source**: None — rendered when `schedules.length === 0`

**Why it matters**: First-time users need a clear call to action to set up recurring investment plans

**States**:

- Empty: This is the empty state component itself
- Loading: Covered by `loading.tsx` skeleton
- Error: Not explicitly handled at this level

---

#### Add Schedule Modal (`_components/add-schedule-modal.tsx`)

**What the user sees**: A shadcn `Dialog` triggered by a "New DCA Schedule" button (with `Plus` icon). The dialog contains the `ScheduleForm`.

**What the user can do**:

- Open the modal from the page header (when schedules exist) or from the empty state
- Fill out and submit the form to create a schedule

**Data source**: Takes `portfolioId` as prop from the server component

**Why it matters**: Provides the entry point for starting any DCA plan

**States**:

- Open: Full form visible
- Closed: Button only
- Error: Toast notification on failure

---

#### Schedule Form (`_components/schedule-form.tsx`)

**What the user sees**: A form with 3-4 fields depending on frequency:

- **Asset**: `Select` dropdown with VOO (ETF), QQQ (ETF), BTC (Crypto)
- **Amount (USD)**: `Input` with `$` prefix, `font-mono tabular-nums`, step 0.01, min 1
- **Frequency**: `Select` with Daily, Weekly, Every 2 weeks, Monthly
- **Day of Week**: `Select` (shown for Weekly/Biweekly) — Sunday through Saturday
- **Day of Month**: `Select` (shown for Monthly) — 1 through 28

**What the user can do**:

- Create a new schedule: calls `createDcaSchedule()` server action via FormData
- Edit an existing schedule: calls `updateDcaSchedule()` server action via FormData (symbol is disabled during editing)

**Data source**: Server actions `createDcaSchedule` / `updateDcaSchedule` in `_actions.ts`

**Why it matters**: Configures the exact DCA plan — which asset, how much, and how often — so the cron job knows when to generate reminders

**States**:

- Idle: Form ready to submit
- Pending: Button shows "Creating..." or "Updating..." via `useTransition`
- Error: Toast notification via `sonner`
- Success: Toast notification + modal closes via `onSuccess` callback

---

#### Schedules List (`_components/schedules-list.tsx`)

**What the user sees**: A shadcn `Table` with columns:

- **Asset**: colored `Badge` using `ASSET_COLOR_CLASSES` from portfolio constants
- **Amount**: right-aligned, `font-mono tabular-nums`, formatted as USD
- **Frequency**: human-readable label from `formatFrequencyLabel()` (e.g., "Every Mon", "Monthly on the 15th")
- **Status**: `Badge` — green "Active" or amber "Paused"
- **Actions**: 3 icon buttons — Play/Pause toggle, Pencil edit, Trash delete (rose colored)

**What the user can do**:

- **Toggle active/paused**: calls `toggleDcaSchedule(id, !isActive)` → toast success/error
- **Edit**: opens inline `Dialog` with `ScheduleForm` pre-filled with current values
- **Delete**: opens `AlertDialog` confirmation → calls `deleteDcaSchedule(id)` → toast

**Data source**: `getDcaSchedules()` fetched in `page.tsx` and passed as props

**Why it matters**: Central management view for all DCA plans, with quick toggling for market conditions

**States**:

- Empty: handled by parent (shows `EmptyState` instead)
- Loading: `SchedulesListSkeleton` exported but used by `loading.tsx`
- Toggling: specific row shows disabled button via `togglingId` state
- Deleting: `AlertDialog` with "Deleting..." button text

---

#### DCA Summary Cards (`_components/dca-summary-cards.tsx`)

**What the user sees**: A 4-column grid of `Card` components (2-col on md, 4-col on lg):

1. **Total Invested**: `DollarSign` icon, USD amount, "{count} DCA buys of {symbol}" subtitle
2. **Current Value**: `TrendingUp` icon, USD amount, return percentage in emerald/rose
3. **Avg Cost Basis**: `BarChart3` icon, USD amount, "Weighted average price" subtitle
4. **DCA Buys**: `Hash` icon, count, "Total executions" subtitle

Each card includes an `InfoTooltip` explaining the metric.

**What the user can do**: View-only — no interactions

**Data source**: Calculated by `calculateDcaReturns()` in `_utils.ts`, fed from `getDcaTransactions()` in `_actions.ts`

**Why it matters**: At-a-glance performance metrics to validate that DCA is working as expected

**States**:

- Empty: Parent hides this when `hasTransactions` is false
- Loading: Covered by page-level `loading.tsx`
- Error: No explicit error handling

---

#### DCA History Chart (`_components/dca-history-chart.tsx`)

**What the user sees**: A Recharts `ComposedChart` inside a `Card`:

- **Line**: weighted average cost basis over time (colored per asset via `assetColor`)
- **Scatter**: individual DCA buy points
- **ReferenceLine**: dashed horizontal line at current price with label "Current: $X"
- **Tooltip**: shows date, average cost basis, buy price, and total invested
- **Gradient**: linear gradient fill under the cost basis line
- X-axis: formatted dates via `formatDateShort()` from `lib/date`
- Y-axis: dollar amounts with comma formatting

**What the user can do**: Hover over data points to see tooltip details

**Data source**: `calculateCostBasisTrend()` from `_utils.ts`

**Why it matters**: Visualizes how the cost basis evolves with each purchase, and whether the current price is above or below the average — the core insight for DCA investors

**States**:

- Empty: returns `null` when `costBasisTrend.length === 0`
- Loading: Covered by page-level `loading.tsx`

---

#### DCA vs Lump Sum (`_components/dca-vs-lumpsum.tsx`)

**What the user sees**: A `Card` with a 2-column grid comparing:

- **DCA Strategy**: total invested, current value, return %, with "Winner" or "Underperformed" badge
- **Lump Sum**: same metrics, with "Winner" or "Trailing" badge
- **Advantage Summary**: centered text showing the percentage difference (e.g., "DCA outperformed lump sum by +2.75%")

Badges use emerald for winner, rose for underperformer, amber for trailing.

**What the user can do**: View-only comparison

**Data source**: `calculateLumpSumComparison()` from `_utils.ts` — compares actual DCA buys against a hypothetical investment of the same total amount on the first transaction date

**Why it matters**: Answers the "should I DCA or invest it all at once?" question with real data from the user's own history

**States**:

- Empty: returns `null` when `dcaTotalInvested === 0`
- Loading: Covered by page-level `loading.tsx`

---

#### Notification Center (`app/dashboard/_components/notification-center.tsx`)

**What the user sees**: A bell icon button in the dashboard header. When unread notifications exist, a red badge shows the count (max "9+"). Clicking opens a `DropdownMenu` with:

- "Mark all read" action (with `CheckCheck` icon)
- Notification list (max-h-80 scrollable) with unread dot indicator, title, body, relative timestamp (e.g., "3h ago")
- For `dca_reminder` type notifications: a "Done" button (with `CircleCheck` icon)

**What the user can do**:

- **Mark individual as read**: click any notification
- **Mark all as read**: click "Mark all read" header action
- **Record DCA purchase**: click "Done" on a DCA reminder → opens `MarkDoneDialog`

**Data source**: `getNotifications()` from `_actions.ts`, passed as `initialNotifications` prop

**Why it matters**: Bridge between the cron-generated reminder and the actual purchase recording

**States**:

- Empty: "No notifications yet" centered text
- Loading: No explicit loading — uses optimistic UI updates via `setNotifications`
- Error: Toast notification on `markDcaAsDone` failure

---

#### Mark Done Dialog (`_components/mark-done-dialog.tsx`)

**What the user sees**: A shadcn `Dialog` with:

- Title: "Record DCA Purchase"
- Description showing the symbol and scheduled amount
- **Price per unit ($)**: numeric input with placeholder "e.g. 485.50"
- **Quantity purchased**: numeric input with placeholder "e.g. 1.03"
- Calculated total cost shown when both fields are valid
- Cancel + "Confirm Purchase" buttons

**What the user can do**:

- Enter the actual execution price and quantity
- Confirm to call `markDcaAsDone(scheduleId, price, quantity)` from `_actions.ts`

**Data source**: The `onConfirm` callback triggers `markDcaAsDone()` which:

1. Fetches the schedule to get symbol, portfolio, asset type
2. Finds or creates a position for the symbol
3. Updates position quantity and weighted average buy price
4. Inserts a `transactions` row with `type='DCA'`
5. Marks related notifications as read

**Why it matters**: Closes the DCA loop by recording the actual purchase, updating portfolio positions in real time

**States**:

- Invalid: "Confirm Purchase" disabled when price or quantity <= 0
- Pending: "Recording…" text on button
- Error: Toast on failure (from parent `NotificationCenter`)

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`_actions.ts`)

| Function                     | Zod Schema                | Tables Read                            | Tables Written                               | Returns                    |
| ---------------------------- | ------------------------- | -------------------------------------- | -------------------------------------------- | -------------------------- |
| `getDcaSchedules()`          | None                      | `dca_schedules`                        | None                                         | `DcaSchedule[]`            |
| `createDcaSchedule()`        | `CreateDcaScheduleSchema` | None                                   | `dca_schedules`                              | `{ success } \| { error }` |
| `updateDcaSchedule()`        | `UpdateDcaScheduleSchema` | None                                   | `dca_schedules`                              | `{ success } \| { error }` |
| `toggleDcaSchedule()`        | None (inline validation)  | None                                   | `dca_schedules`                              | `{ success } \| { error }` |
| `deleteDcaSchedule()`        | None                      | None                                   | `dca_schedules` (DELETE)                     | `{ success } \| { error }` |
| `getNotifications()`         | None                      | `notifications`                        | None                                         | `Notification[]`           |
| `markNotificationRead()`     | None                      | None                                   | `notifications`                              | `{ success } \| { error }` |
| `markAllNotificationsRead()` | None                      | None                                   | `notifications`                              | `{ success } \| { error }` |
| `getDcaTransactions()`       | None                      | `transactions`, `positions` (via join) | None                                         | `Transaction[]`            |
| `markDcaAsDone()`            | None (inline validation)  | `dca_schedules`, `positions`           | `positions`, `transactions`, `notifications` | `{ success } \| { error }` |

All functions:

- Call `createClient()` from `lib/supabase/server.ts`
- Check `supabase.auth.getUser()` — return empty array or `{ error: 'Not authenticated' }` if no user
- Filter by `user_id` on every query (defense in depth with RLS)
- Call `revalidatePath('/dashboard/dca')` after mutations (and `/dashboard/portfolio` for `markDcaAsDone`)

---

### API Routes

None specific to DCA (mutations are server actions, not API routes).

---

### Cron Jobs

| Schedule    | Route                         | What It Does                                                                   | Tables Affected                                  | External APIs |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ | ------------- |
| Not in code | `GET /api/cron/dca-reminders` | Checks all active DCA schedules, creates notification rows for those due today | `dca_schedules` (read), `notifications` (insert) | None          |

**Details** (`app/api/cron/dca-reminders/route.ts`):

- **Runtime**: Edge (`export const runtime = 'edge'`)
- **Auth**: `authorization` header must equal `Bearer ${CRON_SECRET}` — returns 401 otherwise
- **Client**: `createAdminClient()` from `lib/supabase/admin.ts` (bypasses RLS)
- **Flow**:
  1. Fetch all rows from `dca_schedules` where `is_active = true`
  2. For each schedule, call `isScheduleDue(schedule, now)` from `_utils.ts`
  3. Build notification objects: `{ user_id, type: 'dca_reminder', title: 'DCA Reminder: {symbol}', body: 'Time to invest ${amount} in {symbol}', related_id: schedule.id }`
  4. Batch insert all reminders into `notifications`
- **Response**: `{ processed: number, reminders: number }`
- **Error**: `{ error: string }` with status 500

---

### External APIs

None. DCA is fully internal — schedules, notifications, and transactions are all managed in Supabase. Market prices come from `positions.average_buy_price` and transaction history, not live API calls.

---

### Zod Schemas (`_schema.ts`)

##### `CreateDcaScheduleSchema` → `type CreateDcaSchedule`

| Field          | Type                                             | Constraints                                      | Description                        |
| -------------- | ------------------------------------------------ | ------------------------------------------------ | ---------------------------------- |
| `portfolio_id` | `string`                                         | `uuid()`                                         | FK to the user's portfolio         |
| `symbol`       | `string`                                         | `min(1)`, `max(10)`, `.toUpperCase()`            | Asset ticker (VOO, QQQ, BTC)       |
| `asset_type`   | `'ETF' \| 'Crypto'`                              | enum                                             | Asset classification               |
| `amount`       | `number`                                         | `positive()`                                     | USD amount per DCA buy             |
| `frequency`    | `'Daily' \| 'Weekly' \| 'Biweekly' \| 'Monthly'` | enum                                             | How often to buy                   |
| `day_of_week`  | `number \| null`                                 | `int()`, `min(0)`, `max(6)`, optional, nullable  | 0=Sunday through 6=Saturday        |
| `day_of_month` | `number \| null`                                 | `int()`, `min(1)`, `max(31)`, optional, nullable | Day of month for monthly schedules |

**Refinement** (`.superRefine`):

- Weekly/Biweekly: `day_of_week` is required
- Monthly: `day_of_month` is required

**Example valid data:**

```typescript
const example: CreateDcaSchedule = {
  portfolio_id: '550e8400-e29b-41d4-a716-446655440000',
  symbol: 'VOO',
  asset_type: 'ETF',
  amount: 100,
  frequency: 'Weekly',
  day_of_week: 1,
  day_of_month: null,
}
```

##### `UpdateDcaScheduleSchema` → `type UpdateDcaSchedule`

| Field          | Type                          | Constraints                                      | Description           |
| -------------- | ----------------------------- | ------------------------------------------------ | --------------------- |
| `id`           | `string`                      | `uuid()`                                         | Schedule ID to update |
| `amount`       | `number \| undefined`         | `positive()`, optional                           | New USD amount        |
| `frequency`    | `string \| undefined`         | enum (same 4 values), optional                   | New frequency         |
| `day_of_week`  | `number \| null \| undefined` | `int()`, `min(0)`, `max(6)`, optional, nullable  | New day of week       |
| `day_of_month` | `number \| null \| undefined` | `int()`, `min(1)`, `max(31)`, optional, nullable | New day of month      |
| `is_active`    | `boolean \| undefined`        | optional                                         | Toggle active/paused  |

**Example valid data:**

```typescript
const example: UpdateDcaSchedule = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  amount: 150,
  frequency: 'Monthly',
  day_of_month: 1,
}
```

#### Constants (`_schema.ts`)

| Export               | Type                     | Value                                                                                             |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `FREQUENCY_LABELS`   | `Record<string, string>` | `{ Daily: 'Every day', Weekly: 'Every week', Biweekly: 'Every 2 weeks', Monthly: 'Every month' }` |
| `DAY_OF_WEEK_LABELS` | `readonly string[]`      | `['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']`                  |

---

## Database Schema

#### `dca_schedules`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql` (base table), `supabase/migrations/20260322100000_dca_schedule_day_columns.sql` (added `day_of_week`, `day_of_month`)

| Column              | Type          | Nullable | Default             | Description                                             |
| ------------------- | ------------- | -------- | ------------------- | ------------------------------------------------------- |
| `id`                | `uuid`        | No       | `gen_random_uuid()` | Primary key                                             |
| `user_id`           | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE                 |
| `portfolio_id`      | `uuid`        | No       | —                   | FK → `portfolios(id)` ON DELETE CASCADE                 |
| `symbol`            | `text`        | No       | —                   | Asset ticker (VOO, QQQ, BTC)                            |
| `asset_type`        | `text`        | No       | —                   | CHECK: `'ETF'` or `'Crypto'`                            |
| `amount`            | `numeric`     | No       | —                   | CHECK: `> 0`, USD amount per buy                        |
| `frequency`         | `text`        | No       | —                   | CHECK: `'Daily'`, `'Weekly'`, `'Biweekly'`, `'Monthly'` |
| `is_active`         | `boolean`     | No       | `true`              | Whether the schedule is active                          |
| `day_of_week`       | `smallint`    | Yes      | `null`              | CHECK: 0–6 (Sunday–Saturday)                            |
| `day_of_month`      | `smallint`    | Yes      | `null`              | CHECK: 1–31                                             |
| `next_execution_at` | `timestamptz` | Yes      | `null`              | Unused — due logic is in `isScheduleDue()`              |
| `created_at`        | `timestamptz` | No       | `now()`             | Row creation timestamp                                  |
| `updated_at`        | `timestamptz` | No       | `now()`             | Auto-updated via trigger                                |

**RLS Policies:**

| Policy                             | Operation | Condition              |
| ---------------------------------- | --------- | ---------------------- |
| Users can view own DCA schedules   | SELECT    | `auth.uid() = user_id` |
| Users can insert own DCA schedules | INSERT    | `auth.uid() = user_id` |
| Users can update own DCA schedules | UPDATE    | `auth.uid() = user_id` |
| Users can delete own DCA schedules | DELETE    | `auth.uid() = user_id` |

**Indexes:**

- `idx_dca_schedules_user_id` on `user_id`
- `idx_dca_schedules_active` on `user_id` WHERE `is_active = true` (partial index)

**Triggers:**

- `set_updated_at` → calls `update_updated_at()` BEFORE UPDATE

**Written by**: `createDcaSchedule()`, `updateDcaSchedule()`, `toggleDcaSchedule()`, `deleteDcaSchedule()` in `_actions.ts`
**Read by**: `getDcaSchedules()` in `_actions.ts`, `/api/cron/dca-reminders/route.ts`, `markDcaAsDone()` in `_actions.ts`

**Example row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "portfolio_id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80",
  "symbol": "VOO",
  "asset_type": "ETF",
  "amount": 100,
  "frequency": "Weekly",
  "is_active": true,
  "day_of_week": 1,
  "day_of_month": null,
  "next_execution_at": null,
  "created_at": "2026-01-06T14:30:00Z",
  "updated_at": "2026-01-06T14:30:00Z"
}
```

---

#### `notifications`

**Created in**: `supabase/migrations/20260322100000_dca_schedule_day_columns.sql`

| Column       | Type          | Nullable | Default             | Description                                                               |
| ------------ | ------------- | -------- | ------------------- | ------------------------------------------------------------------------- |
| `id`         | `uuid`        | No       | `gen_random_uuid()` | Primary key                                                               |
| `user_id`    | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE                                   |
| `type`       | `text`        | No       | —                   | CHECK: `'dca_reminder'`, `'price_alert'`, `'indicator_alert'`, `'system'` |
| `title`      | `text`        | No       | —                   | Notification headline                                                     |
| `body`       | `text`        | No       | —                   | Notification detail text                                                  |
| `read`       | `boolean`     | No       | `false`             | Whether the user has seen it                                              |
| `related_id` | `uuid`        | Yes      | `null`              | FK to the triggering entity (e.g., schedule ID)                           |
| `created_at` | `timestamptz` | No       | `now()`             | Row creation timestamp                                                    |

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

**Written by**: `/api/cron/dca-reminders/route.ts` (INSERT via admin client), `markNotificationRead()`, `markAllNotificationsRead()`, `markDcaAsDone()` in `_actions.ts`
**Read by**: `getNotifications()` in `_actions.ts`

**Example row:**

```json
{
  "id": "7c8d9e0f-1a2b-4c3d-8e5f-6a7b8c9d0e1f",
  "user_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "type": "dca_reminder",
  "title": "DCA Reminder: VOO",
  "body": "Time to invest $100.00 in VOO",
  "read": false,
  "related_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-01-13T08:00:00Z"
}
```

---

### Relationships

```
auth.users
  │
  ├──< dca_schedules (user_id)
  │        │
  │        └──── notifications.related_id (informal FK — no DB constraint)
  │
  ├──< notifications (user_id)
  │
  ├──< portfolios
  │        │
  │        └──< dca_schedules (portfolio_id)
  │        └──< positions
  │                 │
  │                 └──< transactions (position_id, type='DCA')
  │
  └──< positions (user_id)
       └──< transactions (user_id)
```

`markDcaAsDone()` bridges DCA into the portfolio domain: it creates or updates `positions` and inserts `transactions` with `type='DCA'`.

---

## Testing

#### `__tests__/_utils.test.ts`

| Describe Block               | Tests | Key Edge Cases                                                                                                          |
| ---------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| `isScheduleDue`              | 9     | Inactive schedule, weekly on matching/non-matching day, biweekly even/odd week, monthly match/mismatch, null day fields |
| `calculateDcaReturns`        | 4     | Empty transactions, single buy, weighted average for 2 buys, fee accumulation                                           |
| `calculateLumpSumComparison` | 4     | Empty transactions, zero firstDayPrice, DCA advantage (dip+recovery), lump sum advantage (only up)                      |
| `calculateCostBasisTrend`    | 2     | Empty array, running average across 3 buys                                                                              |
| `formatFrequencyLabel`       | 6     | Daily, weekly with day, biweekly with day, monthly 1st/2nd/3rd/15th ordinals                                            |

#### `__tests__/_schema.test.ts`

| Describe Block            | Tests | Key Edge Cases                                                                                                                                                                                                                                   |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CreateDcaScheduleSchema` | 12    | Daily without days, weekly with/without day_of_week, biweekly with/without day_of_week, monthly with/without day_of_month, uppercase symbol transform, zero/negative amount, invalid frequency, day_of_week > 6, day_of_month > 31, empty symbol |
| `UpdateDcaScheduleSchema` | 4     | Missing id, partial update (amount only), toggle is_active, frequency + day_of_month                                                                                                                                                             |

**Run this feature's tests:**

```bash
npm test -- app/dashboard/dca
```

### Test Gaps

- `markDcaAsDone()` — complex multi-table mutation with position create-or-update logic; no unit tests (relies on Supabase, per project convention of not mocking Supabase)
- `formatUsd()` and `formatPct()` — simple formatters without dedicated tests
- `ordinal()` — internal helper in `_utils.ts` without dedicated tests (partially covered by `formatFrequencyLabel` tests)
- Cron route `api/cron/dca-reminders/route.ts` — no tests

---

## File Tree

```
app/dashboard/dca/
├── page.tsx                          # Server Component — fetches schedules + transactions, renders tabs
├── loading.tsx                       # Suspense fallback — header/tab/table skeletons
├── _actions.ts                       # Server Actions — CRUD schedules, notifications, markDcaAsDone
├── _schema.ts                        # Zod schemas + frequency/day-of-week label constants
├── _utils.ts                         # isScheduleDue, DCA calculations, formatting helpers
├── _components/
│   ├── add-schedule-modal.tsx         # Dialog wrapper for ScheduleForm (create mode)
│   ├── dca-history-chart.tsx          # Recharts ComposedChart — cost basis trend + buy scatter
│   ├── dca-summary-cards.tsx          # 4-card grid — invested, value, avg cost, buy count
│   ├── dca-vs-lumpsum.tsx             # Side-by-side DCA vs lump sum comparison card
│   ├── empty-state.tsx                # Calendar icon + CTA when no schedules exist
│   ├── mark-done-dialog.tsx           # Dialog for recording price/quantity of a DCA purchase
│   ├── schedule-form.tsx              # React form — symbol, amount, frequency, day selectors
│   └── schedules-list.tsx             # Table with toggle/edit/delete + edit dialog + delete alert
└── __tests__/
    ├── _schema.test.ts                # 16 tests — CreateDcaScheduleSchema, UpdateDcaScheduleSchema
    └── _utils.test.ts                 # 25 tests — isScheduleDue, returns, lump sum, trend, formatting

# Related files outside the route:

app/dashboard/_components/
└── notification-center.tsx            # Bell dropdown — renders DCA reminders, "Done" button

app/dashboard/portfolio/
└── _constants.ts                      # ASSET_COLORS, ASSET_COLOR_CLASSES, DEFAULT_ASSET_COLOR

app/api/cron/dca-reminders/
└── route.ts                           # Edge cron — checks due schedules, inserts notifications

lib/supabase/
├── server.ts                          # createClient() — used by all _actions.ts functions
├── admin.ts                           # createAdminClient() — used by cron route (bypasses RLS)
└── database.types.ts                  # Generated types for dca_schedules, notifications

lib/date/
└── index.ts                           # formatDateShort() — used by DcaHistoryChart

supabase/migrations/
├── 20260320000000_initial_schema.sql              # Creates dca_schedules table (base columns)
└── 20260322100000_dca_schedule_day_columns.sql    # Adds day_of_week, day_of_month + notifications table
```

---

## Known Limitations

- **`next_execution_at` column is unused**: The `dca_schedules` table has a `next_execution_at` timestamptz column that is never written to by any action or cron job. The cron route recalculates due status from scratch using `isScheduleDue()` on each run instead of using this column.
- **No duplicate reminder prevention**: The cron job does not check whether a reminder for today already exists before inserting. Running it multiple times in one day creates duplicate notifications.
- **Hardcoded asset list**: The `ScheduleForm` component hardcodes `SYMBOLS` to `[VOO, QQQ, BTC]`. Adding a new asset requires a code change.
- **Day of month limited to 28**: The form only shows days 1–28 to avoid end-of-month edge cases (months with 29/30/31 days), but the DB constraint allows up to 31.
- **No cron schedule configuration in codebase**: There is no `vercel.json` with cron definitions. The schedule must be configured externally (Vercel dashboard or other trigger).
- **Last price approximation**: The analytics tab uses the last transaction's price as the "current price" (`txns[txns.length - 1].price`) rather than fetching a live market quote. This becomes stale as time passes since the last DCA execution.
- **No fee tracking in markDcaAsDone**: The `markDcaAsDone()` function always sets `fee: 0` when inserting transactions. There is no UI field or parameter to capture broker fees.
- **SPECS.md tasks all completed**: All 15 tasks across US-5.1, US-5.2, and US-5.3 are marked `[x]`.
