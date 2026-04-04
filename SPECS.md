# SPECS.md — Finance Dashboard

> Version: 0.1.0 | Last updated: 2026-04-03

---

## Legend

- `[ ]` Todo — Not started
- `[~]` In Progress — Actively being worked on
- `[x]` Completed — Implemented and verified
- `[!]` Blocked — Waiting on external dependency
- 🎨 Uses `/frontend-design` skill — UI-intensive story requiring the design system

---

## Progress Summary

| Epic                              | Stories | Todo | In Progress | Completed | Blocked |
| --------------------------------- | ------- | ---- | ----------- | --------- | ------- |
| E1: Project Setup                 | 5       | 0    | 0           | 5         | 0       |
| E2: Authentication & User Profile | 3       | 0    | 0           | 3         | 0       |
| E3: Market Data Engine            | 7       | 0    | 0           | 7         | 0       |
| E4: Portfolio Tracker             | 4       | 0    | 0           | 4         | 0       |
| E5: DCA Automation                | 3       | 0    | 0           | 3         | 0       |
| E6: AI-Powered Insights           | 5       | 0    | 0           | 5         | 0       |
| E7: Alerts & Notifications        | 3       | 0    | 0           | 3         | 0       |
| E8: Bitcoin On-Chain Analytics    | 3       | 0    | 0           | 3         | 0       |
| E9: Analytics & Reporting         | 3       | 0    | 0           | 3         | 0       |
| E10: Settings & Data Management   | 2       | 0    | 0           | 2         | 0       |
| E11: Dashboard Home               | 3       | 0    | 0           | 3         | 0       |
| E12: Luma Theme & Visual Polish   | 1       | 0    | 0           | 1         | 0       |
| E13: Cron Jobs & Automation       | 3       | 0    | 0           | 3         | 0       |

---

## E1: Project Setup

### US-1.1: Initialize Next.js Project with TypeScript [x] 🎨

**As a** developer
**I want** a Next.js App Router project with TypeScript strict mode
**So that** I have a typed, scalable foundation for the finance dashboard

```gherkin
Feature: Project Initialization
  As a developer
  I want a Next.js App Router project with TypeScript strict mode
  So that I have a typed, scalable foundation

  Scenario: Project runs in dev mode
    Given the project has been initialized with Next.js App Router
    And TypeScript strict mode is enabled in tsconfig.json
    When I run "npm run dev"
    Then the dev server starts without errors
    And the landing page loads at "/"

  Scenario: Lint passes on fresh project
    Given the project has ESLint and Prettier configured
    When I run "npm run lint"
    Then no lint errors are reported

  Scenario: Tailwind CSS is functional
    Given Tailwind CSS v4 is installed and configured
    When I add a Tailwind utility class to a component
    Then the styles are applied correctly in the browser
```

#### Tasks

- [x] T-1.1.1: Initialize Next.js project with `create-next-app` (App Router, TypeScript, Tailwind CSS v4)
- [x] T-1.1.2: Configure `tsconfig.json` with strict mode, no `any`, path aliases (`@/`)
- [x] T-1.1.3: Set up ESLint + Prettier with 2-space indentation
- [x] T-1.1.4: Create `app/page.tsx` (landing page), `app/dashboard/page.tsx` (main dashboard placeholder)
- [x] T-1.1.5: Configure environment variables structure (`.env.local`) for API keys and Supabase

---

### US-1.2: Install Core Dependencies [x]

**As a** developer
**I want** shadcn/ui, Jotai, React Hook Form, Zod, and Supabase client installed
**So that** the tech stack is ready for development

```gherkin
Feature: Core Dependencies
  As a developer
  I want all core dependencies installed and configured
  So that the tech stack is ready for development

  Scenario: All dependencies are importable
    Given the project has shadcn/ui, jotai, react-hook-form, zod, and @supabase/supabase-js installed
    When I import each package in a TypeScript file
    Then no type errors or import errors occur

  Scenario: shadcn/ui components render correctly
    Given shadcn/ui is initialized with the default theme
    When I import and render a Button component
    Then the component renders with Tailwind styles applied

  Scenario: Supabase client connects
    Given NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set
    When I initialize the Supabase client
    Then no connection errors occur
```

#### Tasks

- [x] T-1.2.1: Install and initialize `shadcn/ui` with default theme configuration
- [x] T-1.2.2: Install `jotai` for global state management
- [x] T-1.2.3: Install `react-hook-form` + `@hookform/resolvers` + `zod` for form handling
- [x] T-1.2.4: Install `@supabase/supabase-js` and `@supabase/ssr` for auth and database
- [x] T-1.2.5: Install `ai` (Vercel AI SDK) and `@ai-sdk/openai` for AI features
- [x] T-1.2.6: Create `lib/supabase/client.ts` and `lib/supabase/server.ts` helpers
- [x] T-1.2.7: Install `date-fns` + `@date-fns/tz`, create centralized date layer in `lib/date/`

---

### US-1.3: Database Schema & Testing Infrastructure [x]

**As a** developer
**I want** a Supabase database schema and test runner configured
**So that** data models are defined and logic can be tested independently

```gherkin
Feature: Database Schema & Testing
  As a developer
  I want a database schema and test runner
  So that data models are defined and logic can be tested

  Scenario: Supabase migrations run successfully
    Given the Supabase CLI is installed
    When I run "supabase db push"
    Then all migrations apply without errors
    And the tables are created in the database

  Scenario: Run tests successfully
    Given the test runner is configured with Vitest
    And a sample test exists in a colocated __tests__/ directory
    When I run "npm test"
    Then the test suite passes

  Scenario: Zod schemas validate correctly
    Given a portfolio entry Zod schema is defined
    When I validate a valid portfolio entry object
    Then validation passes
    When I validate an invalid object with missing fields
    Then validation fails with descriptive error messages
```

#### Tasks

- [x] T-1.3.1: Install and configure Supabase CLI for local development
- [x] T-1.3.2: Create initial migration with tables: `profiles`, `portfolios`, `positions`, `transactions`, `dca_schedules`, `alerts`
- [x] T-1.3.3: Define Zod schemas in colocated `_schema.ts` files per route segment (e.g., `app/portfolio/_schema.ts`)
- [x] T-1.3.4: Generate TypeScript types from Supabase schema (`supabase gen types`)
- [x] T-1.3.5: Configure Vitest with TypeScript support and path aliases
- [x] T-1.3.6: Create sample unit tests for Zod schema validation

---

### US-1.4: Git Hooks & Commit Quality [x]

**As a** developer
**I want** automated pre-commit linting, commit message validation, and pre-push type checking
**So that** code quality and conventional commit format are enforced before code reaches the remote

```gherkin
Feature: Git Hooks & Commit Quality
  As a developer
  I want automated quality gates on commit and push
  So that code quality and conventional commit format are enforced

  Scenario: Pre-commit hook lints and formats staged files
    Given Husky and lint-staged are installed
    And a .ts file with formatting issues is staged
    When I run "git commit"
    Then ESLint auto-fixes lint errors on the staged file
    And Prettier auto-formats the staged file
    And the commit succeeds if no remaining errors

  Scenario: Commit message follows conventional format
    Given commitlint is configured with conventional commit rules
    And scopes are restricted to project domains
    When I commit with message "added stuff"
    Then the commit is rejected with a format error
    When I commit with message "feat(portfolio): add position CRUD"
    Then the commit succeeds

  Scenario: Pre-push hook catches type errors
    Given Husky pre-push hook runs tsc and vitest
    When I push with a TypeScript type error in the codebase
    Then the push is rejected
    When all type checks and tests pass
    Then the push succeeds
```

#### Tasks

- [x] T-1.4.1: Install `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`
- [x] T-1.4.2: Run `npx husky init` and configure `.husky/pre-commit` to execute `npx lint-staged`
- [x] T-1.4.3: Create `.lintstagedrc.js` with ESLint + Prettier for `*.{ts,tsx}` and Prettier for `*.{json,md}`
- [x] T-1.4.4: Configure `.husky/commit-msg` to execute `npx --no -- commitlint --edit "$1"`
- [x] T-1.4.5: Create `commitlint.config.js` with `scope-enum` restricted to project domains (`setup`, `auth`, `portfolio`, `market`, `dca`, `alerts`, `insights`, `bitcoin`, `analytics`, `settings`)
- [x] T-1.4.6: Configure `.husky/pre-push` to execute `npx tsc --noEmit && npm test`

---

### US-1.5: Dark Theme Mode [x] 🎨

**As a** user
**I want** to toggle between dark, light, and system theme modes
**So that** the dashboard adapts to my visual preference and environment

```gherkin
Feature: Dark Theme Mode
  As a user
  I want to toggle between dark, light, and system themes
  So that the dashboard adapts to my visual preference

  Scenario: Default theme is dark
    Given the user visits the dashboard for the first time
    Then the UI renders in dark mode
    And the html element has class "dark"

  Scenario: Toggle to light mode
    Given the user is on the dashboard in dark mode
    When the user clicks the theme toggle and selects "Light"
    Then the UI switches to light mode
    And the html element class changes to "light"
    And the preference is persisted in localStorage

  Scenario: Toggle to system mode
    Given the user selects "System" in the theme toggle
    When the OS preference is dark mode
    Then the UI renders in dark mode
    When the OS preference changes to light mode
    Then the UI updates to light mode automatically

  Scenario: Theme persists across page reloads
    Given the user previously selected "Light" mode
    When the user reloads the page
    Then the UI renders in light mode without a flash of dark content

  Scenario: No hydration mismatch
    Given next-themes injects a script to set the theme before React hydrates
    When the page loads
    Then no hydration mismatch warning appears in the console
```

#### Tasks

- [x] T-1.5.1: Configure `next-themes` `ThemeProvider` in `app/layout.tsx` with `attribute="class"`, `defaultTheme="dark"`, and `enableSystem`
- [x] T-1.5.2: Create `ThemeToggle` component in `app/dashboard/_components/theme-toggle.tsx` with dark/light/system options
- [x] T-1.5.3: Add `ThemeToggle` to the dashboard sidebar header
- [x] T-1.5.4: Verify both dark and light themes render correctly across all existing pages
- [x] T-1.5.5: Fix CSS cascade order — `:root` (light) before `.dark` in `globals.css` so dark default takes effect

---

## E2: Authentication & User Profile

### US-2.1: Supabase Authentication [x] 🎨

**As a** user
**I want** to sign up and log in with email/password or OAuth
**So that** my portfolio data is private and persistent

```gherkin
Feature: Authentication
  As a user
  I want to sign up and log in securely
  So that my portfolio data is private and persistent

  Scenario: Sign up with email and password
    Given the user is on the sign-up page
    When the user enters a valid email and a password with at least 8 characters
    And the user clicks "Sign Up"
    Then a verification email is sent
    And the user is redirected to a confirmation page

  Scenario: Log in with email and password
    Given the user has a verified account
    When the user enters valid credentials on the login page
    And the user clicks "Log In"
    Then the user is redirected to the dashboard
    And the session is persisted via cookies

  Scenario: Log in with Google OAuth
    Given the user is on the login page
    When the user clicks "Continue with Google"
    Then the OAuth flow completes
    And the user is redirected to the dashboard with a valid session

  Scenario: Reject invalid credentials
    Given the user is on the login page
    When the user enters an incorrect password
    Then an error message "Invalid login credentials" is displayed
    And no session is created

  Scenario: Log out
    Given the user is logged in
    When the user clicks "Log Out"
    Then the session is destroyed
    And the user is redirected to the landing page
```

