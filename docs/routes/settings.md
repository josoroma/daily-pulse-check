# E10: Settings & Data Management

> Centralized configuration hub where the user manages their profile, appearance (theme), AI model preferences, API keys, notification channels, system diagnostics, data export/import, password changes, and account deletion. Every preference is persisted in Supabase with RLS, and sensitive values (API keys) are encrypted at rest with AES-256-GCM.

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
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Settings Page                                  │
│  (Server Component — app/dashboard/settings/page.tsx)                       │
│                                                                             │
│  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐ ┌──────┐ ┌────────┐ │
│  │ Profile  │ │ Appearance │ │ AI Model│ │ API Keys │ │Notif.│ │ Diag.  │ │
│  │   Tab    │ │    Tab     │ │   Tab   │ │   Tab    │ │ Tab  │ │  Tab   │ │
│  └────┬─────┘ └─────┬──────┘ └────┬────┘ └────┬─────┘ └──┬───┘ └───┬────┘ │
│       │              │             │            │          │         │      │
│       ▼              ▼             ▼            ▼          ▼         ▼      │
│  ProfileForm    AppearanceCard  AiModelCard  ApiKeysCard  Notif.  Diag.    │
│  (client)       (client)        (client)     (client)     Card    Panel    │
│   next-themes                                             (client)(client) │
└───┬──────────────────┬─────────────┬────────────┬──────────┬────────┬──────┘
    │                  │             │            │          │        │
    ▼                  │             ▼            ▼          ▼        ▼
updateProfile()        │      updateAiModel()  saveApiKey() updateNotif  fetch()
(profile/_actions.ts)  │      (_actions.ts)    deleteApiKey()Prefs()   ↓
    │                  │         │             testApiKey() (_actions)  │
    ▼                  │         ▼             (_actions.ts)   │       ▼
Supabase:profiles      │   Supabase:profiles      │           ▼     /api/ai/health
                       │                           ▼        Supabase  /api/ai/test
                  CSS variables              Supabase:       :profiles /api/db/test
                  (next-themes)              user_api_keys
                                                │
                                                ▼
                                           lib/encryption.ts
                                           (AES-256-GCM)
                                                │
                                           testApiKey() ──► External APIs:
                                                            Twelve Data
                                                            OpenAI
                                                            FRED
                                                            CoinGecko

┌──────────────────────────────────────────────────────────────────────────────┐
│                          Data & Account Page                                │
│  (Server Component — app/dashboard/settings/data/page.tsx)                  │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ Export Data   │ │ CSV Import   │ │ Change Pass  │ │ Delete Account   │   │
│  │  Card         │ │ Card         │ │ Card         │ │ Card             │   │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────────┘   │
│         │                │                │                │               │
│         ▼                ▼                ▼                ▼               │
│   exportAllData()  importPositions()  changePassword()  deleteAccount()   │
│   (_actions.ts)    (_actions.ts)      (_actions.ts)     (_actions.ts)     │
│         │                │                │                │               │
│         ▼                ▼                ▼                ▼               │
│   Supabase: all     Supabase:       Supabase Auth     Admin client        │
│   user tables       positions        signInWithPwd()   deleteUser()       │
│   → JSON blob       (INSERT)         updateUser()     → cascade delete    │
│   → sanitize                                          → signOut()         │
│   → download                                          → redirect('/')     │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Pages & Navigation

| Path                       | Component       | Type             | Description                                                                                           |
| -------------------------- | --------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `/dashboard/settings`      | `page.tsx`      | Server Component | Main settings page with six tabs: Profile, Appearance, AI Model, API Keys, Notifications, Diagnostics |
| `/dashboard/settings/data` | `data/page.tsx` | Server Component | Data management sub-page: Export, CSV Import, Password Change, Account Deletion                       |

### Loading State

No `loading.tsx` exists for the settings route. Data is fetched server-side via `Promise.all` in `page.tsx` before rendering.

### Auto-Refresh

No polling or auto-refresh. All data is fetched once on page load; mutations use `revalidatePath('/dashboard/settings')` to trigger server re-render.

### Sub-Navigation

- **Main page**: Tabs component (`shadcn/ui Tabs`) with six tab triggers — `profile`, `appearance`, `ai`, `api-keys`, `notifications`, `diagnostics`
- **Data & Account** link: `Button` in the page header links to `/dashboard/settings/data`
- **Back navigation**: Data page has a back arrow (`ArrowLeft`) linking to `/dashboard/settings`

---

## Why This Feature Exists — User Flows

#### Profile Form (`app/profile/_components/profile-form.tsx`)

**What the user sees**: A form card with fields for Display Name, Base Currency (USD/CRC dropdown), Country, and Risk Tolerance (Conservative/Medium/Medium-High/Aggressive).

**What the user can do**:

- Edit profile fields and click "Save" → calls `updateProfile()` from `app/profile/_actions.ts`

**Data source**: `getProfile()` from `app/profile/_actions.ts` — reads `profiles` table

**Why it matters**: Base currency affects how monetary values are displayed across the dashboard (USD vs CRC). Risk tolerance influences AI-generated portfolio analysis. Country sets the user's jurisdiction context (Costa Rica).

**States**:

