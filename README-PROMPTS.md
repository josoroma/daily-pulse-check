# Session Prompts

> Captured and improved prompts from chat sessions with derived tasks.

---

## Prompt 1 — `setup`

**Intent**: Implement Epic E1 (Project Setup) end-to-end.

**Prompt**

Implement Epic E1 — Project Setup. Execute all user stories (US-1.1 through US-1.4) and their tasks end-to-end: initialize the Next.js 15 project with TypeScript strict and Tailwind CSS v4, install all core dependencies (shadcn/ui, Jotai, React Hook Form, Zod, Supabase, Vercel AI SDK, Recharts), create the database schema with RLS policies and Zod validation schemas with full test coverage, and configure Git hooks (Husky, lint-staged, commitlint) for commit quality enforcement.

**Derived Tasks**

- Initialize Next.js 15 project with App Router, TypeScript strict, and Tailwind CSS v4
- Configure `tsconfig.json` with `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`, and `@/*` path alias
- Install shadcn/ui v4 and generate initial components (Button)
- Install Jotai, React Hook Form, `@hookform/resolvers`, and Zod
- Install `@supabase/supabase-js`, `@supabase/ssr`, and create Supabase client/server/middleware helpers
- Install Vercel AI SDK (`ai`, `@ai-sdk/openai`) and Recharts
- Create initial Supabase migration with all six tables (profiles, portfolios, positions, transactions, dca_schedules, alerts) and RLS policies
- Generate Supabase database types via `supabase gen types typescript`
- Create Zod validation schemas for all entities in `app/portfolio/_schema.ts`
- Write Vitest unit tests for all schemas in `app/portfolio/__tests__/_schema.test.ts`
- Install and configure Husky v9 with pre-commit, commit-msg, and pre-push hooks
- Configure lint-staged for ESLint + Prettier on staged files
- Configure commitlint with conventional commit format and project-specific scope enum
- Update SPECS.md to mark all E1 tasks as complete

---

## Prompt 2 — `docs`

**Intent**: Document all E1 setup commands in a project README.

**Prompt**

Create `README-PROJECT-SETUP.md` documenting every command executed during the E1 (Project Setup) implementation. Organize commands by user story and task, include a package versions table, and add the resulting project structure tree.

**Derived Tasks**

- Create `README-PROJECT-SETUP.md` with a clear heading and purpose statement
- Document US-1.1 commands: `npx create-next-app`, `tsconfig.json` modifications, Prettier and ESLint setup
- Document US-1.2 commands: all `npm install` commands for shadcn/ui, Jotai, React Hook Form, Zod, Supabase, Vercel AI SDK, Recharts
- Document US-1.3 commands: Supabase CLI init, migration creation, type generation, Vitest setup
- Document US-1.4 commands: Husky init, lint-staged and commitlint configuration
- Add a package versions table listing all installed dependencies with their versions
- Add the project directory structure tree reflecting the final E1 state

---

## Prompt 3 — `setup`

**Intent**: Code review the entire E1 implementation against conventions.

**Prompt**

Run `/review-item E1` to audit the entire Epic E1 (Project Setup) implementation. Verify all files against CLAUDE.md conventions, SPECS.md Gherkin acceptance criteria, security rules (RLS policies, no exposed secrets), code style (TypeScript strict, named exports, path aliases), and test coverage. Report a verdict with file-level findings.

**Derived Tasks**

- Read all E1-related files: configuration files, Supabase helpers, schemas, tests, migrations, hooks
- Verify TypeScript strict compliance across all `.ts`/`.tsx` files (no `any`, no `@ts-ignore`)
- Verify naming conventions: kebab-case files, PascalCase components, underscore-prefix route modules
- Audit Supabase migration for RLS policies on all tables and proper index coverage
- Validate Zod schemas match database schema types and use correct Zod v4 API
- Confirm all 23 Vitest tests pass and cover valid, invalid, and edge cases
- Check ESLint and Prettier configurations match CLAUDE.md code style rules
- Verify Husky hooks, lint-staged, and commitlint are correctly configured
- Cross-reference SPECS.md status markers with actual implementation state
- Produce a verdict (PASS / PASS WITH NOTES / NEEDS CHANGES) with specific findings

---

## Prompt 4 — `infra`

**Intent**: Resolve Supabase client initialization error with correct environment variables.

**Prompt**

Fix the runtime error "Your project's URL and Key are required to create a Supabase client!" by configuring `.env.local` with the correct local Supabase instance credentials. Use the values from `supabase status` output: set `NEXT_PUBLIC_SUPABASE_URL` to the API URL and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the publishable key.

**Derived Tasks**

- Run `supabase status` to retrieve the local instance URL and publishable key
- Create or update `.env.local` with `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331`
- Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the publishable key from `supabase status`
- Verify `.env.local` is listed in `.gitignore` to prevent credential exposure
- Restart the Next.js dev server to pick up the new environment variables
- Confirm the Supabase client initializes without errors on page load

---

## Prompt 5 — `auth`

**Intent**: Plan Epic E2 (Authentication & User Profile) before implementation.

**Prompt**

Run `/plan-item E2` to analyze the Authentication & User Profile epic. Break down all user stories (US-2.1 through US-2.3) into atomic implementation tasks, identify dependencies on E1 infrastructure, estimate complexity, and produce an ordered implementation plan covering Supabase Auth setup, login/signup flows, profile management, and protected route middleware.

**Derived Tasks**