#### Tasks

- [x] T-2.1.1: Configure Supabase Auth with email/password and Google OAuth provider
- [x] T-2.1.2: Create `app/auth/login/page.tsx` with login form (React Hook Form + Zod validation)
- [x] T-2.1.3: Create `app/auth/signup/page.tsx` with sign-up form
- [x] T-2.1.4: Implement Supabase auth proxy in `proxy.ts` for route protection
- [x] T-2.1.5: Create auth callback route `app/auth/callback/route.ts` for OAuth
- [x] T-2.1.6: Add `AuthProvider` wrapper with Jotai atom for session state

---

### US-2.2: User Profile Setup [x] 🎨

**As a** user
**I want** to set my base currency, country, and risk tolerance
**So that** the dashboard tailors data to my context

```gherkin
Feature: User Profile
  As a user
  I want to configure my profile settings
  So that the dashboard is tailored to my context

  Scenario: Complete profile on first login
    Given the user logs in for the first time
    And no profile record exists in the database
    When the onboarding modal appears
    And the user selects "USD" as base currency
    And the user selects "Costa Rica" as country
    And the user selects "Medium-High" as risk tolerance
    And the user clicks "Save"
    Then a profile record is created in the database
    And the user is redirected to the dashboard

  Scenario: Edit profile later
    Given the user has an existing profile
    When the user navigates to Settings > Profile
    And the user changes risk tolerance to "Conservative"
    And the user clicks "Update"
    Then the profile is updated in the database
    And a success toast is displayed

  Scenario: Validate required fields
    Given the user is on the profile setup form
    When the user attempts to save without selecting a base currency
    Then an error "Base currency is required" is displayed
```

#### Tasks

- [x] T-2.2.1: Create `profiles` table RLS policies (users can only read/update their own profile)
- [x] T-2.2.2: Create onboarding modal component in `app/profile/_components/onboarding-modal.tsx`
- [x] T-2.2.3: Build profile form with fields: display name, base currency (USD/CRC), country, risk tolerance (Conservative/Medium/Medium-High/Aggressive)
- [x] T-2.2.4: Implement profile Zod schema with validation
- [x] T-2.2.5: Wire form submission to Supabase upsert with optimistic UI update

---

### US-2.3: Protected Dashboard Layout [x] 🎨

**As a** user
**I want** a sidebar navigation layout for the dashboard
**So that** I can navigate between portfolio, markets, alerts, and settings

```gherkin
Feature: Dashboard Layout
  As a user
  I want a sidebar navigation layout
  So that I can navigate between sections

  Scenario: Sidebar displays navigation items
    Given the user is logged in
    When the dashboard loads
    Then the sidebar shows: Dashboard, Portfolio, Markets, DCA, Alerts, Insights, Settings
    And the current page is highlighted

  Scenario: Redirect unauthenticated users
    Given the user is not logged in
    When the user navigates to /dashboard
    Then the user is redirected to /auth/login

  Scenario: Responsive sidebar
    Given the user is on a mobile device (viewport < 768px)
    When the dashboard loads
    Then the sidebar is collapsed into a hamburger menu
    When the user taps the hamburger icon
    Then the sidebar slides open as an overlay
```

#### Tasks

- [x] T-2.3.1: Create `app/dashboard/layout.tsx` with sidebar navigation using shadcn/ui
- [x] T-2.3.2: Implement sidebar items: Dashboard, Portfolio, Markets, DCA, Alerts, Insights, Settings
- [x] T-2.3.3: Add responsive behavior — collapsible sidebar on mobile
- [x] T-2.3.4: Display user avatar and name in sidebar footer with logout button
- [x] T-2.3.5: Create placeholder pages for each sidebar route under `app/dashboard/`

---

## E3: Market Data Engine

### US-3.1: Stock & ETF Price Fetching [x]

**As a** system
**I want** to fetch real-time and historical prices for VOO and QQQ
**So that** the dashboard displays current market data

```gherkin
Feature: Stock & ETF Price Fetching
  As a system
  I want to fetch real-time and historical prices for VOO and QQQ
  So that the dashboard displays current market data

  Scenario: Fetch current price for VOO
    Given the Twelve Data API key is configured
    When the system requests the current price for "VOO"
    Then a valid price object is returned with symbol, price, and timestamp
    And the price is a positive number

  Scenario: Fetch daily historical data
    Given the Twelve Data API key is configured
    When the system requests 30 days of daily OHLCV data for "QQQ"
    Then an array of 30 data points is returned
    And each data point contains open, high, low, close, and volume

  Scenario: Handle API rate limits gracefully
    Given the free tier allows 800 requests per day
    When the daily request count approaches 750
    Then the system switches to cached data
    And a "Using cached data" indicator is shown

  Scenario: Handle API errors
    Given the Twelve Data API returns a 429 (rate limit) error
    When the system processes the response
    Then the last cached price is used
    And an error is logged
```

#### Tasks

- [x] T-3.1.1: Create `lib/market/stocks.ts` with `fetchPrice(symbol)` and `fetchHistory(symbol, interval, outputsize)` functions
- [x] T-3.1.2: Integrate Twelve Data API with proper error handling and type safety
- [x] T-3.1.3: Implement in-memory + Supabase cache layer with TTL (5 min for real-time, 24h for daily history)
- [x] T-3.1.4: Create Next.js API routes: `app/api/market/price/[symbol]/route.ts` and `app/api/market/history/[symbol]/route.ts`
- [x] T-3.1.5: Add request counting to stay within free tier limits
- [x] T-3.1.6: Write unit tests for price fetching, caching, and error handling

---

### US-3.2: Bitcoin Price & Market Data [x]

**As a** system
**I want** to fetch Bitcoin price, market cap, volume, and 24h change from CoinGecko
**So that** the dashboard displays current crypto market data

```gherkin
Feature: Bitcoin Price & Market Data
  As a system
  I want to fetch Bitcoin price, market cap, and volume
  So that the dashboard displays current crypto market data

  Scenario: Fetch current Bitcoin data
    Given the CoinGecko API is accessible
    When the system requests Bitcoin market data
    Then the response includes price_usd, market_cap, volume_24h, and percent_change_24h
    And all values are positive numbers

  Scenario: Fetch Bitcoin historical chart data
    Given the CoinGecko API is accessible
    When the system requests 90 days of chart data for Bitcoin
    Then an array of daily price points is returned
    And each data point contains a timestamp and price

  Scenario: Fetch Bitcoin data in CRC (colones)
    Given the user's base currency is CRC
    When the system fetches Bitcoin price
    Then the price is returned in both USD and CRC
    And the CRC conversion uses a recent exchange rate

  Scenario: CoinGecko API is down
    Given the CoinGecko API returns a 503 error
    When the system processes the response
    Then the last cached Bitcoin data is served
    And the cache age is displayed to the user
```

#### Tasks

- [x] T-3.2.1: Create `lib/market/crypto.ts` with `fetchBitcoinPrice()` and `fetchBitcoinHistory(days)` functions
- [x] T-3.2.2: Integrate CoinGecko API (`/api/v3/coins/markets` and `/api/v3/coins/bitcoin/market_chart`)
- [x] T-3.2.3: Add CRC exchange rate fetching for dual-currency display
- [x] T-3.2.4: Implement cache layer matching stock data pattern
- [x] T-3.2.5: Create API routes: `app/api/market/crypto/[coinId]/route.ts`
- [x] T-3.2.6: Write unit tests for Bitcoin data fetching, currency conversion, and caching

---

### US-3.3: Fear & Greed Indices [x] 🎨

**As a** user
**I want** to see the Fear & Greed Index for both stocks and crypto
**So that** I can gauge market sentiment before making decisions

```gherkin
Feature: Fear & Greed Indices
  As a user
  I want to see Fear & Greed indices for stocks and crypto
  So that I can gauge market sentiment

  Scenario: Display crypto Fear & Greed
    Given the Alternative.me API is accessible
    When the system fetches the crypto Fear & Greed index
    Then the response includes a numeric value (0-100) and a classification
    And the classification is one of: Extreme Fear, Fear, Neutral, Greed, Extreme Greed

  Scenario: Display historical sentiment
    Given the Alternative.me API is accessible
    When the system requests 30 days of Fear & Greed history
    Then a chart-compatible array of date/value pairs is returned

  Scenario: Sentiment color coding
    Given the Fear & Greed value is 25 (Fear)
    When the dashboard renders the indicator
    Then the indicator displays in orange/red tones
    Given the Fear & Greed value is 75 (Greed)
    When the dashboard renders the indicator
    Then the indicator displays in green tones
```

#### Tasks

- [x] T-3.3.1: Create `lib/market/sentiment.ts` with `fetchCryptoFearGreed()` and `fetchCryptoFearGreedHistory(days)`
- [x] T-3.3.2: Integrate Alternative.me Fear & Greed API
- [x] T-3.3.3: Create visual sentiment gauge component in `app/dashboard/market/_components/fear-greed-gauge.tsx` (radial gauge with color gradient)
- [x] T-3.3.4: Create API route: `app/api/market/sentiment/route.ts`
- [x] T-3.3.5: Write unit tests for sentiment data fetching and classification mapping

---

### US-3.4: Macro Economic Indicators [x] 🎨

**As a** user
**I want** to see key macro indicators (Fed rate, 10Y yield, DXY, CPI)
**So that** I understand the broader economic context affecting my investments

```gherkin
Feature: Macro Economic Indicators
  As a user
  I want to see key macro indicators
  So that I understand the broader economic context

  Scenario: Display current Fed Funds Rate
    Given the FRED API key is configured
    When the system fetches the Federal Funds Rate (series: FEDFUNDS)
    Then the most recent rate value and date are returned

  Scenario: Display US 10-Year Treasury Yield
    Given the FRED API key is configured
    When the system fetches the 10Y yield (series: DGS10)
    Then the most recent yield value is returned as a percentage

  Scenario: Display DXY (US Dollar Index)
    Given the Twelve Data API is accessible
    When the system fetches the DXY index price
    Then the current index value is returned

  Scenario: Display inflation trend
    Given the FRED API key is configured
    When the system fetches CPI data (series: CPIAUCSL)
    Then 12 months of monthly CPI data is returned
    And year-over-year inflation rate is calculated
```

#### Tasks

- [x] T-3.4.1: Create `lib/market/macro.ts` with `fetchFredSeries(seriesId)` function
- [x] T-3.4.2: Integrate FRED API for series: FEDFUNDS, DGS10, CPIAUCSL, UNRATE
- [x] T-3.4.3: Add DXY fetching via Twelve Data API
- [x] T-3.4.4: Create macro indicators card component in `app/dashboard/market/_components/macro-indicators.tsx`
- [x] T-3.4.5: Create API route: `app/api/market/macro/[seriesId]/route.ts`
- [x] T-3.4.6: Write unit tests for FRED data parsing and inflation rate calculation

---

### US-3.5: CoinGecko Enhanced Integration [x]

