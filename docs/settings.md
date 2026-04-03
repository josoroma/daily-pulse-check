# Settings & Data Management (E10)

> Two pages: **Settings** (`/dashboard/settings`) and **Data & Account** (`/dashboard/settings/data`)

---

## Main Settings Page — `/dashboard/settings`

Server Component that loads data in parallel via four server actions, then renders six tabs.

### Data Loading

| Server Action                  | Table           | Columns                                                                           |
| ------------------------------ | --------------- | --------------------------------------------------------------------------------- |
| `getProfile()`                 | `profiles`      | `display_name`, `base_currency`, `country`, `risk_tolerance`                      |
| `getAiPreferences()`           | `profiles`      | `ai_provider`, `ai_model`                                                         |
| `getNotificationPreferences()` | `profiles`      | `notification_email_enabled`, `notification_telegram_enabled`, `telegram_chat_id` |
| `getApiKeyStatuses()`          | `user_api_keys` | `service`, `is_valid`, `last_verified_at`                                         |

---

## Tabs & Cards

### 1. Profile (`ProfileForm`)

**Why**: Lets the user set display name, preferred currency (USD or CRC), country, and risk tolerance — values used across the dashboard for currency formatting, AI analysis context, and DCA suggestions.

| Layer         | Detail                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Component     | `app/profile/_components/profile-form.tsx`                                                                             |
| Server Action | `updateProfile()` — `app/profile/_actions.ts`                                                                          |
| Schema        | `UpdateProfileSchema` — `app/profile/_schema.ts`                                                                       |
| Table         | `profiles` (update)                                                                                                    |
| External APIs | None                                                                                                                   |
| Validation    | `display_name` max 100 chars, `base_currency` USD\|CRC, `risk_tolerance` Conservative\|Medium\|Medium-High\|Aggressive |

---

### 2. Appearance (`AppearanceCard`)

**Why**: Switches the dashboard between Light, Dark, and System themes. Defaults to dark mode — preferred for financial dashboards where users check data frequently and at varied times of day.

| Layer         | Detail                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Component     | `app/dashboard/settings/_components/appearance-card.tsx`                                             |
| Server Action | None                                                                                                 |
| Table         | None — persisted in browser via `next-themes` (localStorage)                                         |
| External APIs | None                                                                                                 |
| Notes         | Uses `useTheme()` from `next-themes`. Synced with the header theme toggle (`ThemeToggle` component). |

---

### 3. AI Model (`AiModelCard`)

**Why**: The dashboard uses AI for portfolio analysis, market summaries, and a learning assistant. This card lets the user pick between OpenAI (cloud, higher quality) and Ollama (local, private, free) and choose a specific model.

| Layer         | Detail                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Component     | `app/dashboard/settings/_components/ai-model-card.tsx`                                                     |
| Server Action | `updateAiModel()`                                                                                          |
| Schema        | `AiModelSchema` — validates provider + model against `MODEL_REGISTRY`                                      |
| Table         | `profiles` (update `ai_provider`, `ai_model`)                                                              |
| External APIs | `GET /api/ai/health` — pings Ollama at `OLLAMA_BASE_URL` (default `localhost:11434`) to check connectivity |
| Models        | OpenAI: `gpt-4.1-mini` / Ollama: `qwen3.5:9b` (from `lib/ai/provider.ts`)                                  |

---

### 4. API Keys (`ApiKeysCard`)

**Why**: Market data, macro indicators, crypto prices, and AI features depend on external APIs. Users can provide their own keys for higher rate limits or to use premium tiers. Each key is encrypted at rest with AES-256-GCM.

| Layer          | Detail                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| Component      | `app/dashboard/settings/_components/api-keys-card.tsx`                  |
| Server Actions | `saveApiKey()`, `deleteApiKey()`, `testApiKey()`                        |
| Schema         | `SaveApiKeySchema`, `ServiceSchema`                                     |
| Table          | `user_api_keys` (upsert, delete, select, update)                        |
| Encryption     | `lib/encryption.ts` — AES-256-GCM, key from `ENCRYPTION_SECRET` env var |