- Read SPECS.md to extract all E2 user stories (US-2.1, US-2.2, US-2.3) and their Gherkin acceptance criteria
- Identify dependencies on E1 deliverables (Supabase client helpers, database schema, RLS policies)
- Break down US-2.1 (Auth Flow) into tasks: login page, signup page, callback route, logout action, middleware protection
- Break down US-2.2 (User Profile) into tasks: profile fetch, onboarding modal, profile update action
- Break down US-2.3 (Settings) into tasks: settings page, profile form, data validation
- Map each task to specific files following the colocated architecture (route segment contract)
- Order tasks by dependency chain and estimate implementation complexity
- Produce the final implementation plan with file-level detail

---

## Prompt 6 — `auth`

**Intent**: Implement Epic E2 (Authentication & User Profile) end-to-end.

**Prompt**

Implement Epic E2 — Authentication & User Profile. Execute all user stories (US-2.1 through US-2.3) and their 16 tasks end-to-end: create the `app/auth/` route with login, signup, and OAuth flows using Supabase Auth; build the `app/auth/callback/` route handler for auth code exchange; implement protected dashboard layout with session validation and redirect; create the onboarding modal for first-time users; build the settings page with profile form (display name, base currency, risk tolerance); write Zod schemas in `_schema.ts` with full Vitest test coverage; and configure Supabase middleware for session refresh on every request.

**Derived Tasks**

- Create `app/auth/page.tsx` as the login entry page with email/password form
- Create `app/auth/_components/login-form.tsx` with React Hook Form + Zod validation
- Create `app/auth/_components/signup-form.tsx` with email, password, and confirm password fields
- Create `app/auth/_actions.ts` with `login`, `signup`, `signInWithGoogle`, and `logout` Server Actions
- Create `app/auth/_schema.ts` with `LoginSchema` and `SignupSchema` Zod validators
- Create `app/auth/callback/route.ts` for OAuth code exchange and redirect
- Create `app/auth/__tests__/_schema.test.ts` with tests for valid, invalid, and edge cases
- Create `proxy.ts` (middleware) for session refresh and route protection
- Create `lib/supabase/proxy.ts` with `updateSession` helper for cookie management
- Create `app/dashboard/layout.tsx` with auth guard, profile fetch, sidebar, and onboarding modal
- Create `app/dashboard/_components/onboarding-modal.tsx` for first-time profile setup
- Create `app/dashboard/_components/user-menu.tsx` with avatar, email, and logout action
- Create `app/dashboard/_components/app-sidebar.tsx` with navigation links
- Create `app/dashboard/settings/page.tsx` with profile edit form
- Create `app/dashboard/settings/_components/profile-form.tsx` with display name, currency, and risk tolerance fields
- Create `app/dashboard/settings/_actions.ts` with `updateProfile` and `getProfile` Server Actions
- Create `app/dashboard/settings/_schema.ts` with `ProfileFormSchema` validator
- Create `app/dashboard/settings/__tests__/_schema.test.ts` with profile schema tests
- Create Jotai atoms (`userAtom`, `profileAtom`) in `app/dashboard/_atoms.ts`
- Create `app/dashboard/_components/auth-provider.tsx` to hydrate auth atoms from server data
- Update SPECS.md to mark all E2 tasks as complete

---

## Prompt 7 — `infra`

**Intent**: Migrate Next.js middleware to proxy convention for Next.js 16 compatibility.

**Prompt**

Fix the Next.js 16 middleware deprecation by renaming `middleware.ts` to `proxy.ts` and updating the export from `middleware()` to `proxy()`. Update the Supabase session refresh helper in `lib/supabase/middleware.ts` to `lib/supabase/proxy.ts` accordingly. Ensure route protection logic (public routes, auth redirects) continues to work after the migration.

**Derived Tasks**

- Rename `middleware.ts` to `proxy.ts` at the project root
- Change the exported function name from `middleware` to `proxy`
- Rename `lib/supabase/middleware.ts` to `lib/supabase/proxy.ts`
- Update the helper export from `updateSession` to match the new proxy convention
- Update all imports referencing the old middleware path
- Verify route protection still redirects unauthenticated users from `/dashboard/*` to `/auth`
- Verify authenticated users are redirected from `/auth` to `/dashboard`
- Verify the `config.matcher` excludes static assets and API routes

---

## Prompt 8 — `infra`

**Intent**: Clean up Google OAuth environment variables for local development.

**Prompt**

Remove the Google OAuth environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) from `.env.local` since Google OAuth is disabled in the local Supabase configuration (`config.toml` has `enabled = false` for Google provider). Set the Google OAuth button to disabled state or hidden when credentials are not configured.

**Derived Tasks**

