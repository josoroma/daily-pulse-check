# Epic E1: Project Setup — Commands Reference

> All commands used to implement Epic E1 (Project Setup) with 4 user stories and 22 tasks.

---

## US-1.1: Initialize Next.js Project with TypeScript

### T-1.1.1: Initialize Next.js project

```bash
npx create-next-app@latest finance --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

### T-1.1.2: Configure tsconfig.json strict mode

Manually updated `tsconfig.json` to enable:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### T-1.1.3: Set up ESLint + Prettier

```bash
npm install -D prettier eslint-config-prettier
```

Created configuration files:

- `.prettierrc` — 2-space indent, single quotes, trailing commas, no semicolons, 80 print width
- `.prettierignore` — excludes node_modules, .next, coverage, dist, etc.
- `eslint.config.mjs` — Next.js flat config + eslint-config-prettier

Added npm scripts:

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

Format the codebase:

```bash
npx prettier --write "app/**/*.{ts,tsx}" "*.{ts,mjs,json}"
```

Verify lint passes:

```bash
npm run lint
```

### T-1.1.4: Create landing page and dashboard placeholder

Created files:

- `app/page.tsx` — landing page with dark-first design system
- `app/dashboard/page.tsx` — dashboard placeholder page
- `app/globals.css` — Tailwind CSS v4 + CSS variables (dark theme)
- `app/layout.tsx` — root layout with Geist fonts

### T-1.1.5: Configure environment variables

Created `.env.local.example` with all required API keys:

```dotenv
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Twelve Data (Stocks/ETFs)
TWELVE_DATA_API_KEY=your-twelve-data-key

# FRED (Macro Indicators)
FRED_API_KEY=your-fred-key

# OpenAI (AI Insights)
OPENAI_API_KEY=your-openai-key

# Telegram Bot (Notifications)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

---

## US-1.2: Install Core Dependencies

### T-1.2.1: Install and initialize shadcn/ui

```bash
npx shadcn@latest init -d
```

This created:

- `components.json` — shadcn/ui config (base-nova style, neutral base color)
- `components/ui/button.tsx` — first UI component
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

### T-1.2.2: Install Jotai

```bash
npm install jotai
```

### T-1.2.3: Install React Hook Form + Zod

```bash
npm install react-hook-form @hookform/resolvers zod
```

### T-1.2.4: Install Supabase client

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### T-1.2.5: Install Vercel AI SDK

```bash
npm install ai @ai-sdk/openai
```

### T-1.2.6: Create Supabase helpers

Created files:

- `lib/supabase/client.ts` — browser client using `createBrowserClient` from `@supabase/ssr`
- `lib/supabase/server.ts` — server client using `createServerClient` with Next.js async `cookies()` adapter
- `lib/supabase/proxy.ts` — `updateSession()` helper for session refresh
- `proxy.ts` — Next.js proxy calling `updateSession()`, matcher excludes static files

---

## US-1.3: Database Schema & Testing Infrastructure

### T-1.3.1: Install and configure Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# Verify installation
supabase --version
# Output: 2.75.0

# Initialize Supabase in the project
supabase init
```

Configured `supabase/config.toml` with custom ports to avoid conflicts:

```toml
[api]
port = 54331

[db]
port = 54332

[studio]
port = 54333

[inbucket]
port = 54334

[analytics]
port = 54337

[studio.inspect.db]
port = 8084

[db.pooler]
default_pool_size = 20
port = 54339

[db.shadow]
port = 54330
```

Start local Supabase:

```bash
supabase start
```

### T-1.3.2: Create initial database migration

```bash
# Create migration file
supabase migration new initial_schema
```

Created `supabase/migrations/20260320000000_initial_schema.sql` with:

- 6 tables: `profiles`, `portfolios`, `positions`, `transactions`, `dca_schedules`, `alerts`
- RLS policies on all tables (users can only access their own data)
- Indexes on `user_id`, `portfolio_id`, `position_id`, `symbol` columns
- CHECK constraints on enum fields (asset_type, condition, frequency, etc.)
- `updated_at` auto-update triggers on all tables
- Auto-create profile trigger on `auth.users` insert

Apply migration:

```bash
supabase db reset
```

Alternatively, if `db reset` has issues, apply manually:

```bash
# Copy migration into the Supabase container
docker cp supabase/migrations/20260320000000_initial_schema.sql supabase_db_finance:/tmp/migration.sql

# Execute migration
docker exec supabase_db_finance psql -U postgres -d postgres -f /tmp/migration.sql
```

Verify tables were created:

```bash
docker exec supabase_db_finance psql -U postgres -d postgres -c "\dt public.*"
```

### T-1.3.3: Define Zod schemas

Created `app/portfolio/_schema.ts` with Zod schemas for all 6 entities:

- `CreateProfileSchema` / `UpdateProfileSchema`
- `CreatePortfolioSchema` / `UpdatePortfolioSchema`
- `CreatePositionSchema` / `UpdatePositionSchema`
- `CreateTransactionSchema`
- `CreateDcaScheduleSchema` / `UpdateDcaScheduleSchema`
- `CreateAlertSchema` / `UpdateAlertSchema`

> **Note**: Zod v4 uses `message` instead of `required_error` for custom error messages.

### T-1.3.4: Generate TypeScript types from Supabase

```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

### T-1.3.5: Configure Vitest