**As a** user
**I want** historical cost basis lookups, performance charts, and batch pricing with sparklines for crypto assets
**So that** I can see richer crypto market data and 7-day trends inline with my portfolio

```gherkin
Feature: CoinGecko Enhanced Integration
  As a user
  I want enhanced crypto market data from CoinGecko
  So that I can see cost basis, performance charts, and sparklines

  Scenario: Fetch historical price for cost basis
    Given the CoinGecko API key is configured
    When the system requests the Bitcoin price on "2026-01-15"
    Then the response includes coinId, date, and priceUsd
    And the date is converted from yyyy-MM-dd to dd-MM-yyyy for the API

  Scenario: Fetch market chart for performance
    Given the CoinGecko API is accessible
    When the system requests 90 days of market chart data for Bitcoin
    Then the response includes prices, market caps, and volumes arrays
    And each data point contains a timestamp and value

  Scenario: Fetch batch market data with sparklines
    Given the CoinGecko API is accessible
    When the system requests market data for bitcoin and ethereum
    Then the response includes current price, 24h/7d/30d changes, and 7-day sparkline
    And all coins are returned in a single API call

  Scenario: Portfolio positions show 7-day sparklines
    Given the user has a BTC position
    When the portfolio page renders
    Then each crypto position row includes a 7-day price sparkline
    And the sparkline color reflects positive (green) or negative (red) trend

  Scenario: API route validates parameters
    Given an authenticated user
    When requesting historical price without a date parameter
    Then a 400 error with "date parameter required" is returned
    When requesting market chart with days > 365
    Then a 400 error with "days must be between 1 and 365" is returned
```

#### Tasks

- [x] T-3.5.1: Add `fetchCoinHistoricalPrice(coinId, date)` to `lib/market/crypto.ts` using `/coins/{id}/history`
- [x] T-3.5.2: Add `fetchCoinMarketChart(coinId, days, interval)` to `lib/market/crypto.ts` using `/coins/{id}/market_chart`
- [x] T-3.5.3: Add `fetchCoinsMarkets(coinIds)` to `lib/market/crypto.ts` using `/coins/markets` with sparklines and multi-timeframe changes
- [x] T-3.5.4: Add Zod schemas: `CoinHistoricalPriceSchema`, `CoinMarketChartSchema`, `CoinMarketDataSchema`
- [x] T-3.5.5: Extend `app/api/market/crypto/[coinId]/route.ts` with `type=historical-price`, `type=market-chart`, `type=markets` endpoints
- [x] T-3.5.6: Create sparkline component in `app/dashboard/portfolio/_components/sparkline.tsx`
- [x] T-3.5.7: Integrate sparklines into portfolio positions table (7d column for crypto assets)
- [x] T-3.5.8: Add `formatDateForCoinGecko()` pure helper and export for testing
- [x] T-3.5.9: Write unit tests for new schemas, `formatDateForCoinGecko`, and sparkline data validation

---

### US-3.6: Costa Rican Macro Indicators (BCCR) [x] 🎨

**As a** Costa Rica-based investor
**I want** to see key Costa Rican economic indicators (USD/CRC exchange rates, Monetary Policy Rate, Basic Passive Rate) from the Banco Central de Costa Rica
**So that** I understand the local macro environment affecting my USD-denominated investments

```gherkin
Feature: Costa Rican Macro Indicators
  As a Costa Rica-based investor
  I want to see BCCR economic indicators
  So that I understand the local macro environment

  Scenario: Display current exchange rates
    Given the BCCR SDDE API is accessible
    When the market page loads
    Then the USD/CRC sell rate and buy rate are displayed
    And the date of the latest rate is shown

  Scenario: Display monetary policy rates
    Given the BCCR SDDE API is accessible
    When the market page loads
    Then the Monetary Policy Rate (TPM) is displayed
    And the Basic Passive Rate (TBP) is displayed

  Scenario: Handle BCCR API unavailability
    Given the BCCR SDDE API is unreachable
    When the market page loads
    Then a fallback message is shown instead of indicators
```

#### Tasks

- [x] T-3.6.1: Create `lib/market/bccr.ts` with SDDE REST API client, indicator codes (317, 318, 3541, 423), and `fetchBccrIndicator()` function
- [x] T-3.6.2: Add SDDE response Zod schemas (`SddeResponseSchema`, `SddeSeriesItemSchema`, `SddeIndicadorSchema`)
- [x] T-3.6.3: Create `app/api/market/bccr/route.ts` API route with auth guard and indicator/history endpoints
- [x] T-3.6.4: Build `app/dashboard/market/_components/cr-macro-indicators.tsx` card component with skeleton loading
- [x] T-3.6.5: Integrate BCCR card into market dashboard page
- [x] T-3.6.6: Write unit tests for BCCR SDDE response parsing, `extractObservations()`, and schema validation

---

### US-3.7: USD/CRC Exchange Rate Chart [x] 🎨

**As a** Costa Rica-based investor
**I want** a 30-day chart of USD/CRC buy and sell exchange rates
**So that** I can track colón trends and time my currency conversions

```gherkin
Feature: USD/CRC Exchange Rate Chart
  As a Costa Rica-based investor
  I want a historical exchange rate chart
  So that I can track colón trends

  Scenario: Display 30-day exchange rate chart
    Given the BCCR SDDE API returns 30 days of sell and buy rates
    When the exchange rate chart renders
    Then both buy (compra) and sell (venta) lines are plotted
    And the current rate, spread, and 30-day change percentage are shown

  Scenario: Show trend direction
    Given the current sell rate is lower than 30 days ago
    When the chart header renders
    Then a negative percentage badge with a down-trend icon is displayed

  Scenario: Handle missing data gracefully
    Given the BCCR API returns fewer than 30 days of data
    When the chart renders
    Then available data points are plotted without gaps
```

#### Tasks

- [x] T-3.7.1: Add `fetchExchangeRateHistory(days)` to `lib/market/bccr.ts` fetching both buy and sell rates over time
- [x] T-3.7.2: Build `app/dashboard/market/_components/exchange-rate-chart.tsx` with Recharts AreaChart, dual lines, spread, and trend badge
- [x] T-3.7.3: Integrate exchange rate chart into market dashboard page
- [x] T-3.7.4: Add `ExchangeRatePoint` type and Zod schema for chart data validation

---

## E4: Portfolio Tracker

### US-4.1: Manual Position Entry [x] 🎨

**As a** user
**I want** to manually add my investment positions (asset, quantity, buy price, date)
**So that** I can track my portfolio without connecting exchange APIs

```gherkin
Feature: Manual Position Entry
  As a user
  I want to manually add investment positions
  So that I can track my portfolio

  Scenario: Add a VOO position
    Given the user is on the Portfolio page
    When the user clicks "Add Position"
    And the user selects asset type "ETF"
    And the user enters symbol "VOO", quantity 10, buy price 450.00, date "2026-03-01"
    And the user clicks "Save"
    Then the position is saved to the database
    And it appears in the positions table
    And the current value is calculated using the latest market price

  Scenario: Add a Bitcoin position
    Given the user is on the Portfolio page
    When the user clicks "Add Position"
    And the user selects asset type "Crypto"
    And the user enters symbol "BTC", quantity 0.05, buy price 85000.00, date "2026-03-01"
    And the user clicks "Save"
    Then the position is saved to the database
    And the current value reflects the latest Bitcoin price

  Scenario: Validate position form
    Given the user is adding a position
    When the user enters a negative quantity
    Then an error "Quantity must be positive" is displayed
    When the user leaves the symbol field empty
    Then an error "Symbol is required" is displayed

  Scenario: Edit existing position
    Given the user has a VOO position
    When the user clicks the edit icon on that position
    And the user changes quantity to 15
    And the user clicks "Update"
    Then the position is updated in the database
    And the portfolio totals recalculate

  Scenario: Delete a position
    Given the user has a position
    When the user clicks the delete icon
    And confirms the deletion dialog
    Then the position is removed from the database
    And portfolio totals update
```

#### Tasks

- [x] T-4.1.1: Create `positions` table RLS policies (users CRUD their own positions only)
- [x] T-4.1.2: Build "Add Position" modal with React Hook Form + Zod: fields for asset type (ETF/Crypto), symbol, quantity, buy price (USD), date, optional notes
- [x] T-4.1.3: Implement position CRUD Server Actions in `app/portfolio/_actions.ts`
- [x] T-4.1.4: Create positions table component in `app/portfolio/_components/positions-table.tsx` with sort/filter
- [x] T-4.1.5: Calculate unrealized P&L by fetching current price vs buy price
- [x] T-4.1.6: Write unit tests for P&L calculations and form validation

---

### US-4.2: Portfolio Overview Dashboard [x] 🎨

**As a** user
**I want** a visual overview of my portfolio value, allocation, and performance
**So that** I can see my financial position at a glance

```gherkin
Feature: Portfolio Overview
  As a user
  I want a visual overview of my portfolio
  So that I can see my financial position at a glance

  Scenario: Display total portfolio value
    Given the user has positions in VOO, QQQ, and BTC
    When the portfolio dashboard loads
    Then the total portfolio value is displayed in USD
    And the 24h change (amount and percentage) is shown
    And the total unrealized P&L is shown

  Scenario: Display allocation pie chart
    Given the user has 50% VOO, 20% QQQ, 30% BTC by value
    When the allocation chart renders
    Then a donut chart shows each asset's percentage
    And hovering a segment shows the exact value and percentage

  Scenario: Display performance line chart
    Given the user has held positions for 30 days
    When the performance chart renders
    Then a line chart shows portfolio value over the selected time range
    And the user can toggle between 1W, 1M, 3M, 6M, 1Y, ALL

  Scenario: Empty portfolio state
    Given the user has no positions
    When the portfolio dashboard loads
    Then an empty state message is shown: "Add your first position to get started"
    And a prominent "Add Position" button is displayed
```

#### Tasks

- [x] T-4.2.1: Create portfolio overview page at `app/dashboard/portfolio/page.tsx`
- [x] T-4.2.2: Build total value card with 24h change indicator (green/red)
- [x] T-4.2.3: Build allocation donut chart using a charting library (Recharts or Chart.js)
- [x] T-4.2.4: Build performance line chart with time range selector (1W/1M/3M/6M/1Y/ALL)
- [x] T-4.2.5: Calculate portfolio snapshots and store daily snapshots in `portfolio_snapshots` table
- [x] T-4.2.6: Implement empty state and loading skeleton components

---

### US-4.3: Transaction History [x] 🎨

**As a** user
**I want** to log buy/sell transactions
**So that** I have a complete record of my investing activity

```gherkin
Feature: Transaction History
  As a user
  I want to log buy and sell transactions
  So that I have a complete record of my activity

  Scenario: Log a buy transaction
    Given the user clicks "Log Transaction"
    When the user selects type "Buy", symbol "VOO", quantity 5, price 452.00, date "2026-03-15"
    And fee is entered as 1.00
    And the user clicks "Save"
    Then the transaction is saved to the database
    And the position quantity increases by 5
    And the average buy price is recalculated

  Scenario: Log a sell transaction
    Given the user has 10 shares of VOO
    When the user logs a sell of 3 shares at 460.00
    Then the position quantity decreases to 7
    And the realized P&L for those 3 shares is calculated and stored

  Scenario: View transaction history
    Given the user has multiple transactions
    When the user navigates to the Transactions tab
    Then transactions are displayed in reverse chronological order
    And each row shows: date, type (buy/sell), symbol, quantity, price, fee, total

  Scenario: Filter transactions
    Given the user has transactions across VOO, QQQ, and BTC
    When the user filters by symbol "BTC"
    Then only Bitcoin transactions are displayed

  Scenario: Prevent overselling
    Given the user has 5 shares of QQQ
    When the user attempts to sell 10 shares
    Then an error "Insufficient quantity" is displayed
```