- Remove `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from `.env.local`
- Verify `supabase/config.toml` has Google provider `enabled = false`
- Ensure the Google OAuth button in the login/signup form handles the disabled state gracefully
- Confirm auth flow works without Google OAuth credentials in local development

---

## Prompt 9 — `infra`

**Intent**: Fix signup failures caused by stale cache and database state.

**Prompt**

Resolve the "Database error finding user" error on signup by running `supabase db reset` to apply a clean migration and clear stale auth state. Also clear the Next.js `.next` cache directory to eliminate stale build artifacts causing hydration or routing errors.

**Derived Tasks**

- Run `supabase db reset` to drop and recreate the database with the latest migration
- Verify the migration `20260320000000_initial_schema.sql` applies cleanly with all tables and RLS policies
- Clear the `.next` cache directory to remove stale build artifacts
- Restart the Next.js dev server with `npm run dev`
- Verify signup flow completes without "Database error finding user"
- Confirm the new user appears in `auth.users` and a profile row is created via trigger

---

## Prompt 10 — `auth`

**Intent**: Fix `emailRedirectTo` using wrong URL in signup and OAuth actions.

**Prompt**

Fix the `emailRedirectTo` parameter in `app/auth/_actions.ts` — both `signup` and `signInWithGoogle` are incorrectly using the Supabase instance URL (`NEXT_PUBLIC_SUPABASE_URL`) as the redirect origin instead of the application URL. Change to use `NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'` so email confirmation and OAuth callbacks redirect to the correct app origin.

**Derived Tasks**

- Update `signup` action in `app/auth/_actions.ts` to use `NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'` for `emailRedirectTo`
- Update `signInWithGoogle` action to use the same app URL for `redirectTo`
- Remove the incorrect `new URL(...).origin` construction based on `NEXT_PUBLIC_SUPABASE_URL`
- Verify the redirect URL resolves to `http://localhost:3000/auth/callback` in local development

---

## Prompt 11 — `infra`

**Intent**: Fix Supabase `config.toml` redirect URLs for local development.

**Prompt**

Fix `supabase/config.toml` to use consistent `localhost:3000` URLs. Change `site_url` from `http://127.0.0.1:3000` to `http://localhost:3000`. Update `additional_redirect_urls` from `["https://127.0.0.1:3000"]` (wrong protocol) to `["http://localhost:3000/auth/callback", "http://127.0.0.1:3000/auth/callback"]`. Restart Supabase with `supabase stop && supabase start` to apply changes.

**Derived Tasks**

- Set `site_url = "http://localhost:3000"` in `supabase/config.toml`
- Set `additional_redirect_urls` to include both `localhost` and `127.0.0.1` callback paths with `http` protocol
- Run `supabase stop && supabase start` to apply the configuration changes
- Verify all Supabase services restart successfully and are healthy
- Confirm auth redirects work with the updated URLs

---

## Prompt 12 — `frontend`

**Intent**: Fix "MenuGroupRootContext is missing" runtime error in user menu.

**Prompt**

Fix the Base UI "MenuGroupRootContext is missing" runtime error in `app/dashboard/_components/user-menu.tsx`. The `DropdownMenuLabel` component (which renders `MenuPrimitive.GroupLabel`) is being used outside a `DropdownMenuGroup` (which renders `MenuPrimitive.Group`). Wrap the label and its associated menu items inside a `DropdownMenuGroup` to provide the required context.

**Derived Tasks**

- Import `DropdownMenuGroup` from `@/components/ui/dropdown-menu` in `user-menu.tsx`
- Wrap the `DropdownMenuLabel` and related `DropdownMenuItem` entries inside `<DropdownMenuGroup>`
- Verify the dropdown menu renders without console errors
- Confirm the menu items (Account, Settings, Log out) remain functional

---

## Prompt 13 — `auth`

**Intent**: Code review E2 implementation against conventions and acceptance criteria.

**Prompt**

Run `/review-item E2` to audit the entire Epic E2 (Authentication & User Profile) implementation. Check all auth route files, dashboard layout, settings page, middleware, Jotai atoms, and Supabase helpers against CLAUDE.md conventions, SPECS.md Gherkin acceptance criteria, security rules (RLS policies, auth validation, no exposed secrets), TypeScript strict compliance, colocated architecture, naming conventions, and test coverage. Report a verdict with file-level findings grouped by severity.

**Derived Tasks**

- Read all E2-related files across `app/auth/`, `app/dashboard/`, `app/dashboard/settings/`, `lib/supabase/`, and `proxy.ts`
- Verify security: auth checks in Server Actions, RLS policies enforced, no secret exposure, validated inputs via Zod
- Verify correctness: cross-reference implementation against all Gherkin scenarios in SPECS.md (US-2.1, US-2.2, US-2.3)
- Verify type safety: no `any`, proper return types, Zod validation in `_schema.ts` files
- Verify architecture: route-specific code colocated, shared code in `lib/` only for 3+ routes
- Verify conventions: underscore-prefix naming, kebab-case components, named exports, `@/` imports
- Verify test coverage: `__tests__/` directories present, pure logic tested, edge cases covered
- Rate each review category (Security, Correctness, Type Safety, Architecture, Conventions, Tests)
- Produce verdict with specific file and line references for all findings

---

## Prompt 14 — `auth`

**Intent**: Fix all five code review findings from the E2 audit.

**Prompt**

Fix all 5 issues identified in the E2 code review:

1. **Onboarding modal never triggers** — In `app/dashboard/layout.tsx`, change the onboarding detection from `!profile.base_currency` (always false since DB defaults to `'USD'`) to `!profile.display_name` (null for new email/password signups).
2. **Invalid `'moderate'` fallback** — In `app/dashboard/layout.tsx` and `app/dashboard/settings/page.tsx`, change the `risk_tolerance` fallback from `'moderate'` to `'Medium'` to match the Zod enum values (`'Low' | 'Medium' | 'High'`).
3. **Google OAuth silent no-op** — In `app/auth/_actions.ts`, add an error return `{ error: 'OAuth sign-in failed' }` when `signInWithGoogle` receives no redirect URL from Supabase.
4. **Raw Supabase error exposure in signup** — In `app/auth/_actions.ts`, map Supabase error messages to user-friendly strings instead of exposing internal messages like "User already registered".
5. **`<a>` instead of `<Link>`** — In `app/dashboard/_components/user-menu.tsx`, replace the plain `<a href="/dashboard/settings">` with Next.js `<Link>` for client-side navigation.