- Empty: Fields show defaults — `USD`, empty display name, `moderate` risk tolerance
- Loading: Submit button shows spinner (`Loader2`)
- Error: Toast notification via `sonner` with error message
- Success: Toast notification confirming update

---

#### Appearance Card (`_components/appearance-card.tsx`)

**What the user sees**: Three themed radio-like buttons: Light (Sun icon), Dark (Moon icon), System (Monitor icon). Active selection is highlighted with emerald green border and label.

**What the user can do**:

- Click any theme option → `setTheme()` from `next-themes` applies immediately
- Theme persists via `next-themes` localStorage mechanism

**Data source**: `useTheme()` hook from `next-themes` — client-side only, no server action

**Why it matters**: Extended market monitoring sessions benefit from dark mode to reduce eye strain. System mode automatically follows the user's OS preference.

**States**:

- Default: Inherits from `next-themes` default (typically system)
- Active: Selected theme shows emerald border, icon highlight, and "Active" label

---

#### AI Model Card (`_components/ai-model-card.tsx`)

**What the user sees**: A card with Bot icon, two dropdowns (Provider: OpenAI or Ollama; Model: list from `MODEL_REGISTRY`), and a Save button. When Ollama is selected, a health check runs automatically.

**What the user can do**:

- Select AI provider → model list updates to that provider's models; default model auto-selected via `getDefaultModel()`
- Select model within the provider
- Click "Save" → calls `updateAiModel()` server action

**Data source**: `getAiPreferences()` from `_actions.ts` — reads `ai_provider`, `ai_model` from `profiles` table

**Why it matters**: Users with local GPU resources can use Ollama for free, private AI insights. Others use OpenAI's hosted models. The selected model is used across all AI features (market summary, portfolio analysis, learning assistant).

**States**:

- Default: OpenAI / `gpt-4.1-mini`
- Ollama checking: Fires `GET /api/ai/health` on provider switch — shows amber warning if Ollama is unreachable
- Saving: Button shows spinner
- Error: Red banner with error message
- Success: Green banner "AI model preferences saved"

---

#### API Keys Card (`_components/api-keys-card.tsx`)

**What the user sees**: A card listing four services — Twelve Data (stock & ETF data), OpenAI (AI insights), FRED (economic data), CoinGecko (crypto data, optional). Each service shows its status, with actions to add, update, test, or delete keys.

**What the user can do**:

- Click "Add Key" → input field appears for the API key
- Save key → calls `saveApiKey()` — key is encrypted with AES-256-GCM and stored
- Click "Test" → calls `testApiKey()` — decrypts the key and makes a real API call to verify
- Click "Update" → re-enters edit mode for that service
- Click "Delete" (trash icon) → calls `deleteApiKey()` — removes the encrypted key
- Toggle password visibility for the key input field

**Data source**: `getApiKeyStatuses()` from `_actions.ts` — reads `user_api_keys` for `hasKey`, `isValid`, `lastVerified`

**Why it matters**: Free-tier API keys have limited quotas. Users who want higher rate limits or premium data can provide their own keys. Keys are encrypted at rest so even database access doesn't expose plaintext secrets.

**States**:

- No key: "Add Key" button shown
- Key saved, untested: No validation icon
- Key valid: Green `CheckCircle2` icon
- Key invalid: Red `XCircle` icon
- Testing: Service-specific spinner
- Editing: Input field with Save/Cancel buttons

---

#### Notification Preferences Card (`_components/notification-preferences-card.tsx`)

**What the user sees**: Three notification channels displayed as bordered rows:

1. **In-App Notifications** — always on (bell icon, emerald "Always on" label)
2. **Email Notifications** — toggle switch (Mail icon)
3. **Telegram Notifications** — toggle switch (Send icon), with expandable Telegram Chat ID field

**What the user can do**:

- Toggle email notifications on/off
- Toggle Telegram notifications on/off → when enabled, a Chat ID input field appears
- Enter Telegram Chat ID (instructions: "Message @userinfobot on Telegram to get your Chat ID")
- Click "Save Preferences" → calls `updateNotificationPreferences()`

**Data source**: `getNotificationPreferences()` from `_actions.ts` — reads `notification_email_enabled`, `notification_telegram_enabled`, `telegram_chat_id` from `profiles`

**Why it matters**: Price alerts (from E7) are dispatched through these channels. Email and Telegram provide real-time notifications when the user isn't actively on the dashboard, ensuring they don't miss critical price movements on VOO, QQQ, or BTC.

**States**:

- Default: Email off, Telegram off, in-app always on
- Telegram enabled without ID: Validation error "Telegram Chat ID is required when Telegram is enabled"
- Saving: Button shows spinner with "Saving..."
- Success: Toast "Notification preferences updated"
- Error: Toast with error message

---

#### Diagnostics Panel (`_components/diagnostics-panel.tsx`)

**What the user sees**: A card with "System Diagnostics" title showing the current provider/model, a "Run All Tests" button, and results as a checklist with elapsed times.

**What the user can do**:

- Click "Run All Tests" → sequentially tests:
  1. Ollama server connectivity (only if provider is `ollama`) — `GET /api/ai/health`
  2. Supabase database — `GET /api/db/test`
  3. AI model streaming — `POST /api/ai/test` with provider/model in body