#### Tasks

- [x] T-4.3.1: Create `transactions` table with RLS policies
- [x] T-4.3.2: Build transaction log form with React Hook Form + Zod: type (Buy/Sell/DCA), symbol, quantity, price, fee, date, notes
- [x] T-4.3.3: Implement average cost basis calculation (weighted average method)
- [x] T-4.3.4: Implement realized P&L calculation on sell transactions
- [x] T-4.3.5: Build transactions table component with filtering by symbol, type, and date range
- [x] T-4.3.6: Write unit tests for cost basis, realized P&L, and oversell prevention

---

### US-4.4: Target Allocation & Rebalancing Alerts [x] 🎨

**As a** user
**I want** to set target allocation percentages and get alerts when my portfolio drifts
**So that** I maintain my desired risk profile

```gherkin
Feature: Target Allocation & Rebalancing
  As a user
  I want to set target allocations and get drift alerts
  So that I maintain my desired risk profile

  Scenario: Set target allocation
    Given the user is on the Portfolio settings
    When the user sets targets: VOO 50%, QQQ 20%, BTC 20%, Cash 10%
    And the total equals 100%
    And the user clicks "Save Targets"
    Then the targets are saved to the database

  Scenario: Display allocation drift
    Given the user has targets set
    And BTC has grown to represent 35% of the portfolio (target: 20%)
    When the portfolio page renders
    Then a drift indicator shows BTC is +15% over target
    And VOO is shown as under target

  Scenario: Reject invalid allocation totals
    Given the user is setting targets
    When the sum of all targets exceeds 100%
    Then an error "Allocations must sum to 100%" is displayed

  Scenario: Rebalance suggestion
    Given allocation drift exceeds 5% for any asset
    When the user views the portfolio
    Then a "Rebalance Needed" badge is displayed
    And suggested trades to restore target allocation are shown
```

#### Tasks

- [x] T-4.4.1: Add `target_allocations` column (JSONB) to `portfolios` table
- [x] T-4.4.2: Build target allocation form with percentage inputs and live total validation
- [x] T-4.4.3: Implement drift calculation: `(actual_pct - target_pct)` for each asset
- [x] T-4.4.4: Build rebalancing suggestion engine: calculate buy/sell amounts to restore targets
- [x] T-4.4.5: Create visual drift indicator (bar chart comparing actual vs target)
- [x] T-4.4.6: Write unit tests for drift calculation and rebalancing suggestions

---

## E5: DCA Automation

### US-5.1: DCA Schedule Configuration [x] 🎨

**As a** user
**I want** to configure recurring DCA schedules for my assets
**So that** I invest consistently without emotional decisions

```gherkin
Feature: DCA Schedule Configuration
  As a user
  I want to configure recurring DCA schedules
  So that I invest consistently without emotional decisions

  Scenario: Create weekly DCA for VOO
    Given the user is on the DCA page
    When the user clicks "New DCA Schedule"
    And the user selects symbol "VOO"
    And the user enters amount $100
    And the user selects frequency "Weekly" on "Monday"
    And the user clicks "Save"
    Then the DCA schedule is saved to the database
    And it appears in the active schedules list

  Scenario: Create daily DCA for Bitcoin
    Given the user is on the DCA page
    When the user creates a schedule for BTC, $25, Daily
    Then the schedule is saved and marked as active

  Scenario: Pause a DCA schedule
    Given the user has an active DCA for VOO
    When the user clicks "Pause"
    Then the schedule status changes to "Paused"
    And no reminders are generated while paused

  Scenario: Edit DCA amount
    Given the user has a DCA schedule for QQQ at $50/week
    When the user edits the amount to $75/week
    Then the schedule is updated
    And future reminders use the new amount

  Scenario: Delete a DCA schedule
    Given the user has a DCA schedule
    When the user deletes it
    Then the schedule is removed
    And past DCA transactions remain in history
```

#### Tasks

- [x] T-5.1.1: Create `dca_schedules` table: id, user_id, symbol, asset_type, amount_usd, frequency (daily/weekly/biweekly/monthly), day_of_week/day_of_month, status (active/paused), created_at
- [x] T-5.1.2: Build DCA schedule form with React Hook Form + Zod validation
- [x] T-5.1.3: Create DCA schedules list component with status toggle (active/pause)
- [x] T-5.1.4: Build DCA page at `app/dashboard/dca/page.tsx`
- [x] T-5.1.5: Write unit tests for schedule creation and validation

---

### US-5.2: DCA Reminder Notifications [x] 🎨

**As a** user
**I want** to receive reminders when a DCA buy is due
**So that** I execute my plan even when I'm busy

```gherkin
Feature: DCA Reminders
  As a user
  I want to receive reminders when a DCA buy is due
  So that I execute my plan even when I'm busy

  Scenario: Generate daily reminder
    Given the user has a daily BTC DCA schedule
    When the scheduled time arrives (8:00 AM user local time)
    Then a notification is created: "DCA Reminder: Buy $25 of BTC today"
    And the notification appears in the dashboard notification center

  Scenario: Generate weekly reminder
    Given the user has a weekly VOO DCA on Mondays
    When Monday arrives
    Then a notification is created: "DCA Reminder: Buy $100 of VOO today"

  Scenario: No reminder for paused schedule
    Given the user has paused a DCA schedule
    When the scheduled time arrives
    Then no notification is generated

  Scenario: Mark DCA as executed
    Given a DCA reminder is shown
    When the user clicks "Mark as Done"
    And enters the actual execution price
    Then a transaction is logged automatically
    And the reminder is marked as completed
```

#### Tasks

- [x] T-5.2.1: Create Supabase Edge Function or cron job (via Vercel Cron) to check due DCA schedules
- [x] T-5.2.2: Create `notifications` table: id, user_id, type, title, body, read, created_at
- [x] T-5.2.3: Build notification center component in dashboard header
- [x] T-5.2.4: Implement "Mark as Done" flow that pre-fills a transaction form
- [x] T-5.2.5: Write unit tests for schedule-due calculation logic

---

### US-5.3: DCA Performance Analytics [x] 🎨

**As a** user
**I want** to see how my DCA strategy has performed over time
**So that** I can validate that consistent investing works

```gherkin
Feature: DCA Performance Analytics
  As a user
  I want to see DCA performance over time
  So that I can validate that consistent investing works

  Scenario: Display DCA history chart
    Given the user has completed 12 weekly DCA buys of VOO
    When the DCA analytics page loads
    Then a chart shows each DCA buy point on the price curve
    And the average cost basis line is plotted

  Scenario: Calculate DCA vs lump sum comparison
    Given the user has DCA'd $100/week into VOO for 12 weeks ($1200 total)
    When the comparison widget renders
    Then it shows: Total invested, Current value, DCA return %
    And it compares to: if $1200 was invested lump sum on day 1

  Scenario: Show cost basis trend
    Given the user has multiple DCA buys at different prices
    When the analytics render
    Then the weighted average cost basis is displayed
    And a trend line shows how the cost basis has evolved
```

#### Tasks

- [x] T-5.3.1: Build DCA analytics page at `app/dashboard/dca/analytics/page.tsx`
- [x] T-5.3.2: Implement DCA vs lump sum comparison calculation
- [x] T-5.3.3: Build DCA history chart — price line with DCA buy markers and average cost basis line
- [x] T-5.3.4: Create summary stats cards: total invested, current value, return %, avg cost basis
- [x] T-5.3.5: Write unit tests for DCA return and lump sum comparison calculations

---

## E6: AI-Powered Insights

### US-6.0: AI Model Configuration [x] 🎨

**As a** user
**I want** to choose between OpenAI and Ollama models in the Settings page
**So that** I can use a local model for privacy/cost or a cloud model for quality

```gherkin
Feature: AI Model Configuration
  As a user
  I want to choose my AI provider and model in Settings
  So that I control whether AI runs locally or in the cloud

  Scenario: Display AI Model card in Settings
    Given the user navigates to /dashboard/settings
    Then a "AI Model" card is displayed with provider and model selectors

  Scenario: Select OpenAI provider
    Given the user is on the AI Model settings card
    When the user selects provider "OpenAI"
    Then the model dropdown shows: gpt-4.1-nano, gpt-4.1-mini, gpt-4.1, o4-mini
    And the default model is "gpt-4.1-mini"

  Scenario: Select Ollama provider
    Given the user is on the AI Model settings card
    When the user selects provider "Ollama"
    Then the model dropdown shows locally available models (e.g., qwen3.5:9b, llama3.1:8b, mistral)
    And the default model is "qwen3.5:9b"

  Scenario: Persist model selection
    Given the user selects provider "Ollama" and model "qwen3.5:9b"
    When the user clicks "Save"
    Then the selection is stored in the user's profile
    And all AI features (US-6.1, US-6.2, US-6.3) use the selected provider and model

  Scenario: Validate Ollama connectivity
    Given the user selects provider "Ollama"
    When the Ollama server is not reachable at the configured base URL
    Then a warning is shown: "Cannot connect to Ollama. Check that it is running."
```

#### Tasks

- [x] T-6.0.1: Add `ai_provider` and `ai_model` columns to `profiles` table via migration
- [x] T-6.0.2: Create `lib/ai/provider.ts` — model registry and provider factory (OpenAI + Ollama)
- [x] T-6.0.3: Update `app/profile/_schema.ts` with `AiModelSchema` (provider enum + model string)
- [x] T-6.0.4: Build AI Model settings card component in `app/dashboard/settings/_components/ai-model-card.tsx`
- [x] T-6.0.5: Create server action to save/load AI model preferences in `app/dashboard/settings/_actions.ts`
- [x] T-6.0.6: Add Ollama connectivity check endpoint `app/api/ai/health/route.ts`
- [x] T-6.0.7: Write tests for provider factory and schema validation

---

### US-6.1: Daily Market Summary (Vercel AI SDK) [x] 🎨

**As a** user
**I want** an AI-generated daily summary of market conditions
**So that** I get a quick briefing without reading multiple sources

```gherkin
Feature: AI Daily Market Summary
  As a user
  I want an AI-generated daily market summary
  So that I get a quick briefing without reading multiple sources

  Scenario: Generate morning summary
    Given it is 8:00 AM and market data has been fetched
    When the AI summary generation runs
    Then a summary is generated covering: S&P 500 trend, Nasdaq trend, BTC price action, Fear & Greed status, key macro event if any
    And the summary is stored in the database
    And it appears on the dashboard home page

  Scenario: Summary uses current data
    Given VOO closed at $460 (+1.2%) yesterday
    And BTC is at $92,000 (-3.5%)
    And Crypto Fear & Greed is at 30 (Fear)
    When the AI generates the summary
    Then the summary mentions the stock market gain
    And it mentions Bitcoin's decline
    And it notes the fearful sentiment as a potential buying opportunity

  Scenario: Streaming response
    Given the user clicks "Refresh Summary"
    When the AI generates a new summary
    Then the text streams in word by word using Vercel AI SDK
    And a loading indicator shows during generation
```