**Derived Tasks**

- In `app/dashboard/layout.tsx`, change `!profile.base_currency` to `!profile.display_name` in the `needsOnboarding` check
- In `app/dashboard/layout.tsx`, change `'moderate'` to `'Medium'` in the `risk_tolerance` fallback
- In `app/dashboard/settings/page.tsx`, change `'moderate'` to `'Medium'` in the `risk_tolerance` fallback
- In `app/auth/_actions.ts`, add `if (!data.url) return { error: 'OAuth sign-in failed' }` to `signInWithGoogle`
- In `app/auth/_actions.ts`, create an error message mapping function and replace raw `error.message` in `signup`
- In `app/dashboard/_components/user-menu.tsx`, import `Link` from `next/link` and replace `<a>` with `<Link>`

---

## Prompt 15 — `frontend`

**Intent**: Fix Input uncontrolled state warning from Base UI FieldControl.

**Prompt**

Fix the "A component is changing the default value state of an uncontrolled FieldControl" warning in `components/ui/input.tsx`. The Base UI `InputPrimitive` wraps `<input>` with an implicit `FieldControl` context that conflicts when async data populates `defaultValue` after initial render. Replace `InputPrimitive` from `@base-ui/react/input` with a plain `<input>` element while preserving all existing props, `ref` forwarding, and Tailwind CSS styling.

**Derived Tasks**

- Remove the `InputPrimitive` import from `@base-ui/react/input` in `components/ui/input.tsx`
- Replace `<InputPrimitive>` with a plain `<input>` element
- Preserve the `React.forwardRef` pattern and all existing prop spreading
- Preserve the existing Tailwind CSS class composition via `cn()` utility
- Verify the input renders without the FieldControl warning in the browser console
- Confirm form inputs in login, signup, onboarding modal, and settings page still function correctly

---

## Prompt 16 — `frontend`

**Intent**: Implement dark theme as default and update skills/specs.

**Prompt**

Update the frontend-design skill to document dark mode conventions, add a new user story (US-1.5) to SPECS.md for dark theme mode, then implement the dark/light/system theme toggle using `next-themes` with `ThemeProvider` in the root layout, a `ThemeToggle` dropdown component, and integration into the dashboard sidebar.

**Derived Tasks**

- Add Dark Mode section to `.claude/skills/frontend-design/SKILL.md` documenting `next-themes`, `ThemeProvider`, and `ThemeToggle` conventions
- Expand "Dark Mode First" section in `.claude/rules/design.md` with `next-themes` details
- Add US-1.5 (Dark Theme Mode) to SPECS.md with 5 Gherkin scenarios and 4 tasks
- Configure `ThemeProvider` in `app/layout.tsx` with `attribute="class"`, `defaultTheme="dark"`, and `enableSystem`
- Create `ThemeToggle` component in `app/dashboard/_components/theme-toggle.tsx` with dark/light/system options
- Add `ThemeToggle` to the dashboard sidebar header
- Verify TypeScript compilation and all tests pass

---

## Prompt 17 — `frontend`

**Intent**: Fix CSS cascade order so dark mode renders as default on all pages.

**Prompt**

Make the homepage and internal pages render dark as default. The `.dark` CSS variable block in `globals.css` was declared before `:root`, causing light values to win due to equal specificity and later source order. Swap the declaration order so `:root` (light) comes first and `.dark` comes second. Update skills and SPECS with the CSS cascade rule.

**Derived Tasks**

- Swap `:root` and `.dark` declaration order in `app/globals.css` — `:root` first, `.dark` second
- Add CSS cascade rule to `.claude/rules/design.md` Dark Mode First section
- Add CSS cascade note to `.claude/skills/frontend-design/SKILL.md` Dark Mode section
- Add T-1.5.5 to SPECS.md for the CSS cascade fix
- Add missing US-1.4 and US-1.5 entries to `.claude/README-SPECS.md`
- Verify no TypeScript errors and all tests pass

---

## Prompt 18 — `market`

**Intent**: Plan Epic E3 (Market Data Engine) before implementation.

**Prompt**

Run `/plan-item E3` to analyze the Market Data Engine epic. Break down all user stories (US-3.1 through US-3.4) into atomic implementation tasks, identify dependencies on E1 infrastructure and E2 auth, estimate complexity, and produce an ordered implementation plan covering stock/ETF price fetching (Twelve Data), Bitcoin data (CoinGecko), Fear & Greed sentiment (Alternative.me), and macroeconomic indicators (FRED + DXY).

**Derived Tasks**

- Read SPECS.md to extract all E3 user stories (US-3.1, US-3.2, US-3.3, US-3.4) and their Gherkin acceptance criteria
- Identify dependencies on E1 (Supabase client, database schema) and E2 (auth middleware, protected routes)
- Break down US-3.1 (Stock/ETF Prices) into tasks: Twelve Data API client, rate limiting, caching layer, price cards UI
- Break down US-3.2 (Bitcoin Data) into tasks: CoinGecko API client, CRC conversion, Bitcoin price card
- Break down US-3.3 (Fear & Greed) into tasks: Alternative.me client, gauge component, sentiment classification
- Break down US-3.4 (Macro Indicators) into tasks: FRED API client, DXY via Twelve Data, inflation calculation, macro dashboard
- Design the shared two-tier caching layer (in-memory + Supabase `market_cache` table)
- Map each task to specific files following the colocated architecture
- Order tasks by dependency chain and estimate implementation complexity
- Produce the final implementation plan with file-level detail and key decisions