- View test results with pass/fail icons and elapsed milliseconds
- View streamed AI response text in a code block

**Data source**: Client-side `fetch()` calls to three API diagnostic endpoints

**Why it matters**: When AI features or market data aren't working, this panel helps the user quickly identify whether the issue is the database connection, Ollama server, or AI model configuration — without needing to check server logs.

**States**:

- Idle: "Run All Tests" button enabled
- Running: Button shows "Running Tests…" with spinner; results appear progressively
- Complete: Checklist of pass/fail results with timing; AI response preview if streaming test passed

---

#### Export Data Card (`_components/export-data-card.tsx`)

**What the user sees**: A card with FileJson icon explaining that all data will be exported as JSON. Lists included data (profile, portfolios, positions, transactions, DCA schedules, alerts, snapshots) and notes that sensitive data is excluded.

**What the user can do**:

- Click "Export All Data" → calls `exportAllData()` server action
- JSON blob is sanitized via `sanitizeExportData()` to strip sensitive keys
- Browser downloads `finance-dashboard-export-YYYY-MM-DD.json`
- Last export timestamp is displayed

**Data source**: `exportAllData()` — parallel queries across 7 tables: `profiles`, `portfolios`, `positions`, `transactions`, `dca_schedules`, `alerts`, `portfolio_snapshots`

**Why it matters**: Data ownership — the user can back up all their financial data or migrate to another tool. GDPR-style data portability.

**States**:

- Default: "Export All Data" button
- Exporting: Button shows spinner
- Done: "Last exported: {timestamp}" shown
- Error: Toast with error message

---

#### CSV Import Card (`_components/csv-import-card.tsx`)

**What the user sees**: A three-step flow:

1. **Upload**: Dashed border drop zone with "Click to upload CSV" prompt
2. **Preview**: Table showing parsed valid rows (symbol, type, quantity, avg price, notes), invalid row errors in red, portfolio selector dropdown
3. **Done**: Success checkmark with import count

**What the user can do**:

- Upload a `.csv` file → parsed client-side via `parseCsv()` from `_utils.ts`
- Headers are auto-mapped using `mapHeaders()` — supports aliases like `Ticker`, `Shares`, `Cost Basis`
- Review valid/invalid rows in a preview table (first 20 rows shown)
- Select target portfolio from dropdown
- Click "Import N Positions" → calls `importPositions()` server action
- Click "Import More" to reset and start over

**Data source**: Client-side CSV parsing via `_utils.ts`; `importPositions()` inserts into `positions` table

**Why it matters**: Users migrating from spreadsheets or other portfolio trackers can bulk-import their positions instead of adding them one by one.

**States**:

- Upload: File input with drag-and-drop zone
- Preview: Valid row count (green), invalid row count (red), table, portfolio selector, Import/Cancel buttons
- Importing: Button shows spinner
- Done: Checkmark with "{N} positions were added to your portfolio" and "Import More" button
- Error: Toast with message; CSV parse errors shown inline

---

#### Password Change Card (`_components/password-change-card.tsx`)

**What the user sees**: A form with Lock icon, three password fields: Current Password, New Password (min 8 chars), Confirm New Password.

**What the user can do**:

- Enter current and new passwords → click "Update Password"
- Server verifies current password via `signInWithPassword()`, then calls `updateUser()` to set the new password

**Data source**: `changePassword()` server action — uses Supabase Auth API

**Why it matters**: Standard account security. Users should be able to rotate credentials without creating a new account.

**States**:

- Default: Three empty password fields
- Submitting: Button shows spinner
- Success: Green banner "Password updated successfully" + toast
- Error: Toast "Current password is incorrect" or other validation errors

---

#### Delete Account Card (`_components/delete-account-card.tsx`)

**What the user sees**: A rose-bordered "Danger Zone" card with AlertTriangle icon. A "Delete My Account" button triggers an AlertDialog modal requiring email confirmation.

**What the user can do**:

- Click "Delete My Account" → AlertDialog opens
- Type their email address in the confirmation input
- Click "Delete Account" (only enabled when typed email matches) → calls `deleteAccount()` server action
- Server action uses admin client to `deleteUser()` (CASCADE handles all child data), signs out, and redirects to `/`

**Data source**: `deleteAccount()` server action — Supabase admin client for user deletion

**Why it matters**: Users must be able to permanently remove all their data. The email confirmation prevents accidental deletion. Cascade delete ensures no orphaned records.

**States**:

- Default: Red "Delete My Account" button
- Dialog open: Email input, Cancel/Delete buttons; Delete disabled until email matches
- Deleting: Spinner on Delete button
- Error: Toast with error message
- Success: Redirected to landing page `/`

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`_actions.ts`)