#### Tasks

- [x] T-6.1.1: Create `lib/ai/market-summary.ts` using Vercel AI SDK `generateText` with structured prompt
- [x] T-6.1.2: Build prompt template that injects current market data (prices, changes, sentiment, macro indicators)
- [x] T-6.1.3: Create API route `app/api/ai/summary/route.ts` with streaming response
- [x] T-6.1.4: Build summary card component with streaming text display
- [x] T-6.1.5: Implement daily auto-generation via Vercel Cron and cache in `ai_summaries` table
- [x] T-6.1.6: Write integration tests for prompt construction and response parsing

---

### US-6.2: Portfolio AI Analysis [x] 🎨

**As a** user
**I want** AI analysis of my specific portfolio
**So that** I get personalized insights and suggestions

```gherkin
Feature: Portfolio AI Analysis
  As a user
  I want AI analysis of my portfolio
  So that I get personalized insights

  Scenario: Analyze portfolio risk
    Given the user has 70% in tech-heavy assets (QQQ + BTC)
    When the user clicks "Analyze My Portfolio"
    Then the AI identifies the tech concentration risk
    And suggests considering diversification into other sectors

  Scenario: Analyze allocation vs targets
    Given the user has target 50% VOO / 20% QQQ / 20% BTC / 10% cash
    And actual allocation has drifted to 40% VOO / 15% QQQ / 35% BTC / 10% cash
    When the AI analyzes the portfolio
    Then it highlights the BTC overweight and VOO underweight
    And suggests specific rebalancing actions

  Scenario: Chat follow-up questions
    Given the AI has generated a portfolio analysis
    When the user types "Should I sell some BTC to rebalance?"
    Then the AI responds with a contextual answer considering the user's portfolio, risk tolerance, and current market conditions

  Scenario: Disclaimer
    Given any AI analysis is displayed
    Then a disclaimer reads: "AI-generated analysis. Not financial advice. Always do your own research."
```

#### Tasks

- [x] T-6.2.1: Create `lib/ai/portfolio-analysis.ts` with portfolio context builder
- [x] T-6.2.2: Build prompt template injecting: positions, allocation, drift, P&L, user risk tolerance
- [x] T-6.2.3: Implement chat interface using Vercel AI SDK `useChat` hook
- [x] T-6.2.4: Create analysis page component at `app/dashboard/insights/page.tsx`
- [x] T-6.2.5: Add persistent disclaimer component to all AI output areas
- [x] T-6.2.6: Write tests for prompt construction with various portfolio states

---

### US-6.3: Ask AI About Market Concepts [x] 🎨

**As a** user
**I want** to ask the AI questions about investing concepts
**So that** I can learn without leaving the dashboard

```gherkin
Feature: AI Learning Assistant
  As a user
  I want to ask the AI about investing concepts
  So that I can learn without leaving the dashboard

  Scenario: Ask about P/E ratio
    Given the user opens the AI chat
    When the user types "What is the P/E ratio and why does it matter?"
    Then the AI explains the concept in plain language
    And includes the current S&P 500 P/E ratio if available

  Scenario: Ask about DCA vs lump sum
    Given the user opens the AI chat
    When the user types "Is DCA better than lump sum?"
    Then the AI provides a balanced explanation with historical evidence

  Scenario: Restrict to financial topics
    Given the user opens the AI chat
    When the user asks a non-financial question like "Write me a poem"
    Then the AI responds: "I'm focused on helping with investing and financial topics. Please ask me about markets, portfolio strategy, or investing concepts."

  Scenario: Context-aware answers
    Given the user has a portfolio loaded
    When the user asks "Should I worry about the DXY going up?"
    Then the AI considers the user's international investor status (Costa Rica → USD investments)
    And explains the DXY impact relevant to their situation
```

#### Tasks

- [x] T-6.3.1: Create `lib/ai/learning-assistant.ts` with system prompt scoped to financial topics
- [x] T-6.3.2: Implement topic guardrail — reject non-financial queries politely
- [x] T-6.3.3: Build chat UI component with message history using shadcn/ui
- [x] T-6.3.4: Inject user context (country, portfolio summary) into system prompt for personalization
- [x] T-6.3.5: Add suggested starter questions: "What is DCA?", "How do ETFs work?", "Explain Bitcoin halving"
- [x] T-6.3.6: Write tests for topic guardrail and context injection

---

### US-6.4: Chain of Thought Reasoning Display [x] 🎨

**As a** user
**I want** to see the AI model's reasoning / chain of thought when using a reasoning model
**So that** I can understand how the AI arrived at its analysis

```gherkin
Feature: Chain of Thought Reasoning Display
  As a user
  I want to see the AI's reasoning process
  So that I understand how conclusions were reached

  Scenario: Display reasoning toggle on market summary
    Given the user is using a reasoning model (e.g., qwen3.5:9b, o4-mini)
    When the AI generates a market summary
    Then a collapsible "Thinking (N chars)" section appears above the summary
    And clicking the toggle reveals the chain of thought in a scrollable box

  Scenario: Display per-message reasoning in chat
    Given the user is in the Portfolio Analysis or Learning Assistant chat
    When the AI responds with reasoning content
    Then each assistant message shows an inline reasoning toggle
    And expanding it reveals the model's thinking process

  Scenario: Streaming reasoning indicator
    Given the AI is in the reasoning phase (content not yet started)
    When reasoning tokens are streaming
    Then a "Thinking…" indicator with a pulsing brain icon is displayed

  Scenario: Non-reasoning model graceful fallback
    Given the user is using a non-reasoning model (e.g., gpt-4.1-mini)
    When the AI generates a response without reasoning content
    Then no reasoning toggle is shown
    And the response displays normally

  Scenario: NDJSON streaming protocol
    Given the user triggers any AI feature
    When the API streams the response
    Then events are sent as newline-delimited JSON: {type: 'reasoning'|'text'|'error', text}
    And the client parses both reasoning and text chunks independently
```

#### Tasks

- [x] T-6.4.1: Remove `/no_think` injection from `lib/ai/provider.ts` to allow full reasoning output
- [x] T-6.4.2: Switch all 3 AI API routes (`summary`, `portfolio`, `learn`) from `textStream` to `fullStream` with NDJSON streaming protocol
- [x] T-6.4.3: Update `market-summary-card.tsx` with collapsible reasoning section (Brain icon, character count, scrollable pre box)
- [x] T-6.4.4: Update `portfolio-analysis.tsx` with per-message reasoning toggle and NDJSON parsing
- [x] T-6.4.5: Update `learning-chat.tsx` with per-message reasoning toggle and plain-text fallback for non-financial rejections

---

## E7: Alerts & Notifications

### US-7.1: Price Alerts [x] 🎨

**As a** user
**I want** to set price alerts for specific assets
**So that** I'm notified when prices hit my target levels

```gherkin
Feature: Price Alerts
  As a user
  I want to set price alerts
  So that I'm notified when prices hit my target levels

  Scenario: Create a price-above alert
    Given the user is on the Alerts page
    When the user creates an alert: "VOO above $470"
    Then the alert is saved as active
    And it appears in the alerts list

  Scenario: Create a price-below alert
    Given the user creates an alert: "BTC below $80,000"
    Then the alert is saved as active

  Scenario: Trigger alert
    Given an active alert exists: "BTC below $80,000"
    When the Bitcoin price drops to $79,500
    Then the alert fires
    And a notification is created: "BTC has dropped below $80,000 (current: $79,500)"
    And the alert status changes to "Triggered"

  Scenario: Alert does not re-trigger
    Given an alert has already triggered
    When the price continues to satisfy the condition
    Then no additional notification is created

  Scenario: Delete an alert
    Given the user has an active alert
    When the user deletes it
    Then the alert is removed from the list
```

#### Tasks

- [x] T-7.1.1: Create `alerts` table: id, user_id, symbol, condition (above/below), target_price, status (active/triggered/paused), created_at, triggered_at
- [x] T-7.1.2: Build alert creation form with symbol autocomplete, condition selector, and price input
- [x] T-7.1.3: Implement alert evaluation engine in `app/alerts/_utils.ts`
- [x] T-7.1.4: Create Vercel Cron job (every 5 min) that fetches prices and evaluates active alerts
- [x] T-7.1.5: Build alerts management page at `app/dashboard/alerts/page.tsx`
- [x] T-7.1.6: Write unit tests for alert evaluation logic (above, below, edge cases)

---

### US-7.2: Technical Indicator Alerts [x] 🎨

**As a** user
**I want** alerts based on technical indicators (RSI, 200-day MA crossover)
**So that** I'm notified of significant technical signals

```gherkin
Feature: Technical Indicator Alerts
  As a user
  I want alerts based on technical indicators
  So that I'm notified of significant technical signals

  Scenario: RSI oversold alert
    Given the user creates an alert: "VOO RSI below 30"
    When VOO's 14-day RSI drops below 30
    Then a notification is created: "VOO RSI is oversold at 28.5"

  Scenario: RSI overbought alert
    Given the user creates an alert: "QQQ RSI above 70"
    When QQQ's 14-day RSI exceeds 70
    Then a notification is created: "QQQ RSI is overbought at 72.3"

  Scenario: 200-day MA crossover alert
    Given the user creates an alert: "VOO crosses below 200-day MA"
    When VOO's price crosses below its 200-day moving average
    Then a notification is created: "VOO has crossed below its 200-day MA (MA: $445, Price: $442)"

  Scenario: MVRV Z-Score alert for Bitcoin
    Given the user creates an alert: "BTC MVRV Z-Score above 6"
    When Bitcoin's MVRV Z-Score exceeds 6
    Then a notification is created: "BTC MVRV Z-Score is elevated at 6.2 — historically near cycle tops"
```

#### Tasks

- [x] T-7.2.1: Implement RSI calculation in `lib/indicators/rsi.ts` (14-period default)
- [x] T-7.2.2: Implement moving average calculation in `lib/indicators/moving-average.ts` (SMA and EMA)
- [x] T-7.2.3: Extend alert creation form with indicator-based conditions (RSI, MA crossover)
- [x] T-7.2.4: Integrate MVRV Z-Score data from LookIntoBitcoin or on-chain API
- [x] T-7.2.5: Extend alert evaluator to handle indicator-based conditions
- [x] T-7.2.6: Write unit tests for RSI, MA, and MVRV calculations

---

### US-7.3: Notification Delivery Channels [x] 🎨

**As a** user
**I want** to receive notifications via in-app, email, or Telegram
**So that** I don't miss important alerts

```gherkin
Feature: Notification Channels
  As a user
  I want to choose how I receive notifications
  So that I don't miss important alerts

  Scenario: In-app notification
    Given an alert triggers
    Then a notification appears in the dashboard notification bell
    And the unread count badge increments

  Scenario: Email notification
    Given the user has enabled email notifications
    When an alert triggers
    Then an email is sent to the user's registered email
    And the email contains: alert details, current price, and a link to the dashboard

  Scenario: Telegram notification
    Given the user has connected their Telegram bot
    When an alert triggers
    Then a Telegram message is sent with alert details

  Scenario: Configure notification preferences
    Given the user is on Settings > Notifications
    When the user enables Telegram and disables email
    Then future alerts are sent only via in-app and Telegram
```