---

## Prompt 19 — `market`

**Intent**: Implement Epic E3 (Market Data Engine) end-to-end with all key decisions approved.

**Prompt**

Implement Epic E3 — Market Data Engine. Approve all key decisions upfront. Execute all user stories (US-3.1 through US-3.4) end-to-end: create the `lib/market/` shared modules (cache, stocks, crypto, sentiment, macro) with a two-tier caching layer (in-memory Map + Supabase JSONB); build 5 API route handlers under `app/api/market/`; create the market dashboard page at `app/dashboard/market/` with price cards, Fear & Greed gauge (Recharts RadialBarChart), and macro indicators grid; write Zod schemas with full Vitest test coverage for all modules; and update SPECS.md status markers.

**Derived Tasks**

- Create `supabase/migrations/20260321000000_market_cache.sql` with `market_cache` and `api_request_counts` tables
- Create `lib/market/cache.ts` with two-tier cache (in-memory Map + Supabase), rate limiting, TTL management
- Create `lib/market/stocks.ts` with Twelve Data API client, Zod schemas, rate limit threshold (750/800)
- Create `lib/market/crypto.ts` with CoinGecko API client, Bitcoin price + history, USD/CRC conversion
- Create `lib/market/sentiment.ts` with Alternative.me Fear & Greed API client, classification helpers
- Create `lib/market/macro.ts` with FRED API client, DXY via Twelve Data, YoY inflation calculation
- Create `lib/market/index.ts` barrel export for all modules
- Create 5 API route handlers: `price/[symbol]`, `history/[symbol]`, `crypto/[coinId]`, `sentiment`, `macro/[seriesId]`
- Create `app/dashboard/market/_components/price-cards.tsx` with VOO, QQQ, BTC cards
- Create `app/dashboard/market/_components/fear-greed-gauge.tsx` with Recharts RadialBarChart gauge
- Create `app/dashboard/market/_components/macro-indicators.tsx` with indicator grid
- Create `app/dashboard/market/loading.tsx` with skeleton loading state
- Create `app/dashboard/market/page.tsx` as Server Component orchestrating all data fetches
- Write test files: `cache.test.ts`, `stocks.test.ts`, `crypto.test.ts`, `sentiment.test.ts`, `macro.test.ts`
- Update SPECS.md to mark all E3 tasks and stories as complete

---

## Prompt 20 — `market`

**Intent**: Fix server-only import pulled into client bundle via sentiment module.

**Prompt**

Fix the `next/headers` server-only import error in the market page. The `fear-greed-gauge.tsx` client component imports `getSentimentColor` from `lib/market/sentiment.ts`, which transitively imports `cache.ts` → `lib/supabase/server.ts` → `next/headers`. Replace the runtime import with a `type`-only import and inline the `getSentimentColor` function directly in the gauge component to break the server dependency chain.

**Derived Tasks**

- Change the import in `fear-greed-gauge.tsx` from runtime import to `import type { FearGreed }` from sentiment
- Inline the `getSentimentColor` function directly in `fear-greed-gauge.tsx`
- Verify the market page renders without "next/headers" or server-only import errors in the browser

---

## Prompt 21 — `frontend`

**Intent**: Match market page padding to portfolio page padding.

**Prompt**

Add `px-4 py-8` padding to the market page wrapper div in `app/dashboard/market/page.tsx` to match the portfolio page's padding, ensuring consistent spacing across all dashboard route segments.

**Derived Tasks**

- Add `px-4 py-8` classes to the root `<div>` in `app/dashboard/market/page.tsx`
- Verify the market page spacing matches the portfolio page visually

---

## Prompt 22 — `market`

**Intent**: Code review E3 implementation against conventions and acceptance criteria.

**Prompt**

Run `/review-item E3` to audit the entire Epic E3 (Market Data Engine) implementation. Check all `lib/market/` modules, API route handlers, dashboard market page, UI components (price cards, Fear & Greed gauge, macro indicators), Supabase migration, and test files against CLAUDE.md conventions, SPECS.md Gherkin acceptance criteria, security rules (RLS policies, auth on API routes, no exposed secrets), design system rules (asset colors, semantic colors, tabular numbers), TypeScript strict compliance, and test coverage. Report a verdict with file-level findings grouped by severity.

**Derived Tasks**

- Read all E3-related files: `lib/market/` modules, `app/api/market/` routes, `app/dashboard/market/` page and components, migration, tests
- Verify security: auth checks on API routes, RLS policies scoped correctly, no secret exposure, validated inputs
- Verify design compliance: VOO = blue, QQQ = purple, BTC = orange; emerald/rose for gains/losses; tabular-nums on prices
- Verify correctness: cross-reference implementation against all Gherkin scenarios in SPECS.md (US-3.1 through US-3.4)
- Verify type safety: no unnecessary `as` casts, proper return types, Zod validation on API responses
- Verify architecture: shared code in `lib/market/`, client-safe imports in `_components/`, no server leaks into client
- Verify test coverage: all pure logic tested (schemas, calculations, classifications, parsers), edge cases covered
- Produce verdict (PASS / PASS WITH NOTES / NEEDS CHANGES) with specific file and line references