**Supported services and their test endpoints:**

| Service       | External API Hit (on test)                                              | Used For                                                      |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| `twelve_data` | `api.twelvedata.com/time_series?symbol=AAPL&interval=1day&outputsize=1` | Stock/ETF prices (VOO, QQQ), DXY                              |
| `openai`      | `api.openai.com/v1/models`                                              | AI features (portfolio analysis, market summary, learning)    |
| `fred`        | `api.stlouisfed.org/fred/series?series_id=DFF`                          | Macro indicators (Fed Funds, 10Y Treasury, CPI, Unemployment) |
| `coingecko`   | `api.coingecko.com/api/v3/ping`                                         | Bitcoin price, market cap, Fear & Greed                       |

---

### 5. Notifications (`NotificationPreferencesCard`)

**Why**: Enables DCA reminders, price alerts, and portfolio alerts to reach the user via email or Telegram — so they don't need to keep the dashboard open.

| Layer         | Detail                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| Component     | `app/dashboard/settings/_components/notification-preferences-card.tsx`                                       |
| Server Action | `updateNotificationPreferences()`                                                                            |
| Schema        | `NotificationPreferencesSchema` — string→boolean coercion, requires `telegram_chat_id` when Telegram enabled |
| Table         | `profiles` (update `notification_email_enabled`, `notification_telegram_enabled`, `telegram_chat_id`)        |
| External APIs | None (dispatch logic in `lib/notifications/`)                                                                |
| Notes         | In-app notifications are always on; this controls external channels only                                     |

---

### 6. Diagnostics (`DiagnosticsPanel`)

**Why**: One-click connectivity tests for all backend dependencies — Supabase, Ollama, and the AI model. Useful for debugging when data isn't loading or AI features fail silently.

| Layer          | Detail                                                     |
| -------------- | ---------------------------------------------------------- |
| Component      | `app/dashboard/settings/_components/diagnostics-panel.tsx` |
| Server Actions | None (uses API routes directly)                            |
| Table          | None directly                                              |

**API routes called:**

| Route            | Method | What It Tests                                                                                       |
| ---------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `/api/db/test`   | GET    | Supabase connectivity — `profiles.select('id', { head: true })`                                     |
| `/api/ai/health` | GET    | Ollama reachability — pings `OLLAMA_BASE_URL` with 3s timeout                                       |
| `/api/ai/test`   | POST   | AI model streaming — sends `{ provider, model }`, streams response via Vercel AI SDK `streamText()` |

---

## Data & Account Page — `/dashboard/settings/data`

Server Component that fetches the current user and their portfolios, then renders four cards.

### 7. Export Data (`ExportDataCard`)

**Why**: Full data portability — downloads all user data as a JSON file for backup or migration. Sensitive fields (encrypted keys, passwords, chat IDs) are automatically stripped.

| Layer         | Detail                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Component     | `app/dashboard/settings/_components/export-data-card.tsx`                                                                        |
| Server Action | `exportAllData()`                                                                                                                |
| Tables Read   | `profiles`, `portfolios`, `positions`, `transactions`, `dca_schedules`, `alerts`, `portfolio_snapshots` (365 most recent)        |
| External APIs | None                                                                                                                             |
| Sanitization  | `sanitizeExportData()` strips: `encrypted_key`, `password`, `hashed_password`, `api_key`, `service_role_key`, `telegram_chat_id` |

---

### 8. CSV Import (`CsvImportCard`)

**Why**: Bulk-import positions from a spreadsheet. Supports common column aliases (ticker→symbol, shares→quantity, cost→average_buy_price) so users don't need to match exact headers.