```bash
npm install -D vitest
```

Created `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Added npm scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### T-1.3.6: Create unit tests for Zod schemas

Created `app/portfolio/__tests__/_schema.test.ts` with 23 tests covering all schemas.

Run tests:

```bash
npm test
```

Expected output:

```
✓ app/portfolio/__tests__/_schema.test.ts (23 tests) 5ms

 Test Files  1 passed (1)
      Tests  23 passed (23)
```

---

## US-1.4: Git Hooks & Commit Quality

### T-1.4.1: Install husky, lint-staged, commitlint

```bash
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional
```

### T-1.4.2: Initialize husky and configure pre-commit hook

```bash
npx husky init
```

Updated `.husky/pre-commit`:

```bash
npx lint-staged
```

### T-1.4.3: Create lint-staged config

Created `.lintstagedrc.mjs`:

```javascript
export default {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
}
```

### T-1.4.4: Configure commit-msg hook

Created `.husky/commit-msg`:

```bash
npx --no -- commitlint --edit "$1"
```

### T-1.4.5: Create commitlint config

Created `commitlint.config.mjs`:

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'setup',
        'auth',
        'portfolio',
        'market',
        'dca',
        'alerts',
        'insights',
        'bitcoin',
        'analytics',
        'settings',
      ],
    ],
  },
}
```

### T-1.4.6: Configure pre-push hook

Created `.husky/pre-push`:

```bash
npx tsc --noEmit && npm test
```

### Verify commitlint

```bash
# Should fail (invalid format)
echo "added stuff" | npx commitlint
# ✖ subject may not be empty [subject-empty]
# ✖ type may not be empty [type-empty]

# Should pass (valid conventional commit)
echo "feat(portfolio): add position CRUD" | npx commitlint
# (no errors)
```

---

## Quality Gate Verification

Run all quality gates to confirm E1 is complete:

```bash
# TypeScript type check
npx tsc --noEmit

# ESLint
npm run lint

# Tests (23/23 passing)
npm test

# Prettier check
npm run format:check
```

---

## Installed Packages Summary

### Dependencies

| Package                  | Version  | Purpose                      |
| ------------------------ | -------- | ---------------------------- |
| next                     | 16.2.1   | Framework (App Router)       |
| react / react-dom        | 19.2.4   | UI library                   |
| typescript               | ^5       | Type safety                  |
| tailwindcss              | ^4       | Utility-first CSS            |
| @supabase/supabase-js    | ^2.99.3  | Database & Auth client       |
| @supabase/ssr            | ^0.9.0   | Server-side Supabase helpers |
| zod                      | ^4.3.6   | Schema validation            |
| jotai                    | ^2.18.1  | Atomic state management      |
| react-hook-form          | ^7.71.2  | Form handling                |
| @hookform/resolvers      | ^5.2.2   | Zod resolver for forms       |
| ai                       | ^6.0.134 | Vercel AI SDK                |
| @ai-sdk/openai           | ^3.0.47  | OpenAI provider              |
| shadcn                   | ^4.1.0   | UI component system          |
| clsx                     | ^2.1.1   | Conditional classnames       |
| tailwind-merge           | ^3.5.0   | Tailwind class merging       |
| class-variance-authority | ^0.7.1   | Variant styling              |
| lucide-react             | ^0.577.0 | Icons                        |

### Dev Dependencies

| Package                         | Version | Purpose                         |
| ------------------------------- | ------- | ------------------------------- |
| vitest                          | ^4.1.0  | Test runner                     |
| husky                           | ^9.1.7  | Git hooks                       |
| lint-staged                     | ^16.4.0 | Pre-commit linting              |
| @commitlint/cli                 | ^20.5.0 | Commit message linting          |
| @commitlint/config-conventional | ^20.5.0 | Conventional commit rules       |
| prettier                        | ^3.8.1  | Code formatter                  |
| eslint                          | ^9      | Linter                          |
| eslint-config-next              | 16.2.1  | Next.js ESLint rules            |
| eslint-config-prettier          | ^10.1.8 | Disable ESLint formatting rules |
| @tailwindcss/postcss            | ^4      | PostCSS plugin for Tailwind     |

---

## Project Structure After E1

```
finance/
├── .env.local.example
├── .husky/
│   ├── commit-msg              # commitlint validation
│   ├── pre-commit              # lint-staged
│   └── pre-push                # tsc --noEmit && npm test
├── .lintstagedrc.mjs
├── .prettierrc
├── .prettierignore
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                # Landing page
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard placeholder
│   └── portfolio/
│       ├── _schema.ts          # Zod schemas for all entities
│       └── __tests__/
│           └── _schema.test.ts # 23 schema validation tests
├── commitlint.config.mjs
├── components/
│   └── ui/
│       └── button.tsx          # shadcn Button
├── components.json             # shadcn/ui config
├── eslint.config.mjs
├── lib/
│   ├── utils.ts                # cn() helper
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server Supabase client
│       ├── proxy.ts        # Session refresh helper
│       └── database.types.ts   # Auto-generated types
├── proxy.ts                # Next.js proxy (auth)
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── supabase/
│   ├── config.toml             # Local dev config (custom ports)
│   └── migrations/
│       └── 20260320000000_initial_schema.sql
├── tsconfig.json               # Strict mode enabled
└── vitest.config.ts
```