---

## Prompt 23 — `market`

**Intent**: Apply all E3 code review fixes and add missing test coverage.

**Prompt**

Apply all 13 fixes identified in the `/review-item E3` code review, plus add missing test coverage:

1. Extract `classifySentiment`, `getSentimentColor`, `getSentimentBgColor` into `lib/market/sentiment-shared.ts` (client-safe module) and update imports in `sentiment.ts` and `fear-greed-gauge.tsx`.
2. Remove `as StockPrice | null` / `as BitcoinPrice | null` / `as FearGreed | null` casts in `app/dashboard/market/page.tsx` — add a typed `MarketData` interface with explicit return type annotation on `fetchMarketData()`.
3. Fix VOO color from `text-sky-500` / `bg-sky-500/10` to `text-blue-500` / `bg-blue-500/10` in `price-cards.tsx` per the design system (VOO = blue).
4. Add a justification comment for the `as unknown as Record<string, unknown>` cast in `lib/market/cache.ts`.
5. Add `px-4 py-8` padding to `app/dashboard/market/loading.tsx` to match `page.tsx`.
6. Add `supabase.auth.getUser()` auth guards to all 5 API routes under `app/api/market/`.
7. Export `parseObservations` from `lib/market/macro.ts` and add 4 unit tests.
8. Export `formatCompact` from `price-cards.tsx` and add 8 unit tests.
9. Update `lib/market/index.ts` barrel with `parseObservations` and `SentimentClassification` exports from `sentiment-shared`.
10. Create RLS migration `20260321100000_restrict_cache_rls.sql` restricting `market_cache` and `api_request_counts` write policies from `authenticated` to `service_role`.

**Derived Tasks**

- Create `lib/market/sentiment-shared.ts` with `classifySentiment`, `getSentimentColor`, `getSentimentBgColor`, and `SentimentClassification`
- Refactor `lib/market/sentiment.ts` to import from `sentiment-shared` and re-export for backward compatibility
- Replace inlined `getSentimentColor` in `fear-greed-gauge.tsx` with import from `sentiment-shared`
- Add `MarketData` interface to `page.tsx` and annotate `fetchMarketData()` return type, remove all `as` casts
- Change VOO accent color from `sky-500` to `blue-500` in `price-cards.tsx`
- Export `formatCompact` from `price-cards.tsx`
- Add justification comment above `as unknown as Record<string, unknown>` in `cache.ts`
- Add `px-4 py-8` to `loading.tsx` wrapper div
- Add `createClient` import and `supabase.auth.getUser()` guard to all 5 API route handlers
- Export `parseObservations` from `macro.ts`
- Update `lib/market/index.ts` barrel with new exports
- Create `supabase/migrations/20260321100000_restrict_cache_rls.sql` restricting write policies to `service_role`
- Add `parseObservations` tests to `lib/market/__tests__/macro.test.ts`
- Create `app/dashboard/market/__tests__/format-compact.test.ts` with 8 tests
- Run Vitest (111 pass), ESLint (0 warnings), and TypeScript check (0 errors)

---

## Prompt 24 — `frontend`

**Intent**: Fix Recharts ResponsiveContainer rendering with zero dimensions during SSR.

**Prompt**

Fix the Recharts `ResponsiveContainer` warning "The width(-1) and height(-1) of chart should be greater than 0" in `app/dashboard/market/_components/fear-greed-gauge.tsx`. The container uses `width="100%"` and `height="100%"` which resolve to `-1` during SSR hydration before layout measurement. Switch to explicit pixel values (`width={180} height={180} minWidth={0}`) matching the parent's fixed `h-[180px] w-[180px]` dimensions.

**Derived Tasks**

- Replace `width="100%" height="100%"` with `width={180} height={180} minWidth={0}` on the `ResponsiveContainer` in `fear-greed-gauge.tsx`
- Verify the Fear & Greed gauge renders without console warnings in the browser

---

## Prompt 25 — `portfolio`

**Intent**: Plan Epic E4 (Portfolio Tracker) implementation strategy.

**Prompt**

Run `/plan-item E4` to analyze Epic E4 (Portfolio Tracker). Break down US-4.1 (Position Management), US-4.2 (Transaction Logging), and US-4.3 (Portfolio Analytics) into atomic implementation tasks. Identify dependencies on E1–E3 (project setup, auth, market data). Map each user story to its route segment, colocated files, and Supabase tables. Produce a sequenced implementation plan with file paths, component names, and migration order.

**Derived Tasks**

- Read SPECS.md Gherkin scenarios for US-4.1, US-4.2, US-4.3 to extract acceptance criteria
- Map US-4.1 → `app/dashboard/portfolio/` with positions table, summary cards, add-position form
- Map US-4.2 → transaction form, transactions table, Server Actions for CRUD
- Map US-4.3 → performance chart, target allocation form, drift indicator, portfolio snapshots
- Identify E1–E3 dependencies: auth guard, Supabase client, market price API, RLS policies
- Plan migration order: positions → transactions → portfolio_snapshots
- Define component tree: 7+ components under `_components/`, shared schema in `app/portfolio/_schema.ts`
- Sequence tasks: schema → migration → actions → components → tests → integration

---

## Prompt 26 — `portfolio`

**Intent**: Implement Epic E4 (Portfolio Tracker) end-to-end.