| Layer         | Detail                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Component     | `app/dashboard/settings/_components/csv-import-card.tsx`                                                             |
| Server Action | `importPositions(portfolioId, positions[])`                                                                          |
| Schema        | `CsvRowSchema`, `ImportPositionsSchema`                                                                              |
| Tables        | `portfolios` (read — for portfolio picker), `positions` (bulk insert)                                                |
| External APIs | None                                                                                                                 |
| Features      | 3-step flow: Upload → Preview (max 20 rows, invalid row reporting) → Done                                            |
| Utilities     | `parseCsv()`, `mapHeaders()` from `_utils.ts` — full CSV parser with quoted field support and header alias detection |

---

### 9. Password Change (`PasswordChangeCard`)

**Why**: Standard security hygiene — lets the user change their password without leaving the dashboard.

| Layer         | Detail                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------- |
| Component     | `app/dashboard/settings/_components/password-change-card.tsx`                            |
| Server Action | `changePassword()`                                                                       |
| Schema        | `ChangePasswordSchema` — 8–128 chars, confirm must match                                 |
| Table         | None — uses Supabase Auth (`signInWithPassword` to verify current, `updateUser` for new) |
| External APIs | Supabase Auth                                                                            |

---

### 10. Delete Account (`DeleteAccountCard`)

**Why**: GDPR-style account deletion — permanently removes all user data. Protected by an email-match confirmation dialog.

| Layer         | Detail                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Component     | `app/dashboard/settings/_components/delete-account-card.tsx`           |
| Server Action | `deleteAccount()`                                                      |
| Schema        | `DeleteAccountSchema` — requires valid email matching the current user |
| Table         | All user data cascade-deleted via `ON DELETE CASCADE` foreign keys     |
| External APIs | Supabase Admin Auth (`admin.deleteUser`)                               |
| Notes         | Signs out and redirects to `/` after deletion                          |

---

## Database Tables

### `profiles`

```
id                             uuid PK → auth.users(id) ON DELETE CASCADE
display_name                   text
base_currency                  text NOT NULL DEFAULT 'USD' CHECK (USD|CRC)
country                        text NOT NULL DEFAULT 'CR'
risk_tolerance                 text NOT NULL DEFAULT 'Medium'
ai_provider                    text NOT NULL DEFAULT 'openai' CHECK (openai|ollama)
ai_model                       text NOT NULL DEFAULT 'gpt-4.1-mini'
notification_email_enabled     boolean NOT NULL DEFAULT false
notification_telegram_enabled  boolean NOT NULL DEFAULT false
telegram_chat_id               text
created_at                     timestamptz NOT NULL DEFAULT now()
updated_at                     timestamptz NOT NULL DEFAULT now()
```

RLS: Users can SELECT / INSERT / UPDATE their own row only. Auto-created via trigger on `auth.users` insert.

### `user_api_keys`

```
id               uuid PK DEFAULT gen_random_uuid()
user_id          uuid NOT NULL → auth.users(id) ON DELETE CASCADE
service          text NOT NULL CHECK (twelve_data|openai|fred|coingecko)
encrypted_key    text NOT NULL
is_valid         boolean DEFAULT NULL
last_verified_at timestamptz
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()
UNIQUE (user_id, service)
```

RLS: Full CRUD for own rows only.

---

## Encryption

- **Algorithm**: AES-256-GCM
- **Key derivation**: First 32 bytes of `ENCRYPTION_SECRET` env var
- **Storage format**: `base64(iv[12] + authTag[16] + ciphertext)`
- **Functions**: `encrypt(plaintext)` / `decrypt(encoded)` in `lib/encryption.ts`
- **Used by**: `saveApiKey()` (encrypt before upsert) and `testApiKey()` (decrypt before external API call)

---

## Test Coverage

| Test File                   | Covers                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/_schema.test.ts` | All 8 Zod schemas: AiModel, SaveApiKey, Service, NotificationPreferences, ChangePassword, DeleteAccount, CsvRow, ImportPositions |
| `__tests__/_utils.test.ts`  | `mapHeaders`, `parseCsv` (aliases, quoted fields, invalid rows, coercion), `sanitizeExportData`                                  |