| Function                          | Zod Schema                      | Tables Read                                                                                             | Tables Written           | Returns                                                                                     |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `updateAiModel()`                 | `AiModelSchema`                 | `profiles`                                                                                              | `profiles`               | `{ success: true }` \| `{ error: string }`                                                  |
| `getAiPreferences()`              | None                            | `profiles`                                                                                              | None                     | `{ ai_provider, ai_model }` \| `null`                                                       |
| `getNotificationPreferences()`    | None                            | `profiles`                                                                                              | None                     | `{ notification_email_enabled, notification_telegram_enabled, telegram_chat_id }` \| `null` |
| `updateNotificationPreferences()` | `NotificationPreferencesSchema` | `profiles`                                                                                              | `profiles`               | `{ success: true }` \| `{ error: string }`                                                  |
| `getApiKeyStatuses()`             | None                            | `user_api_keys`                                                                                         | None                     | `Record<string, { hasKey, isValid, lastVerified }>`                                         |
| `saveApiKey()`                    | `SaveApiKeySchema`              | None                                                                                                    | `user_api_keys` (UPSERT) | `{ success: true }` \| `{ error: string }`                                                  |
| `deleteApiKey()`                  | `ServiceSchema`                 | None                                                                                                    | `user_api_keys` (DELETE) | `{ success: true }` \| `{ error: string }`                                                  |
| `testApiKey()`                    | `ServiceSchema`                 | `user_api_keys`                                                                                         | `user_api_keys` (UPDATE) | `{ success: true }` \| `{ error: string }`                                                  |
| `exportAllData()`                 | None                            | `profiles`, `portfolios`, `positions`, `transactions`, `dca_schedules`, `alerts`, `portfolio_snapshots` | None                     | Sanitized export object \| `{ error: string }`                                              |
| `changePassword()`                | `ChangePasswordSchema`          | None                                                                                                    | None (Supabase Auth)     | `{ success: true }` \| `{ error: string }`                                                  |
| `deleteAccount()`                 | `DeleteAccountSchema`           | None                                                                                                    | All tables (CASCADE)     | Redirect to `/` \| `{ error: string }`                                                      |
| `importPositions()`               | `ImportPositionsSchema`         | `portfolios`                                                                                            | `positions` (INSERT)     | `{ success: true, count: number }` \| `{ error: string }`                                   |

**Auth requirement**: Every function calls `createClient()` and `getUser()`. Unauthenticated users receive `{ error: 'Not authenticated' }`. `deleteAccount()` additionally uses `createAdminClient()` for the admin-level user deletion.

**Revalidation**: `updateAiModel()`, `updateNotificationPreferences()`, `saveApiKey()`, `deleteApiKey()` all call `revalidatePath('/dashboard/settings')`. `importPositions()` revalidates `/dashboard/portfolio`.

### API Routes

| Method | Path             | Auth | Request Body                          | Response                                             | External APIs                                                |
| ------ | ---------------- | ---- | ------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `GET`  | `/api/ai/health` | No   | None                                  | `{ ok: boolean }`                                    | Ollama (`OLLAMA_BASE_URL`, default `http://localhost:11434`) |
| `POST` | `/api/ai/test`   | No   | `{ provider: string, model: string }` | Text stream (plain text)                             | OpenAI or Ollama via `streamText()`                          |
| `GET`  | `/api/db/test`   | No   | None                                  | `{ ok: boolean, elapsed: number, message?: string }` | Supabase (checks `profiles` table with `head: true`)         |

#### `/api/ai/health` (`app/api/ai/health/route.ts`)

- Tests Ollama server connectivity by fetching the base URL
- 3-second abort timeout via `AbortController`
- Returns `{ ok: true }` if Ollama responds, `{ ok: false }` otherwise
- No auth check — lightweight connectivity probe

#### `/api/ai/test` (`app/api/ai/test/route.ts`)

- Creates a `LanguageModel` via `getLanguageModel()` from `lib/ai/provider.ts`
- Sends a minimal prompt: `"Respond with exactly: 'Connection successful. Model is running.'"`
- Streams the text response back as `text/plain`
- On error, streams `[Error: {message}]`
- `maxOutputTokens: 100`, `temperature: 0`

#### `/api/db/test` (`app/api/db/test/route.ts`)

- Creates Supabase server client, executes a lightweight `SELECT` on `profiles` with `head: true`
- Returns elapsed time in milliseconds
- No auth check — connectivity probe only

### Cron Jobs

None. The settings feature has no scheduled tasks.

### External APIs

External APIs are called only during the `testApiKey()` server action to verify user-provided keys.

##### Twelve Data

| Detail                  | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| Base URL                | `https://api.twelvedata.com`                                       |
| Auth                    | API key as query parameter `apikey`                                |
| Free tier limit         | 800 requests/day, 8 per minute                                     |
| Cache TTL               | N/A (test call only)                                               |
| Fallback if unavailable | Returns `{ error: 'Connection test failed — check your API key' }` |

**Endpoints called:**

| Endpoint           | Parameters                                                     | Returns                                         | Used for       |
| ------------------ | -------------------------------------------------------------- | ----------------------------------------------- | -------------- |
| `GET /time_series` | `symbol=AAPL`, `interval=1day`, `outputsize=1`, `apikey={key}` | Time series data or `{ code, status: 'error' }` | Key validation |

##### OpenAI

| Detail                  | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| Base URL                | `https://api.openai.com`                                           |
| Auth                    | `Authorization: Bearer {key}` header                               |
| Free tier limit         | Pay-per-use                                                        |
| Cache TTL               | N/A (test call only)                                               |
| Fallback if unavailable | Returns `{ error: 'Connection test failed — check your API key' }` |