#### Tasks

- [x] T-7.3.1: Build in-app notification center with bell icon, unread count, and dropdown list
- [x] T-7.3.2: Integrate Supabase Edge Functions with Resend (email API) for email notifications
- [x] T-7.3.3: Create Telegram bot via BotFather and implement `lib/notifications/telegram.ts`
- [x] T-7.3.4: Build notification preferences form in Settings
- [x] T-7.3.5: Create notification dispatcher in `lib/notifications/dispatcher.ts` that routes to enabled channels
- [x] T-7.3.6: Write unit tests for dispatcher routing logic

---

## E8: Bitcoin On-Chain Analytics

### US-8.1: Bitcoin Network Metrics [x] 🎨

**As a** user
**I want** to see Bitcoin on-chain metrics (hashrate, difficulty, mempool size, block height)
**So that** I understand Bitcoin's network health beyond just price

```gherkin
Feature: Bitcoin Network Metrics
  As a user
  I want to see Bitcoin on-chain metrics
  So that I understand network health beyond price

  Scenario: Display current block height
    Given the Mempool.space API is accessible
    When the Bitcoin metrics page loads
    Then the current block height is displayed

  Scenario: Display hashrate
    Given the Mempool.space API is accessible
    When the metrics page loads
    Then the current network hashrate is shown in EH/s
    And a 30-day hashrate trend chart is displayed

  Scenario: Display mempool status
    Given the Mempool.space API is accessible
    When the metrics page loads
    Then the current mempool size (MB) is shown
    And the recommended fee rates (low/medium/high priority) are displayed

  Scenario: Display mining difficulty
    Given the Mempool.space API is accessible
    When the metrics page loads
    Then the current difficulty is shown
    And the estimated next adjustment (date and % change) is displayed
```

#### Tasks

- [x] T-8.1.1: Create `lib/bitcoin/onchain.ts` with functions: `fetchBlockHeight()`, `fetchHashrate()`, `fetchMempool()`, `fetchDifficulty()`
- [x] T-8.1.2: Integrate Mempool.space API endpoints
- [x] T-8.1.3: Build Bitcoin metrics page at `app/dashboard/bitcoin/page.tsx`
- [x] T-8.1.4: Create metric cards with sparkline charts for trends
- [x] T-8.1.5: Add auto-refresh (every 60 seconds) for real-time feel
- [x] T-8.1.6: Write unit tests for API response parsing

---

### US-8.2: Bitcoin Valuation Models [x] 🎨

**As a** user
**I want** to see Bitcoin valuation model charts (MVRV Z-Score, Stock-to-Flow, Rainbow Chart)
**So that** I can assess whether Bitcoin is undervalued or overvalued

```gherkin
Feature: Bitcoin Valuation Models
  As a user
  I want to see Bitcoin valuation model charts
  So that I can assess if Bitcoin is over or undervalued

  Scenario: Display MVRV Z-Score
    Given historical MVRV data is available
    When the valuation page loads
    Then the current MVRV Z-Score is displayed as a gauge
    And the current Z-Score value is highlighted
    And zones are color-coded: green (undervalued, Z < 0), yellow (fair, 0-3), orange (overvalued, 3-6), red (bubble, > 6)

  Scenario: Display Stock-to-Flow model
    Given S2F model data is available
    When the chart renders
    Then the S2F model price projection is plotted
    And the actual BTC price is overlaid
    And halving events are marked on the timeline

  Scenario: Display Rainbow Price Band
    Given historical BTC price data is available
    When the rainbow chart renders
    Then logarithmic regression bands are displayed
    And the current price position within the bands is highlighted
    And bands are labeled: "Fire Sale", "Buy", "Accumulate", "Still Cheap", "Hold", "Is this a bubble?", "FOMO", "Sell", "Maximum Bubble"
```

#### Tasks

- [x] T-8.2.1: Create `lib/bitcoin/valuation.ts` with model calculation functions
- [x] T-8.2.2: Implement MVRV Z-Score chart with color-coded zones
- [x] T-8.2.3: Implement Stock-to-Flow chart with halving event markers
- [x] T-8.2.4: Implement Rainbow Price Band chart with logarithmic regression bands
- [x] T-8.2.5: Build valuation models page at `app/dashboard/bitcoin/valuation/page.tsx`
- [x] T-8.2.6: Write unit tests for valuation model calculations
- [x] T-8.2.7: Integrate Blockchain.com Charts API (`market-price?timespan=all`) for full BTC price history (2009–present), replacing CoinGecko 365-day limit for S2F and Rainbow charts
- [x] T-8.2.8: Replace MVRV realized cap heuristic (`marketCap × 0.65`) with quadratic time-weighted cost-basis model using `estimateRealizedCap(supply, priceHistory)` — produces MVRV ~1.50, within ~5% of on-chain reality
- [x] T-8.2.9: Optimize valuation page and API route to share fetched `priceHistory` across MVRV, S2F, and Rainbow models (avoid duplicate Blockchain.com calls)
- [x] T-8.2.10: Add `estimateRealizedCap` unit tests (empty history, quadratic weighting, supply scaling, realistic MVRV range)
- [x] T-8.2.11: Update InfoTooltips for all 3 valuation charts to reference Blockchain.com full history and quadratic realized cap model

---

### US-8.3: Bitcoin Halving Countdown [x] 🎨

**As a** user
**I want** a visual countdown to the next Bitcoin halving
**So that** I understand the upcoming supply reduction event

```gherkin
Feature: Bitcoin Halving Countdown
  As a user
  I want a countdown to the next Bitcoin halving
  So that I understand the upcoming supply event

  Scenario: Display halving countdown
    Given the current block height is known
    And the next halving occurs at block 1,050,000
    When the countdown widget renders
    Then it shows: blocks remaining, estimated date, estimated days remaining

  Scenario: Display halving history
    Given historical halving data is available
    When the halving section renders
    Then a timeline shows all past halvings with dates and block rewards
    And the price at each halving date is displayed

  Scenario: Display current block reward
    Given the current block reward is 3.125 BTC
    When the halving info renders
    Then it shows "Current reward: 3.125 BTC per block"
    And "Next reward: 1.5625 BTC per block"

  Scenario: Supply metrics
    Given current supply data is available
    When the supply widget renders
    Then it shows: total supply, % of 21M mined, estimated year of last Bitcoin
```

#### Tasks

- [x] T-8.3.1: Implement halving calculation in `lib/bitcoin/halving.ts`: blocks remaining, estimated date based on avg block time
- [x] T-8.3.2: Build halving countdown widget component with animated blocks counter
- [x] T-8.3.3: Build halving history timeline component with price context
- [x] T-8.3.4: Build supply metrics card (total supply, % mined, issuance rate)
- [x] T-8.3.5: Write unit tests for halving block calculation and date estimation

---

## E9: Analytics & Reporting

### US-9.1: Performance Metrics [x] 🎨

**As a** user
**I want** to see key performance metrics for my portfolio
**So that** I can measure my investing success quantitatively

```gherkin
Feature: Performance Metrics
  As a user
  I want key performance metrics for my portfolio
  So that I can measure investing success

  Scenario: Display total return
    Given the user has $10,000 invested and current value is $11,500
    When the analytics page loads
    Then total return is displayed as $1,500 (15.00%)

  Scenario: Display time-weighted return
    Given the user has made multiple deposits at different times
    When the analytics page loads
    Then the time-weighted return eliminates the impact of cash flows
    And shows the pure investment performance

  Scenario: Display per-asset performance
    Given the user has positions in VOO, QQQ, and BTC
    When the per-asset table renders
    Then each asset shows: cost basis, current value, unrealized P&L, return %
    And the table is sortable by any column

  Scenario: Compare to benchmarks
    Given the user's portfolio performance is calculated
    When the benchmark comparison renders
    Then the user's return is compared to S&P 500 (VOO) over the same period
    And it shows whether the user is outperforming or underperforming
```

#### Tasks

- [x] T-9.1.1: Implement total return calculation in `app/analytics/_utils.ts`
- [x] T-9.1.2: Implement time-weighted rate of return (TWRR) calculation
- [x] T-9.1.3: Build per-asset performance table component
- [x] T-9.1.4: Implement benchmark comparison (user portfolio vs VOO over same period)
- [x] T-9.1.5: Build analytics page at `app/dashboard/analytics/page.tsx`
- [x] T-9.1.6: Write unit tests for return calculations including edge cases (partial periods, zero investment)

---

### US-9.2: Monthly / Yearly Reports [x] 🎨

**As a** user
**I want** monthly and yearly summary reports
**So that** I can track my investing discipline and results over time

```gherkin
Feature: Periodic Reports
  As a user
  I want monthly and yearly summary reports
  So that I can track discipline and results over time

  Scenario: Generate monthly report
    Given it is the end of March 2026
    When the user views the March report
    Then the report shows: starting value, ending value, net deposits, withdrawals, return %, DCA adherence score
    And a breakdown by asset is included

  Scenario: Generate yearly report
    Given 2026 has concluded
    When the user views the 2026 annual report
    Then the report shows: total invested, total value, realized gains, unrealized gains, total return %
    And a month-by-month return chart is displayed

  Scenario: DCA adherence score
    Given the user had 12 DCA schedules due in March
    And the user executed 10 of them
    When the monthly report generates
    Then the DCA adherence score is 83% (10/12)

  Scenario: Export report as PDF
    Given the user is viewing a monthly report
    When the user clicks "Export PDF"
    Then a formatted PDF is downloaded with all report data and charts
```

#### Tasks

- [x] T-9.2.1: Implement monthly report data aggregation in `app/analytics/_utils.ts`
- [x] T-9.2.2: Implement yearly report data aggregation
- [x] T-9.2.3: Calculate DCA adherence score from scheduled vs executed DCA entries
- [x] T-9.2.4: Build report viewer component with period selector (month/year dropdown)
- [x] T-9.2.5: Implement PDF export using a client-side library (e.g., jsPDF or html2canvas)
- [x] T-9.2.6: Write unit tests for report aggregation and adherence calculation

---

### US-9.3: Tax-Relevant Export (Costa Rica Context) [x] 🎨

**As a** user in Costa Rica
**I want** to export my realized gains and transaction history
**So that** I can share it with my accountant for tax compliance

```gherkin
Feature: Tax-Relevant Export
  As a user in Costa Rica
  I want to export realized gains and transaction history
  So that I can share it with my accountant

  Scenario: Export realized gains summary
    Given the user has sell transactions in 2026
    When the user exports the tax summary for 2026
    Then a CSV file is generated with: date, symbol, quantity sold, cost basis, sale price, realized gain/loss, holding period

  Scenario: Export full transaction history
    Given the user has transactions from 2026
    When the user exports the transaction history
    Then a CSV file is generated with all buy/sell/DCA transactions

  Scenario: Include Costa Rica tax note
    Given the user's country is Costa Rica
    When the export is generated
    Then a header note reads: "Costa Rica territorial tax system — foreign investment gains may be exempt. Consult your accountant."

  Scenario: Filter by year
    Given the user has transactions across 2026 and 2027
    When the user selects year "2026" and exports
    Then only 2026 transactions are included in the export
```