**Prompt**

Run `/implement-item E4` to execute all user stories for Epic E4 (Portfolio Tracker). Create `app/dashboard/portfolio/` route with `page.tsx`, `_actions.ts`, `_utils.ts`, `_constants.ts`. Build 8 components under `_components/`: `summary-cards.tsx`, `positions-table.tsx`, `add-position-form.tsx`, `transaction-form.tsx`, `transactions-table.tsx`, `performance-chart.tsx`, `target-allocation-form.tsx`, `drift-indicator.tsx`. Create `app/portfolio/_schema.ts` with Zod schemas for positions, transactions, targets, and snapshots. Create `supabase/migrations/` for portfolio_snapshots table. Write unit tests for schemas and utility functions. Wire all components into the portfolio page with auth guard, real-time data from Supabase, and Recharts visualizations.

**Derived Tasks**

- Create `app/portfolio/_schema.ts` with `PositionSchema`, `TransactionSchema`, `TargetAllocationSchema`, `SnapshotSchema` and inferred types
- Create `supabase/migrations/` for `portfolio_snapshots` table with RLS policies
- Create `app/dashboard/portfolio/_constants.ts` with asset colors, time ranges, and allocation defaults
- Create `app/dashboard/portfolio/_utils.ts` with `formatCurrency`, `formatPercent`, `formatQuantity`, `calculateDrift`
- Create `app/dashboard/portfolio/_actions.ts` with Server Actions: `getPositions`, `getTransactions`, `addTransaction`, `deleteTransaction`, `getPerformanceHistory`, `getTargetAllocations`, `upsertTargetAllocation`
- Build `summary-cards.tsx` — total value, daily P&L, allocation breakdown
- Build `positions-table.tsx` — asset positions with current price, quantity, value, P&L
- Build `add-position-form.tsx` — React Hook Form + Zod for adding new positions
- Build `transaction-form.tsx` — buy/sell transaction entry with asset selector
- Build `transactions-table.tsx` — paginated transaction history with date, type, amount
- Build `performance-chart.tsx` — Recharts line chart with time range selector (1W/1M/3M/1Y/ALL)
- Build `target-allocation-form.tsx` — set target percentages per asset
- Build `drift-indicator.tsx` — visual comparison of actual vs target allocation
- Create `app/dashboard/portfolio/page.tsx` composing all components with Suspense boundaries
- Write `app/portfolio/__tests__/_schema.test.ts` for schema validation
- Write `app/dashboard/portfolio/__tests__/_utils.test.ts` for utility functions
- Run all tests and lint to validate

---

## Prompt 27 — `frontend`

**Intent**: Fix four hydration mismatch sources in the portfolio tracker.

**Prompt**

Identify and fix all sources of React hydration mismatches in the portfolio tracker (E4). Investigate `transactions-table.tsx`, `_utils.ts`, `performance-chart.tsx`, and `components/ui/dialog.tsx`. Replace `new Date().toLocaleDateString()` with deterministic server-safe alternatives, replace `toLocaleString()` with `toFixed()` + trailing-zero stripping for quantities, change the default time range from `'1M'` (which invokes `new Date()` during initial render) to `'ALL'`, and fix the Base UI `Dialog` `render` prop from JSX element form to function form.

**Derived Tasks**

- In `transactions-table.tsx`, replace `new Date(tx.executed_at).toLocaleDateString()` with `tx.executed_at.split('T')[0]` to avoid locale-dependent hydration mismatch
- In `_utils.ts`, replace `toLocaleString()` in `formatQuantity` with `toFixed()` + regex trailing-zero stripping for deterministic output
- In `performance-chart.tsx`, change `useState<TimeRange>('1M')` default to `'ALL'` to avoid `new Date()` during initial server render
- In `components/ui/dialog.tsx`, change `render={<Button />}` to `render={(props) => <Button {...props} />}` function form
- Run all 139 tests and verify 0 lint errors

---

## Prompt 28 — `portfolio`

**Intent**: Code review E4 (Portfolio Tracker) against conventions and acceptance criteria.

**Prompt**

Run `/review-item E4` to audit the entire Epic E4 (Portfolio Tracker) implementation. Check all files under `app/dashboard/portfolio/` (page, actions, utils, constants, schema, components) and `app/portfolio/_schema.ts` against CLAUDE.md conventions, SPECS.md Gherkin acceptance criteria, security rules, design system rules, TypeScript strict compliance, and test coverage. Report a verdict with file-level findings grouped by severity.

**Derived Tasks**

- Read all E4-related files: `app/dashboard/portfolio/page.tsx`, `_actions.ts`, `_utils.ts`, `_constants.ts`, `_components/` (7 components), `app/portfolio/_schema.ts`, `__tests__/` directories
- Verify security: auth checks in all Server Actions, RLS enforcement, Zod validation on mutations
- Verify design compliance: asset colors (VOO blue, QQQ purple, BTC orange), emerald/rose for P&L, tabular-nums
- Verify correctness: cross-reference against Gherkin scenarios for US-4.1, US-4.2, US-4.3
- Verify type safety: identify `as unknown as number` casts, ensure no `any` types
- Verify architecture: schema colocation correctness, shared vs route-specific code placement
- Verify test coverage: `_utils.test.ts` and `_schema.test.ts` cover all pure logic
- Produce verdict with severity-ranked findings and specific file/line references

---

## Prompt 29 — `setup`