**Endpoints called:**

| Endpoint         | Parameters         | Returns           | Used for       |
| ---------------- | ------------------ | ----------------- | -------------- |
| `GET /v1/models` | None (auth header) | Model list or 401 | Key validation |

##### FRED (Federal Reserve Economic Data)

| Detail                  | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| Base URL                | `https://api.stlouisfed.org`                                       |
| Auth                    | API key as query parameter `api_key`                               |
| Free tier limit         | 120 requests/minute                                                |
| Cache TTL               | N/A (test call only)                                               |
| Fallback if unavailable | Returns `{ error: 'Connection test failed — check your API key' }` |

**Endpoints called:**

| Endpoint           | Parameters                                         | Returns                  | Used for       |
| ------------------ | -------------------------------------------------- | ------------------------ | -------------- |
| `GET /fred/series` | `series_id=DFF`, `api_key={key}`, `file_type=json` | Series metadata or error | Key validation |

##### CoinGecko

| Detail                  | Value                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| Base URL                | `https://api.coingecko.com`                                        |
| Auth                    | `x-cg-demo-api-key` header (optional)                              |
| Free tier limit         | 10-30 calls/minute (demo key)                                      |
| Cache TTL               | N/A (test call only)                                               |
| Fallback if unavailable | Returns `{ error: 'Connection test failed — check your API key' }` |

**Endpoints called:**

| Endpoint           | Parameters        | Returns                               | Used for       |
| ------------------ | ----------------- | ------------------------------------- | -------------- |
| `GET /api/v3/ping` | None (key header) | `{ gecko_says: "(V3) To the Moon!" }` | Key validation |

### Zod Schemas (`_schema.ts`)

##### `AiModelSchema` → `type AiModel`

| Field         | Type                   | Constraints                                                     | Description           |
| ------------- | ---------------------- | --------------------------------------------------------------- | --------------------- |
| `ai_provider` | `'openai' \| 'ollama'` | `z.enum(AI_PROVIDERS)`                                          | AI provider selection |
| `ai_model`    | `string`               | `min(1)`, refined to be valid for provider via `MODEL_REGISTRY` | Model identifier      |

**Example valid data:**

```typescript
const example: AiModel = {
  ai_provider: 'openai',
  ai_model: 'gpt-4.1-mini',
}
```

##### `SaveApiKeySchema` → `type SaveApiKey`

| Field     | Type                                                 | Constraints                | Description                                  |
| --------- | ---------------------------------------------------- | -------------------------- | -------------------------------------------- |
| `service` | `'twelve_data' \| 'openai' \| 'fred' \| 'coingecko'` | `z.enum(API_KEY_SERVICES)` | Target service                               |
| `api_key` | `string`                                             | `min(1), max(500)`         | Plaintext API key (encrypted before storage) |

**Example valid data:**

```typescript
const example: SaveApiKey = {
  service: 'twelve_data',
  api_key: 'a1b2c3d4e5f6g7h8i9j0',
}
```

##### `ServiceSchema` → `type Service`

| Field     | Type                                                 | Constraints                | Description        |
| --------- | ---------------------------------------------------- | -------------------------- | ------------------ |
| `service` | `'twelve_data' \| 'openai' \| 'fred' \| 'coingecko'` | `z.enum(API_KEY_SERVICES)` | Service identifier |

**Example valid data:**

```typescript
const example: Service = {
  service: 'openai',
}
```

##### `NotificationPreferencesSchema` → `type NotificationPreferences`

| Field                           | Type                                | Constraints                                                                 | Description                  |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| `notification_email_enabled`    | `boolean` (from `string` transform) | String `'true'`/`'false'` → boolean                                         | Email notification toggle    |
| `notification_telegram_enabled` | `boolean` (from `string` transform) | String `'true'`/`'false'` → boolean                                         | Telegram notification toggle |
| `telegram_chat_id`              | `string`                            | `trim()`, optional, default `''`; required if Telegram enabled (refinement) | Telegram bot chat identifier |

**Example valid data:**

```typescript
const example: NotificationPreferences = {
  notification_email_enabled: true,
  notification_telegram_enabled: true,
  telegram_chat_id: '123456789',
}
```

##### `ChangePasswordSchema` → `type ChangePassword`

| Field              | Type     | Constraints                            | Description              |
| ------------------ | -------- | -------------------------------------- | ------------------------ |
| `current_password` | `string` | `min(1)`                               | Current account password |
| `new_password`     | `string` | `min(8), max(128)`                     | New password             |
| `confirm_password` | `string` | Must match `new_password` (refinement) | Password confirmation    |

**Example valid data:**

```typescript
const example: ChangePassword = {
  current_password: 'OldP@ssw0rd',
  new_password: 'MyS3cureP@ss2026',
  confirm_password: 'MyS3cureP@ss2026',
}
```

##### `DeleteAccountSchema` → `type DeleteAccount`

| Field                | Type     | Constraints | Description                               |
| -------------------- | -------- | ----------- | ----------------------------------------- |
| `confirmation_email` | `string` | `email()`   | Must match the authenticated user's email |