#### Tasks

- [x] T-9.3.1: Implement realized gains calculator in `app/analytics/_utils.ts` using FIFO method
- [x] T-9.3.2: Build CSV export utility for transactions and realized gains
- [x] T-9.3.3: Add country-specific tax notes based on user profile
- [x] T-9.3.4: Build tax export page at `app/dashboard/analytics/tax/page.tsx` with year selector
- [x] T-9.3.5: Write unit tests for FIFO gain calculation with multiple lots

---

## E10: Settings & Data Management

### US-10.1: Application Settings [x] 🎨

**As a** user
**I want** to configure app-level settings (theme, currency, notifications, API keys)
**So that** the app works the way I prefer

```gherkin
Feature: Application Settings
  As a user
  I want to configure app-level settings
  So that the app works the way I prefer

  Scenario: Toggle dark/light theme
    Given the user is on the Settings page
    When the user toggles theme to "Dark"
    Then the entire app switches to dark mode
    And the preference is persisted

  Scenario: Change base currency display
    Given the user changes base currency from USD to CRC
    When the dashboard re-renders
    Then all monetary values show in CRC with a conversion note

  Scenario: Configure API keys
    Given the user navigates to Settings > API Keys
    When the user enters their Twelve Data API key
    And clicks "Save"
    Then the key is encrypted and stored in the database
    And a connection test runs to verify the key

  Scenario: Manage notification preferences
    Given the user is on Settings > Notifications
    When the user toggles email notifications off
    And toggles Telegram on
    Then the preferences are saved
    And future notifications respect the new settings
```

#### Tasks

- [x] T-10.1.1: Build settings page at `app/dashboard/settings/page.tsx` with tab navigation: Profile, Appearance, API Keys, Notifications
- [x] T-10.1.2: Implement theme toggle (dark/light/system) using `next-themes` or CSS variables
- [x] T-10.1.3: Build API key management with encryption at rest (Supabase vault or encrypted column)
- [x] T-10.1.4: Build notification preferences form
- [x] T-10.1.5: Implement client-side reactivity via useCurrency hook (app/dashboard/\_hooks.ts) and currency formatting utility (lib/currency.ts)

---

### US-10.2: Data Export & Account Management [x] 🎨

**As a** user
**I want** to export all my data and manage my account
**So that** I own my data and can control my account

```gherkin
Feature: Data Export & Account Management
  As a user
  I want to export my data and manage my account
  So that I own my data and can control my account

  Scenario: Export all data
    Given the user navigates to Settings > Data
    When the user clicks "Export All Data"
    Then a JSON file is downloaded containing: profile, positions, transactions, DCA schedules, alerts, notification preferences
    And no sensitive data (hashed passwords, API keys) is included

  Scenario: Import positions from CSV
    Given the user has a CSV of positions from another tool
    When the user uploads the CSV on the import page
    Then the CSV is parsed and validated
    And valid positions are previewed before import
    And the user confirms to add them to the portfolio

  Scenario: Delete account
    Given the user navigates to Settings > Account
    When the user clicks "Delete Account"
    And confirms by typing their email
    Then all user data is permanently deleted from the database
    And the Supabase auth account is deleted
    And the user is redirected to the landing page

  Scenario: Change password
    Given the user is on Settings > Account
    When the user enters current password and a new password
    And clicks "Update Password"
    Then the password is updated via Supabase Auth
    And a confirmation email is sent
```

#### Tasks

- [x] T-10.2.1: Implement full data export Server Action that queries all user tables and returns JSON
- [x] T-10.2.2: Build CSV import parser with column mapping and validation preview
- [x] T-10.2.3: Implement account deletion with cascade delete across all tables and Supabase Auth
- [x] T-10.2.4: Build password change form with current password verification
- [x] T-10.2.5: Build data management UI at `app/dashboard/settings/data/page.tsx`
- [x] T-10.2.6: Write unit tests for CSV parsing and data export sanitization

---

## E11: Dashboard Home

### US-11.1: Dashboard Metric Cards [x] 🎨

**As a** user
**I want** to see key financial metrics at a glance on my dashboard home page
**So that** I can quickly assess my portfolio health without navigating to sub-pages

```gherkin
Feature: Dashboard Metric Cards
  As a user
  I want to see key financial metrics at a glance
  So that I can assess portfolio health without navigating to sub-pages

  Scenario: Display total portfolio value
    Given the user has positions in VOO, QQQ, and BTC
    When the dashboard home page loads
    Then the "Total Value" card shows the sum of all positions at current prices
    And the value is formatted in the user's base currency with comma separators

  Scenario: Display 24h portfolio change
    Given the user has a portfolio snapshot from yesterday
    When the dashboard home page loads
    Then the "Day Change" card shows the dollar and percentage change
    And positive changes are displayed in emerald green
    And negative changes are displayed in rose red

  Scenario: Display total unrealized return
    Given the user has positions with cost basis and current values
    When the dashboard home page loads
    Then the "Total Return" card shows unrealized P&L in dollars and percentage
    And the color reflects whether the return is positive or negative

  Scenario: Display live BTC price
    Given BTC market data is available
    When the dashboard home page loads
    Then the "BTC Price" card shows the current BTC price in USD
    And the 24h change percentage is shown below

  Scenario: Empty portfolio state
    Given the user has no positions
    When the dashboard home page loads
    Then the metric cards show "$0.00" or "—" placeholders
    And a prompt to add the first position is visible

  Scenario: Loading skeleton
    Given the dashboard data is being fetched
    When the page is in a loading state
    Then skeleton placeholders matching the metric card layout are displayed
```

#### Tasks

- [x] T-11.1.1: Create `app/dashboard/_actions.ts` with `getDashboardData()` server action that parallel-fetches portfolio positions, live prices (VOO, QQQ, BTC), latest portfolio snapshot, and computes aggregated metrics
- [x] T-11.1.2: Build `app/dashboard/_components/dashboard-metrics.tsx` — 4 metric cards grid (Total Value, Day Change, Total Return, BTC Price) using shadcn/ui `Card` and `useCurrency()` hook
- [x] T-11.1.3: Create `app/dashboard/_components/dashboard-skeleton.tsx` — loading skeleton matching the full dashboard layout
- [x] T-11.1.4: Create `app/dashboard/loading.tsx` — Suspense fallback using `DashboardSkeleton`

---

### US-11.2: Dashboard Charts & AI Summary [x] 🎨

**As a** user
**I want** to see a portfolio performance chart, allocation breakdown, and today's AI market briefing on my dashboard
**So that** I get a visual financial overview and market context in one place

```gherkin
Feature: Dashboard Charts & AI Summary
  As a user
  I want charts and AI briefing on the dashboard home
  So that I get a visual overview and market context in one place

  Scenario: Display 30-day performance area chart
    Given the user has portfolio snapshots for the last 30 days
    When the dashboard home page loads
    Then a compact area chart shows portfolio value over 30 days
    And the chart uses emerald gradient for positive trend, rose for negative
    And clicking the chart area links to the full Portfolio page

  Scenario: Display compact allocation donut chart
    Given the user has positions in VOO, QQQ, and BTC
    When the dashboard home page loads
    Then a donut chart shows allocation percentages by asset
    And each asset uses its designated color (blue, purple, orange)
    And a legend shows symbol, percentage, and value for each asset

  Scenario: Display today's AI market summary
    Given an AI summary was generated today
    When the dashboard home page loads
    Then the summary card shows a preview of today's briefing (truncated)
    And a "View full insights" link navigates to /dashboard/insights

  Scenario: No AI summary available
    Given no AI summary has been generated today
    When the dashboard home page loads
    Then the summary card shows "No summary yet today"
    And a link to generate one on the Insights page is shown

  Scenario: Empty portfolio charts
    Given the user has no positions
    When the dashboard home page loads
    Then the performance chart shows an empty state message
    And the allocation chart shows an empty state message
    And both include CTAs linking to /dashboard/portfolio
```

#### Tasks

- [x] T-11.2.1: Build `app/dashboard/_components/dashboard-performance.tsx` — compact 30-day area chart (Recharts `AreaChart` with gradient fill, no time range selector)
- [x] T-11.2.2: Build `app/dashboard/_components/dashboard-allocation.tsx` — compact donut chart using Recharts `PieChart` with asset color constants
- [x] T-11.2.3: Build `app/dashboard/_components/dashboard-summary.tsx` — today's cached AI summary card (read-only, truncated with "Read more" link to Insights)
- [x] T-11.2.4: Add AI summary fetch to `getDashboardData()` — query `ai_summaries` table for today's entry

---

### US-11.3: Recent Activity Feed [x] 🎨

**As a** user
**I want** to see my recent transactions and notifications on the dashboard
**So that** I can track what's happened without navigating to separate pages

```gherkin
Feature: Recent Activity Feed
  As a user
  I want to see recent activity on my dashboard
  So that I can track what's happened without navigating to separate pages

  Scenario: Display recent transactions
    Given the user has recorded buy and sell transactions
    When the dashboard home page loads
    Then the recent activity feed shows the last 5 combined items
    And each item shows an icon, description, and relative timestamp

  Scenario: Display triggered notifications
    Given a price alert was triggered 2 hours ago
    When the dashboard home page loads
    Then the notification appears in the activity feed
    And it includes the alert type and trigger value

  Scenario: Empty activity state
    Given the user has no transactions or notifications
    When the dashboard home page loads
    Then the activity feed shows "No recent activity"
    And links to add a position or set up alerts are shown

  Scenario: Assemble full dashboard page
    Given all data has been fetched
    When the dashboard home page renders
    Then the layout is: header → metric cards (4-col grid) → performance chart (col-span-4) + AI summary (col-span-3) → allocation donut + activity feed
    And the page is responsive: single column on mobile, full grid on desktop
```

#### Tasks

- [x] T-11.3.1: Build `app/dashboard/_components/dashboard-activity.tsx` — recent activity feed combining last 5 transactions and notifications with icons and relative timestamps
- [x] T-11.3.2: Add recent transactions and notifications fetch to `getDashboardData()`
- [x] T-11.3.3: Rewrite `app/dashboard/page.tsx` — Server Component assembling all dashboard sections with graceful partial rendering on API failures
- [x] T-11.3.4: Write unit tests in `app/dashboard/__tests__/` for dashboard data aggregation helpers

---

## E12: Luma Theme & Visual Polish

### US-12.1: Apply shadcn/ui Luma Design Style [x] 🎨

**As a** user
**I want** the dashboard to use the Luma visual style with rounded geometry, soft elevation, and breathable layouts
**So that** the interface feels modern, polished, and inspired by macOS Tahoe aesthetics

```gherkin
Feature: Luma Theme
  As a user
  I want the dashboard to use the Luma visual style
  So that the interface feels modern and polished

  Scenario: Dark mode uses layered elevation
    Given the user is in dark mode
    When any page loads
    Then the background is a deep neutral tone
    And cards are visually elevated via a lighter surface color
    And borders are subtle (low opacity) with depth achieved through soft shadows

  Scenario: Rounded geometry across all components
    Given the Luma theme is active
    When buttons, cards, inputs, and popovers render
    Then all components use a larger base radius (0.875rem)
    And the radius scale is proportionally derived

  Scenario: Soft elevation on floating surfaces
    Given the user is in dark mode
    When a popover, dropdown, select, or dialog opens
    Then the floating surface has a soft ambient shadow
    And a subtle 1px ring border is visible around floating elements

  Scenario: Light mode remains clean
    Given the user is in light mode
    When any page loads
    Then the standard light theme tokens are used
    And borders remain visible for structure
```