**Intent**: Build a centralized date utility layer with Costa Rica timezone support.

**Prompt**

Use `date-fns` and `@date-fns/tz` to build a centralized date utility layer in `lib/date/` and make Costa Rica timezone explicit in all wrappers. Use `setDefaultOptions` only for locale (`es`) and calendar defaults (`weekStartsOn: 1`, `firstWeekContainsDate: 4`) — timezone must be handled explicitly with `@date-fns/tz`, not as a hidden global default.

Create `lib/date/config.ts` with `CR_TIMEZONE` constant and `setDefaultOptions` call. Create `lib/date/index.ts` with utility functions: `nowCR`, `todayCR`, `parseCR`, `formatDateISO`, `formatDateShort`, `formatMonthYear`, `toISO`, `daysAgoCR`, `startOfTodayCR`, `isValidDate`. Write comprehensive unit tests in `lib/date/__tests__/index.test.ts`.

Update all current raw `Date` usage across the codebase: `cache.ts` (request counting), `portfolio/_actions.ts` (snapshot filtering), `performance-chart.tsx` (range filtering), `transactions-table.tsx` (date display), `transaction-form.tsx` (ISO conversion), `profile/_actions.ts` (timestamp), `macro-indicators.tsx` (date formatting).

Create `.claude/rules/dates.md` documenting forbidden patterns (raw `new Date()` for display, `toLocaleDateString`, manual date arithmetic) and allowed exceptions (RHF `defaultValues`, cache TTL `Date.now()`).

Update documentation: add Dates to CLAUDE.md tech stack and `lib/` tree, add date-fns row to README.md tech stack table, add Date Formatting section to `.claude/rules/design.md`, add `T-1.2.7` to SPECS.md.

**Derived Tasks**

- Install `date-fns` and `@date-fns/tz` packages
- Create `lib/date/config.ts` with `CR_TIMEZONE = 'America/Costa_Rica'` and `setDefaultOptions({ locale: es, weekStartsOn: 1, firstWeekContainsDate: 4 })`
- Create `lib/date/index.ts` with 10 utility functions using `TZDate` from `@date-fns/tz`
- Create `lib/date/__tests__/index.test.ts` with 10 unit tests covering all utilities
- Create `.claude/rules/dates.md` with forbidden/allowed raw Date patterns
- Replace `new Date().toISOString().split('T')[0]` with `todayCR()` in `lib/market/cache.ts` (2 occurrences)
- Replace manual date arithmetic with `daysAgoCR(days)` in `app/dashboard/portfolio/_actions.ts`
- Replace `new Date()` + `setDate` pattern with `daysAgoCR()` in `performance-chart.tsx`
- Replace `.split('T')[0]` with `formatDateISO()` in `transactions-table.tsx`
- Replace `.toISOString()` with `toISO()` in `transaction-form.tsx`
- Replace `new Date().toISOString()` with `toISO(new Date())` in `app/profile/_actions.ts`
- Replace `toLocaleDateString('en-US', ...)` with `formatMonthYear()` in `macro-indicators.tsx`
- Add Dates entry to CLAUDE.md tech stack and `lib/date/` to the `lib/` directory tree
- Add date-fns row to README.md tech stack table
- Append Date Formatting section to `.claude/rules/design.md`
- Add `T-1.2.7` task to SPECS.md under US-1.2
- Run all tests (149 pass) and ESLint (0 warnings) to validate changes

---

## Prompt 30 — `setup`

**Intent**: Execute the planned date-fns centralization without further discussion.

**Prompt**

Apply all planned date-fns changes directly. Install dependencies, create `lib/date/config.ts` and `lib/date/index.ts`, write tests, create `.claude/rules/dates.md`, update all 7 source files replacing raw `Date` patterns with centralized wrappers, update all 4 documentation files, and run tests and lint to validate.

**Derived Tasks**

- Run `npm install date-fns @date-fns/tz` to add dependencies
- Create `lib/date/config.ts` with `CR_TIMEZONE` and `setDefaultOptions`
- Create `lib/date/index.ts` with all 10 utility functions
- Create `lib/date/__tests__/index.test.ts` with 10 unit tests
- Create `.claude/rules/dates.md` with forbidden/allowed date patterns
- Apply replacements in `cache.ts`, `portfolio/_actions.ts`, `performance-chart.tsx`, `transactions-table.tsx`, `transaction-form.tsx`, `profile/_actions.ts`, `macro-indicators.tsx`
- Update `CLAUDE.md`, `README.md`, `.claude/rules/design.md`, `SPECS.md`
- Run `npx vitest run` (149 pass) and `npx eslint` (0 warnings) to validate

---

## Prompt 31 — `docs`

**Intent**: Capture all session prompts to README-PROMPTS.md.

**Prompt**

Run `/capture-prompts all` to extract, improve, and persist every user prompt from the current chat session into `README-PROMPTS.md`. Include prompts covering hydration fixes, E4 code review, date-fns centralization planning and execution. Derive actionable tasks for each, categorize by domain, and append in the established entry format.

**Derived Tasks**

- Review the full chat session and extract all distinct user prompts
- Improve wording, normalize terminology, and rewrite in imperative form
- Derive atomic, implementation-ready tasks for each prompt
- Assign category tags (`frontend`, `portfolio`, `setup`, `docs`)
- Deduplicate against existing entries (Prompts 1–24) before appending
- Append new entries (Prompts 25–31) to `README-PROMPTS.md`

---