**Example valid data:**

```typescript
const example: DeleteAccount = {
  confirmation_email: 'developer@costarica.cr',
}
```

##### `CsvRowSchema` → `type CsvRow`

| Field               | Type                | Constraints                        | Description                                       |
| ------------------- | ------------------- | ---------------------------------- | ------------------------------------------------- |
| `symbol`            | `string`            | `min(1), max(10)`, `toUpperCase()` | Ticker symbol (auto-uppercased)                   |
| `asset_type`        | `'ETF' \| 'Crypto'` | `z.enum(['ETF', 'Crypto'])`        | Asset classification                              |
| `quantity`          | `number`            | `z.coerce.number().positive()`     | Number of shares/units                            |
| `average_buy_price` | `number`            | `z.coerce.number().nonnegative()`  | Average cost per unit (0 allowed for free shares) |
| `notes`             | `string`            | `max(500)`, optional, default `''` | User notes about this position                    |

**Example valid data:**

```typescript
const example: CsvRow = {
  symbol: 'VOO',
  asset_type: 'ETF',
  quantity: 10,
  average_buy_price: 420.5,
  notes: 'Bought during March 2026 dip',
}
```

##### `ImportPositionsSchema` → `type ImportPositions`

| Field         | Type       | Constraints    | Description                 |
| ------------- | ---------- | -------------- | --------------------------- |
| `portfolioId` | `string`   | `uuid()`       | Target portfolio UUID       |
| `positions`   | `CsvRow[]` | `min(1)` array | Array of validated CSV rows |

**Example valid data:**

```typescript
const example: ImportPositions = {
  portfolioId: '550e8400-e29b-41d4-a716-446655440000',
  positions: [
    { symbol: 'VOO', asset_type: 'ETF', quantity: 10, average_buy_price: 420.5, notes: '' },
    { symbol: 'BTC', asset_type: 'Crypto', quantity: 0.5, average_buy_price: 45000, notes: '' },
  ],
}
```

---

## Database Schema

#### `profiles`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`, extended by `20260323000000_ai_provider_and_summaries.sql` and `20260325000000_alerts_status_and_indicators.sql`

| Column                          | Type          | Nullable | Default          | Description                                                                         |
| ------------------------------- | ------------- | -------- | ---------------- | ----------------------------------------------------------------------------------- |
| `id`                            | `uuid`        | No       | —                | PK, FK → `auth.users(id)` ON DELETE CASCADE                                         |
| `display_name`                  | `text`        | Yes      | `null`           | User's display name                                                                 |
| `base_currency`                 | `text`        | No       | `'USD'`          | `CHECK (base_currency in ('USD', 'CRC'))`                                           |
| `country`                       | `text`        | No       | `'CR'`           | User's country code                                                                 |
| `risk_tolerance`                | `text`        | No       | `'Medium'`       | `CHECK (risk_tolerance in ('Conservative', 'Medium', 'Medium-High', 'Aggressive'))` |
| `ai_provider`                   | `text`        | No       | `'openai'`       | `CHECK (ai_provider in ('openai', 'ollama'))`                                       |
| `ai_model`                      | `text`        | No       | `'gpt-4.1-mini'` | Selected AI model identifier                                                        |
| `notification_email_enabled`    | `boolean`     | No       | `false`          | Email notification toggle                                                           |
| `notification_telegram_enabled` | `boolean`     | No       | `false`          | Telegram notification toggle                                                        |
| `telegram_chat_id`              | `text`        | Yes      | `null`           | Telegram bot chat ID                                                                |
| `created_at`                    | `timestamptz` | No       | `now()`          | Row creation timestamp                                                              |
| `updated_at`                    | `timestamptz` | No       | `now()`          | Last update timestamp                                                               |

**RLS Policies:**

| Policy                         | Operation | Condition         |
| ------------------------------ | --------- | ----------------- |
| `Users can view own profile`   | SELECT    | `auth.uid() = id` |
| `Users can insert own profile` | INSERT    | `auth.uid() = id` |
| `Users can update own profile` | UPDATE    | `auth.uid() = id` |

**Triggers:**

- `on_auth_user_created` → calls `handle_new_user()` on INSERT to `auth.users` — auto-creates a `profiles` row with `display_name` from `raw_user_meta_data`

**Written by**: `updateProfile()` in `app/profile/_actions.ts`, `updateAiModel()` in `app/dashboard/settings/_actions.ts`, `updateNotificationPreferences()` in `app/dashboard/settings/_actions.ts`

**Read by**: `getProfile()`, `getAiPreferences()`, `getNotificationPreferences()`, `page.tsx` (settings), `api/db/test`