#### Tasks

- [x] T-12.1.1: Update dark mode CSS variables in `app/globals.css` — deeper background (`0.13`), elevated card surface (`0.18`), softer borders (`7%` opacity), and intermediate sidebar tone (`0.16`)
- [x] T-12.1.2: Increase base `--radius` from `0.625rem` to `0.875rem` for rounded geometry across all components
- [x] T-12.1.3: Add soft `box-shadow` rules in `@layer base` for `[data-slot="card"]` and floating surfaces (`popover-content`, `dropdown-menu-content`, `select-content`, `dialog-content`) in dark mode

---

## E13: Cron Jobs & Automation

### US-13.1: Portfolio Snapshot Cron [x]

**Route**: `app/api/cron/portfolio-snapshot/route.ts`
**Schedule**: `0 2 * * *` (02:00 UTC / 8:00 PM Costa Rica)

As a user, I want a daily automated snapshot of my portfolio's total value so that I can track historical performance over time.

#### Acceptance Criteria

```gherkin
Feature: Portfolio Snapshot Cron

  Scenario: Record daily portfolio snapshot
    Given the cron job runs at 02:00 UTC
    When there are active positions
    Then a snapshot is upserted into portfolio_snapshots for each portfolio
    And each snapshot includes total_value and positions_data JSONB

  Scenario: No positions exist
    Given the cron job runs
    When no positions are found
    Then no snapshots are created and processed=0 is returned

  Scenario: Unauthorized access
    Given a request without a valid CRON_SECRET
    When the cron endpoint is called
    Then a 401 Unauthorized response is returned
```

#### Tasks

- [x] T-13.1.1: Create `app/api/cron/portfolio-snapshot/route.ts` with edge runtime, auth check, and admin client
- [x] T-13.1.2: Fetch positions grouped by portfolio, resolve live prices via `fetchPrice` and `fetchBitcoinPrice`
- [x] T-13.1.3: Upsert snapshots into `portfolio_snapshots` with `(portfolio_id, snapshot_date)` conflict handling

### US-13.2: Market Pre-fetch Cron [x]

**Route**: `app/api/cron/market-prefetch/route.ts`
**Schedule**: `*/5 * * * *` (every 5 minutes)

As a user, I want market data pre-warmed in the cache so that dashboard pages load instantly.

#### Acceptance Criteria

```gherkin
Feature: Market Pre-fetch Cron

  Scenario: Warm cache for core watchlist
    Given the cron job runs every 5 minutes
    When the endpoint is called
    Then VOO, QQQ, BTC, and Fear & Greed data are fetched
    And the cache is populated for subsequent dashboard requests

  Scenario: Partial failure
    Given one external API is unavailable
    When the cron runs
    Then the other data sources are still fetched
    And the response indicates which sources succeeded/failed
```

#### Tasks

- [x] T-13.2.1: Create `app/api/cron/market-prefetch/route.ts` with edge runtime and auth check
- [x] T-13.2.2: Call `fetchPrice('VOO')`, `fetchPrice('QQQ')`, `fetchBitcoinPrice()`, `fetchCryptoFearGreed()` via `Promise.allSettled()`

### US-13.3: Cache Cleanup Cron [x]

**Route**: `app/api/cron/cache-cleanup/route.ts`
**Schedule**: `0 3 * * *` (03:00 UTC / 9:00 PM Costa Rica)

As a system operator, I want stale data automatically purged so that storage stays lean and queries stay fast.

#### Acceptance Criteria

```gherkin
Feature: Cache Cleanup Cron

  Scenario: Delete stale market cache
    Given market_cache rows older than 7 days exist
    When the cron runs
    Then those rows are deleted

  Scenario: Purge old notifications
    Given read notifications older than 30 days exist
    When the cron runs
    Then those read notifications are deleted

  Scenario: Purge old AI summaries
    Given ai_summaries older than 90 days exist
    When the cron runs
    Then those old summaries are deleted
```

#### Tasks

- [x] T-13.3.1: Create `app/api/cron/cache-cleanup/route.ts` with edge runtime, auth, and admin client
- [x] T-13.3.2: Delete stale rows from `market_cache` (7d), `api_request_counts` (30d), `notifications` (read, 30d), `ai_summaries` (90d)

---

## Architecture Overview

```
app/
├── page.tsx                            # Landing page
├── (auth)/
│   ├── login/
│   │   ├── page.tsx
│   │   ├── _actions.ts
│   │   ├── _schema.ts
│   │   └── _components/
│   ├── signup/
│   │   ├── page.tsx
│   │   ├── _actions.ts
│   │   ├── _schema.ts
│   │   └── _components/
│   └── callback/route.ts              # OAuth callback
├── dashboard/
│   ├── layout.tsx                      # Sidebar layout
│   ├── page.tsx                        # Dashboard home (summary + AI briefing)
│   ├── _components/
│   ├── _actions.ts
│   └── _schema.ts
├── portfolio/
│   ├── page.tsx                        # Portfolio tracker
│   ├── _components/
│   │   ├── positions-table.tsx
│   │   ├── add-position-form.tsx
│   │   └── allocation-chart.tsx
│   ├── _actions.ts
│   ├── _schema.ts
│   ├── _hooks.ts
│   ├── _atoms.ts
│   ├── _utils.ts
│   └── __tests__/
├── market/
│   ├── page.tsx                        # Market data overview
│   ├── _components/
│   │   ├── fear-greed-gauge.tsx
│   │   └── macro-indicators.tsx
│   ├── _actions.ts
│   └── _schema.ts
├── dca/
│   ├── page.tsx                        # DCA schedules
│   ├── analytics/page.tsx              # DCA performance
│   ├── _components/
│   ├── _actions.ts
│   ├── _schema.ts
│   ├── _utils.ts
│   └── __tests__/
├── bitcoin/
│   ├── page.tsx                        # On-chain metrics
│   ├── valuation/page.tsx              # Valuation models
│   ├── _components/
│   ├── _actions.ts
│   └── _schema.ts
├── alerts/
│   ├── page.tsx                        # Price & indicator alerts
│   ├── _components/
│   ├── _actions.ts
│   ├── _schema.ts
│   ├── _utils.ts
│   └── __tests__/
├── insights/
│   ├── page.tsx                        # AI analysis & chat
│   ├── _components/
│   ├── _actions.ts
│   └── _schema.ts
├── analytics/
│   ├── page.tsx                        # Performance metrics
│   ├── tax/page.tsx                    # Tax export
│   ├── _components/
│   ├── _actions.ts
│   ├── _schema.ts
│   ├── _utils.ts
│   └── __tests__/
├── settings/
│   ├── page.tsx                        # Settings tabs
│   ├── data/page.tsx                   # Data export/import
│   ├── _components/
│   ├── _actions.ts
│   └── _schema.ts
├── profile/
│   ├── page.tsx
│   ├── _components/
│   │   └── onboarding-modal.tsx
│   ├── _actions.ts
│   └── _schema.ts
└── api/
    ├── market/
    │   ├── price/[symbol]/route.ts
    │   ├── history/[symbol]/route.ts
    │   ├── crypto/[coinId]/route.ts
    │   ├── sentiment/route.ts
    │   └── macro/[seriesId]/route.ts
    ├── ai/
    │   ├── summary/route.ts
    │   ├── analyze/route.ts
    │   └── chat/route.ts
    ├── alerts/
    │   └── evaluate/route.ts           # Cron endpoint
    └── dca/
        └── remind/route.ts             # Cron endpoint

lib/
├── supabase/
│   ├── client.ts                       # Browser Supabase client
│   ├── server.ts                       # Server Supabase client
│   ├── proxy.ts                   # Auth proxy helper
│   └── database.types.ts              # Generated types
├── market/
│   ├── stocks.ts                       # Twelve Data integration
│   ├── crypto.ts                       # CoinGecko integration
│   ├── sentiment.ts                   # Fear & Greed API
│   └── macro.ts                        # FRED API
├── bitcoin/
│   ├── onchain.ts                      # Mempool.space API
│   ├── valuation.ts                   # MVRV, S2F, Rainbow models
│   └── halving.ts                      # Halving calculations
├── indicators/
│   ├── rsi.ts                          # RSI calculation
│   └── moving-average.ts              # SMA / EMA
├── ai/
│   ├── market-summary.ts              # Daily AI summary
│   ├── portfolio-analysis.ts          # Portfolio AI analysis
│   └── learning-assistant.ts          # Concept Q&A
├── notifications/
│   ├── dispatcher.ts                  # Multi-channel dispatcher
│   └── telegram.ts                     # Telegram bot
└── utils/
    └── index.ts                        # Formatting, dates, currency
```

---

## Tech Stack

| Layer            | Technology                       | Purpose                                 |
| ---------------- | -------------------------------- | --------------------------------------- |
| Framework        | Next.js 15 (App Router)          | Full-stack React framework              |
| Language         | TypeScript (strict)              | Type safety                             |
| Styling          | Tailwind CSS v4                  | Utility-first CSS                       |
| UI Components    | shadcn/ui                        | Accessible, composable components       |
| State Management | Jotai                            | Atomic state for client-side reactivity |
| Forms            | React Hook Form + Zod            | Form handling + validation              |
| Database & Auth  | Supabase (Postgres + Auth + RLS) | Backend-as-a-Service                    |
| AI               | Vercel AI SDK + OpenAI           | Streaming AI responses                  |
| Charts           | Recharts                         | Data visualization                      |
| Hosting          | Vercel                           | Deployment + Cron Jobs + Edge Functions |
| Email            | Resend                           | Transactional email notifications       |
| Notifications    | Telegram Bot API                 | Real-time push notifications            |
| Testing          | Vitest                           | Unit and integration tests              |

---

## External APIs

| API             | Purpose                          | Free Tier          |
| --------------- | -------------------------------- | ------------------ |
| Twelve Data     | Stock/ETF prices, DXY            | 800 req/day        |
| CoinGecko       | Crypto prices, market data       | Generous free tier |
| FRED            | Macro economic data (rates, CPI) | Unlimited          |
| Alternative.me  | Crypto Fear & Greed Index        | Unlimited          |
| Mempool.space   | Bitcoin on-chain data            | Unlimited          |
| LookIntoBitcoin | MVRV Z-Score, S2F data           | Web scraping / API |

---

## Changelog

| Date       | Change                                                                                            | Author |
| ---------- | ------------------------------------------------------------------------------------------------- | ------ |
| 2026-04-03 | Added E13: Cron Jobs & Automation — portfolio snapshot, market pre-fetch, cache cleanup           | @dev   |
| 2026-03-31 | Added E12: Luma Theme & Visual Polish — shadcn/ui Luma-inspired dark mode, rounded geometry       | @dev   |
| 2026-03-17 | Initial SPECS: 10 epics, 31 user stories, full Gherkin acceptance criteria, architecture overview | @dev   |