**Example row:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "display_name": "José",
  "base_currency": "USD",
  "country": "CR",
  "risk_tolerance": "Medium-High",
  "ai_provider": "openai",
  "ai_model": "gpt-4.1-mini",
  "notification_email_enabled": true,
  "notification_telegram_enabled": false,
  "telegram_chat_id": null,
  "created_at": "2026-01-15T14:30:00.000Z",
  "updated_at": "2026-04-01T09:15:00.000Z"
}
```

---

#### `user_api_keys`

**Created in**: `supabase/migrations/20260326000000_user_api_keys.sql`

| Column             | Type          | Nullable | Default             | Description                                                         |
| ------------------ | ------------- | -------- | ------------------- | ------------------------------------------------------------------- |
| `id`               | `uuid`        | No       | `gen_random_uuid()` | Primary key                                                         |
| `user_id`          | `uuid`        | No       | —                   | FK → `auth.users(id)` ON DELETE CASCADE                             |
| `service`          | `text`        | No       | —                   | `CHECK (service in ('twelve_data', 'openai', 'fred', 'coingecko'))` |
| `encrypted_key`    | `text`        | No       | —                   | AES-256-GCM encrypted API key (base64-encoded iv+tag+ciphertext)    |
| `is_valid`         | `boolean`     | Yes      | `null`              | Last test result (`null` = untested)                                |
| `last_verified_at` | `timestamptz` | Yes      | `null`              | When the key was last tested                                        |
| `created_at`       | `timestamptz` | No       | `now()`             | Row creation timestamp                                              |
| `updated_at`       | `timestamptz` | No       | `now()`             | Last update timestamp                                               |

**Constraints:**

- `UNIQUE (user_id, service)` — one key per service per user

**RLS Policies:**

| Policy                          | Operation | Condition              |
| ------------------------------- | --------- | ---------------------- |
| `Users can view own API keys`   | SELECT    | `auth.uid() = user_id` |
| `Users can insert own API keys` | INSERT    | `auth.uid() = user_id` |
| `Users can update own API keys` | UPDATE    | `auth.uid() = user_id` |
| `Users can delete own API keys` | DELETE    | `auth.uid() = user_id` |

**Written by**: `saveApiKey()` (UPSERT), `testApiKey()` (UPDATE `is_valid`, `last_verified_at`), `deleteApiKey()` (DELETE) in `_actions.ts`

**Read by**: `getApiKeyStatuses()`, `testApiKey()` (reads `encrypted_key` for decryption) in `_actions.ts`

**Example row:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "service": "twelve_data",
  "encrypted_key": "dGhpcyBpcyBhIGJhc2U2NC1lbmNvZGVkIGVuY3J5cHRlZCBrZXk=",
  "is_valid": true,
  "last_verified_at": "2026-04-01T10:00:00.000Z",
  "created_at": "2026-03-20T08:00:00.000Z",
  "updated_at": "2026-04-01T10:00:00.000Z"
}
```

---

#### Relationships

```
auth.users(id)
  ├── profiles(id)              1:1  ON DELETE CASCADE
  └── user_api_keys(user_id)    1:N  ON DELETE CASCADE
       └── UNIQUE(user_id, service)

profiles — stores AI prefs, notification prefs, profile data
user_api_keys — stores encrypted external API keys per service
```

The `exportAllData()` action also reads from these additional tables (not owned by settings, but queried for export):

- `portfolios` (user_id → auth.users)
- `positions` (user_id → auth.users)
- `transactions` (user_id → auth.users)
- `dca_schedules` (user_id → auth.users)
- `alerts` (user_id → auth.users)
- `portfolio_snapshots` (user_id → auth.users)

---

## Testing

#### `__tests__/_schema.test.ts`

| Describe Block                  | Tests | Key Edge Cases                                                                                               |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| `AiModelSchema`                 | 5     | Rejects invalid provider (`anthropic`), rejects model not in provider's registry, rejects empty model        |
| `SaveApiKeySchema`              | 5     | All 4 services accepted, rejects invalid service (`stripe`), rejects empty key, rejects key > 500 chars      |
| `ChangePasswordSchema`          | 5     | Rejects empty current password, rejects < 8 chars, rejects mismatched confirm, rejects > 128 chars           |
| `DeleteAccountSchema`           | 2     | Valid email accepted, invalid email rejected                                                                 |
| `CsvRowSchema`                  | 6     | Auto-uppercases symbol, coerces string numbers, rejects invalid asset type (`Stock`), defaults notes to `''` |
| `ImportPositionsSchema`         | 4     | Rejects non-UUID portfolioId, rejects empty positions array, validates individual row fields                 |
| `ServiceSchema`                 | 3     | Accepts all 4 valid services, rejects `stripe`                                                               |
| `NotificationPreferencesSchema` | 4     | Transforms string booleans to actual booleans, requires chat ID when Telegram enabled, accepts email-only    |

#### `__tests__/_utils.test.ts`

| Describe Block       | Tests | Key Edge Cases                                                                                                                                                                                                                                                             |
| -------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mapHeaders`         | 4     | Standard column names, common aliases (`Ticker`, `Shares`, `Cost Basis`), missing required columns, case-insensitive                                                                                                                                                       |
| `parseCsv`           | 13    | Alias headers, invalid rows reported with row number, no data rows error, missing columns error, quoted fields with commas, escaped quotes, empty lines, uppercase symbols, coerced numbers, negative qty/price rejected, zero price accepted, Windows `\r\n` line endings |
| `sanitizeExportData` | 4     | Strips `encrypted_key`/`password`/`api_key`/`telegram_chat_id` from flat/nested/array objects, preserves non-sensitive data                                                                                                                                                |

**Run this feature's tests:**

```bash
npm test -- app/dashboard/settings
```

**Test gaps:**

- No tests for server actions (`_actions.ts`) — these require Supabase and auth mocking
- No integration tests for API routes (`/api/ai/health`, `/api/ai/test`, `/api/db/test`)
- `parseRow()` (internal CSV row parser) is not directly tested, only through `parseCsv()`

---

## File Tree

```
app/dashboard/settings/
├── page.tsx                          # Server Component — main settings page with 6 tabs
├── _actions.ts                       # Server Actions: AI model, API keys, notifications, export, import, password, delete
├── _schema.ts                        # Zod schemas: AiModel, SaveApiKey, Service, NotificationPreferences, ChangePassword, DeleteAccount, CsvRow, ImportPositions
├── _utils.ts                         # CSV parsing: parseCsv(), mapHeaders(), sanitizeExportData()
├── _components/
│   ├── ai-model-card.tsx             # Client — AI provider/model selector
│   ├── api-keys-card.tsx             # Client — API key CRUD with test/encrypt
│   ├── appearance-card.tsx           # Client — Theme toggle (light/dark/system)
│   ├── csv-import-card.tsx           # Client — 3-step CSV import flow
│   ├── delete-account-card.tsx       # Client — Account deletion with email confirmation
│   ├── diagnostics-panel.tsx         # Client — System connectivity tests
│   ├── export-data-card.tsx          # Client — JSON data export/download
│   ├── notification-preferences-card.tsx  # Client — Email/Telegram notification toggles
│   └── password-change-card.tsx      # Client — Password change form
├── data/
│   └── page.tsx                      # Server Component — data management sub-page
└── __tests__/
    ├── _schema.test.ts               # 34 tests for all Zod schemas
    └── _utils.test.ts                # 21 tests for CSV parsing and export sanitization

# Related files outside the route:

app/profile/
├── _actions.ts                       # getProfile(), updateProfile() — used by Profile tab
├── _schema.ts                        # UpdateProfileSchema
└── _components/
    └── profile-form.tsx              # ProfileForm component embedded in Profile tab

lib/ai/
└── provider.ts                       # AI_PROVIDERS, MODEL_REGISTRY, getLanguageModel(), getDefaultModel()

lib/encryption.ts                     # encrypt(), decrypt() — AES-256-GCM for API keys

lib/date/
└── index.ts                          # toISO() — used for updated_at timestamps

lib/supabase/
├── server.ts                         # createClient() — server-side Supabase client
└── admin.ts                          # createAdminClient() — admin client for deleteUser()

app/api/ai/
├── health/route.ts                   # GET — Ollama connectivity check
└── test/route.ts                     # POST — AI model streaming test

app/api/db/
└── test/route.ts                     # GET — Supabase database connectivity check

supabase/migrations/
├── 20260320000000_initial_schema.sql          # profiles table (base columns)
├── 20260323000000_ai_provider_and_summaries.sql  # ai_provider, ai_model columns on profiles
├── 20260325000000_alerts_status_and_indicators.sql  # notification columns on profiles
└── 20260326000000_user_api_keys.sql           # user_api_keys table
```

---

## Known Limitations

- **No loading.tsx**: The settings route lacks a Suspense fallback. If the server-side `Promise.all` in `page.tsx` is slow, the user sees no skeleton — just a blank page until all data resolves.
- **API route auth**: `/api/ai/health`, `/api/ai/test`, and `/api/db/test` have no auth checks. They are lightweight diagnostics endpoints, but an unauthenticated user could probe system connectivity.
- **Visibility toggle misleading**: The API Keys card's `Eye`/`EyeOff` toggle only toggles the _input type_ between `text` and `password` — it never reveals the actual stored key (the server only returns `hasKey: boolean`, not the plaintext). The `visibleKeys` state controls display of `'••••••••'` vs `'••••••••••••'`, which are both masked strings.
- **Hardcoded AI models**: `OPENAI_MODELS` and `OLLAMA_MODELS` in `lib/ai/provider.ts` are static arrays (`['gpt-4.1-mini']` and `['qwen3.5:9b']`). Adding new models requires a code change.
- **Hardcoded services**: `API_KEY_SERVICES` in `_schema.ts` is a static tuple `['twelve_data', 'openai', 'fred', 'coingecko']`. Adding new services requires schema changes, action updates, and a migration with an updated `CHECK` constraint.
- **Encryption key rotation**: The `ENCRYPTION_SECRET` environment variable is used directly. No key rotation mechanism exists — changing the secret would make all existing encrypted keys unreadable.
- **No confirmation email on password change**: The `changePassword()` action updates the password but does not send a confirmation email (SPECS.md scenario mentions "And a confirmation email is sent" which is not implemented).
- **Export limited to 365 snapshots**: `exportAllData()` limits `portfolio_snapshots` to the last 365 rows. Users with longer history will not see older snapshots in their export.
- **CSV import does not deduplicate**: `importPositions()` inserts new rows without checking for existing positions with the same symbol/portfolio. Duplicate imports create duplicate position rows.
- **Test gaps**: No server action tests. No API route integration tests. The internal `parseRow()` CSV parser is only tested indirectly through `parseCsv()`.
