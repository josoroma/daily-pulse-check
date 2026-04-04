# E2: Authentication & User Profile

> Provides email/password and Google OAuth sign-in, session management via Supabase Auth, route protection through middleware, profile setup via an onboarding modal, and client-side auth state via Jotai atoms. Targets a single-user personal finance dashboard for a Costa Rica-based VOO/QQQ/BTC investor.

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
                        ┌──────────────────────────────────────────────────────┐
                        │                    MIDDLEWARE                        │
                        │    proxy.ts → lib/supabase/proxy.ts                  │
                        │    updateSession(): refresh token, redirect guards   │
                        └──────────────┬────────────────────┬──────────────────┘
                                       │                    │
                          Unauthenticated               Authenticated
                          → /auth/login                 → /dashboard
                                       │                    │
          ┌─────────────────────────────┐  ┌──────────────────────────────────────┐
          │     PUBLIC AUTH PAGES       │  │        PROTECTED DASHBOARD           │
          │                             │  │                                      │
          │  /auth/login/page.tsx (SC)  │  │  /dashboard/layout.tsx (SC)          │
          │   ├─ LoginForm (CC)         │  │   ├─ createClient() → getUser()      │
          │   │   └─ login() action     │  │   ├─ getProfile() action             │
          │   └─ OAuthButtons (CC)      │  │   ├─ AuthProvider (CC)               │
          │       └─ signInWithGoogle() │  │   │   ├─ userAtom (Jotai)            │
          │                             │  │   │   └─ profileAtom (Jotai)         │
          │  /auth/signup/page.tsx (SC) │  │   ├─ SidebarNav → UserMenu           │
          │   ├─ SignupForm (CC)        │  │   └─ OnboardingModal (CC, if needed) │
          │   │   └─ signup() action    │  │       └─ ProfileForm (CC)            │
          │   └─ OAuthButtons (CC)      │  │           └─ updateProfile() action  │
          │                             │  │                                      │
          │  /auth/callback/route.ts    │  └──────────────────────────────────────┘
          │   └─ exchangeCodeForSession │
          └─────────────────────────────┘
                        │
                        ▼
              ┌────────────────────┐
              │   SUPABASE AUTH    │
              │   (Hosted / Local) │
              │                    │
              │  auth.users        │
              │  public.profiles   │
              │  (auto-created via │
              │   trigger)         │
              └────────────────────┘

SC = Server Component    CC = Client Component ('use client')
```

### Session Flow

1. **Middleware** (`proxy.ts` → `lib/supabase/proxy.ts`): Every request passes through `updateSession()` which refreshes the Supabase session cookie. Unauthenticated users hitting protected routes are redirected to `/auth/login`. Authenticated users hitting `/auth/*` are redirected to `/dashboard`.
2. **Server-side**: `lib/supabase/server.ts` creates a cookie-based Supabase client for Server Components and Server Actions.
3. **Client-side**: `lib/supabase/client.ts` creates a browser Supabase client. `AuthProvider` syncs `userAtom` and `profileAtom` via `onAuthStateChange`.

---

## Pages & Navigation

| Path             | Component                    | Type             | Description                                            |
| ---------------- | ---------------------------- | ---------------- | ------------------------------------------------------ |
| `/auth/login`    | `app/auth/login/page.tsx`    | Server Component | Login page with email/password form and Google OAuth   |
| `/auth/signup`   | `app/auth/signup/page.tsx`   | Server Component | Sign-up page with email/password form and Google OAuth |
| `/auth/callback` | `app/auth/callback/route.ts` | Route Handler    | OAuth callback — exchanges code for session            |

### Loading State

No `loading.tsx` exists for auth routes. Pages render synchronously.

### Auto-refresh

None. Auth pages are static Server Components.

### Sub-navigation

Login and signup pages cross-link via text links at the bottom of each card. Both share the `OAuthButtons` component from `app/auth/login/_components/`.

---

## Why This Feature Exists — User Flows

### Login Form (`login/_components/login-form.tsx`)

**What the user sees**: A centered card with "Welcome back" heading, email and password inputs, and a "Log In" button.

**What the user can do**:

- Submit credentials: calls `login()` Server Action → `supabase.auth.signInWithPassword()` → redirect to `/dashboard`
- See validation errors: inline rose-colored error banner for invalid credentials

**Data source**: `login()` Server Action in `app/auth/_actions.ts`

**Why it matters**: Gate to the entire dashboard — protects private portfolio and financial data.

**States**:

- Empty: Form rendered with empty inputs
- Loading: `Loader2` spinner replaces button text, inputs disabled
- Error: Rose banner with "Invalid login credentials"

---

### OAuth Buttons (`login/_components/oauth-buttons.tsx`)

**What the user sees**: A full-width outline button with Google icon and "Continue with Google" label, separated from the email form by an "or" divider.

**What the user can do**:

- Click Google sign-in: calls `signInWithGoogle()` Server Action → `supabase.auth.signInWithOAuth({ provider: 'google' })` → redirects to Google consent → returns to `/auth/callback`

**Data source**: `signInWithGoogle()` Server Action in `app/auth/_actions.ts`

**Why it matters**: One-click sign-in without managing passwords. Shared between login and signup pages.

**States**:

- Error: Toast notification via `sonner` if OAuth fails

---

### Signup Form (`signup/_components/signup-form.tsx`)

**What the user sees**: A centered card with "Create an account" heading, email, password, confirm password inputs, and a "Sign Up" button.

**What the user can do**:

- Submit registration: calls `signup()` Server Action → `supabase.auth.signUp()` with `emailRedirectTo` → redirects to `/auth/login?message=Check your email to confirm your account`
- See validation errors: rose banner for Zod validation failures or Supabase errors

**Data source**: `signup()` Server Action in `app/auth/_actions.ts`

**Why it matters**: Account creation is the first step. Confirmation email ensures valid email ownership.

**States**:

- Empty: Form with empty inputs
- Loading: `Loader2` spinner, inputs disabled
- Error: Rose banner with error message

---

### Message Banner (inline in `login/page.tsx`)

**What the user sees**: An emerald success banner (e.g. "Check your email to confirm your account") or a rose error banner (e.g. "Authentication failed") at the top of the login card.

**Data source**: URL search params `?message=` or `?error=` set by redirect flows.

---

### Onboarding Modal (`profile/_components/onboarding-modal.tsx`)

**What the user sees**: A non-dismissable dialog ("Welcome! Set up your profile") with display name, base currency (USD/CRC), country, and risk tolerance fields.

**What the user can do**:

- Fill out profile: calls `updateProfile()` Server Action → `supabase.from('profiles').update()` → `router.refresh()`

**Data source**: `getProfile()` in `app/profile/_actions.ts`, rendered conditionally in `app/dashboard/layout.tsx` when `!profile.base_currency`.

**Why it matters**: Personalizes the dashboard — base currency affects display, risk tolerance affects AI analysis prompts, country contextualizes macro indicators.

**States**:

- Form: Pre-filled with profile defaults (country defaults to "CR")
- Loading: Spinner on submit button, inputs disabled
- Success: Emerald banner "Profile updated successfully", dialog closes on `router.refresh()`
- Error: Rose banner with error message

---

### Auth Provider (`dashboard/_components/auth-provider.tsx`)

**What the user sees**: Nothing — invisible wrapper component.

**What it does**:

- Hydrates `userAtom` and `profileAtom` Jotai atoms from server-fetched data
- Subscribes to `supabase.auth.onAuthStateChange()` for real-time session updates
- Provides auth state to all dashboard Client Components via Jotai

**Data source**: `initialUser` and `initialProfile` props passed from `dashboard/layout.tsx`.

---

### OAuth Callback (`auth/callback/route.ts`)

**What the user sees**: A brief redirect — no visible UI.

**What it does**:

- Receives `?code=` from OAuth provider
- Calls `supabase.auth.exchangeCodeForSession(code)` to establish session cookies
- Redirects to `/dashboard` on success, `/auth/login?error=auth_callback_error` on failure

---

## Models, Cron Jobs, Actions & API Routes

### Server Actions (`app/auth/_actions.ts`)

| Function             | Zod Schema     | Tables Read                      | Tables Written                   | Returns                                  |
| -------------------- | -------------- | -------------------------------- | -------------------------------- | ---------------------------------------- |
| `login()`            | `LoginSchema`  | `auth.users` (via Supabase Auth) | —                                | `{ error }` or redirect to `/dashboard`  |
| `signup()`           | `SignupSchema` | —                                | `auth.users` (via Supabase Auth) | `{ error }` or redirect to `/auth/login` |
| `signInWithGoogle()` | —              | —                                | —                                | `{ error }` or redirect to Google OAuth  |
| `logout()`           | —              | —                                | —                                | `{ error }` or redirect to `/`           |

**Auth requirement**: None — these actions establish or destroy sessions. They call `createClient()` from `lib/supabase/server.ts`.

**`login()`**: Parses `FormData` through `LoginSchema`, calls `signInWithPassword()`, redirects to `/dashboard` on success.

**`signup()`**: Parses `FormData` through `SignupSchema` (includes password match refinement), calls `signUp()` with `emailRedirectTo: {NEXT_PUBLIC_SITE_URL}/auth/callback`, redirects to login with confirmation message.

**`signInWithGoogle()`**: Calls `signInWithOAuth({ provider: 'google' })` with `redirectTo: {NEXT_PUBLIC_SITE_URL}/auth/callback`, redirects to `data.url` (Google consent page).

**`logout()`**: Calls `signOut()`, redirects to `/`.

### Server Actions (`app/profile/_actions.ts`)

| Function          | Zod Schema            | Tables Read  | Tables Written | Returns                            |
| ----------------- | --------------------- | ------------ | -------------- | ---------------------------------- |
| `updateProfile()` | `UpdateProfileSchema` | `auth.users` | `profiles`     | `{ error }` or `{ success: true }` |
| `getProfile()`    | —                     | `profiles`   | —              | `Profile \| null`                  |

**`updateProfile()`**: Requires authenticated user (`getUser()`). Parses `FormData` through `UpdateProfileSchema`, updates `profiles` row matching `user.id`, calls `revalidatePath('/dashboard')`.

**`getProfile()`**: Requires authenticated user. SELECTs `*` from `profiles` where `id = user.id`.

### API Routes

| Method | Path             | Auth                       | Request Body | Response                                  | External APIs |
| ------ | ---------------- | -------------------------- | ------------ | ----------------------------------------- | ------------- |
| `GET`  | `/auth/callback` | OAuth code via query param | —            | Redirect to `/dashboard` or `/auth/login` | Supabase Auth |

### Cron Jobs

None.

### External APIs

##### Supabase Auth

| Detail                  | Value                                                       |
| ----------------------- | ----------------------------------------------------------- |
| Base URL                | `NEXT_PUBLIC_SUPABASE_URL` (project URL)                    |
| Auth                    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` via cookie-based SSR client |
| Free tier limit         | 50,000 MAU (Supabase free tier)                             |
| Cache TTL               | N/A — session based                                         |
| Fallback if unavailable | Auth pages render but submissions fail                      |

**Endpoints called (via `@supabase/ssr`):**

| Method                     | Parameters                        | Returns                      | Used for                        |
| -------------------------- | --------------------------------- | ---------------------------- | ------------------------------- |
| `signInWithPassword()`     | `{ email, password }`             | `{ data, error }`            | Email/password login            |
| `signUp()`                 | `{ email, password, options }`    | `{ data, error }`            | Account registration            |
| `signInWithOAuth()`        | `{ provider: 'google', options }` | `{ data: { url }, error }`   | Google OAuth initiation         |
| `exchangeCodeForSession()` | `code` (string)                   | `{ data, error }`            | OAuth callback session exchange |
| `signOut()`                | —                                 | `{ error }`                  | Logout                          |
| `getUser()`                | —                                 | `{ data: { user }, error }`  | Session validation              |
| `onAuthStateChange()`      | `callback`                        | `{ data: { subscription } }` | Client-side session sync        |

### Zod Schemas (`app/auth/_schema.ts`)

##### `LoginSchema` → `type Login`

| Field      | Type     | Constraints | Description          |
| ---------- | -------- | ----------- | -------------------- |
| `email`    | `string` | `.email()`  | User's email address |
| `password` | `string` | `.min(8)`   | Minimum 8 characters |

**Example valid data:**

```typescript
const example: Login = {
  email: 'jose@example.com',
  password: 'Str0ngP4ss!',
}
```

##### `SignupSchema` → `type Signup`

| Field             | Type     | Constraints                        | Description           |
| ----------------- | -------- | ---------------------------------- | --------------------- |
| `email`           | `string` | `.email()`                         | User's email address  |
| `password`        | `string` | `.min(8)`                          | Minimum 8 characters  |
| `confirmPassword` | `string` | `.min(8)`, `.refine(password ===)` | Must match `password` |

**Example valid data:**

```typescript
const example: Signup = {
  email: 'jose@example.com',
  password: 'Str0ngP4ss!',
  confirmPassword: 'Str0ngP4ss!',
}
```

### Zod Schemas (`app/profile/_schema.ts`)

##### `UpdateProfileSchema` → `type UpdateProfile`

| Field            | Type     | Constraints                                                   | Description               |
| ---------------- | -------- | ------------------------------------------------------------- | ------------------------- |
| `display_name`   | `string` | `.max(100)`, optional                                         | User display name         |
| `base_currency`  | `enum`   | `'USD' \| 'CRC'`                                              | Base currency for display |
| `country`        | `string` | `.min(1).max(100)`                                            | User's country            |
| `risk_tolerance` | `enum`   | `'Conservative' \| 'Medium' \| 'Medium-High' \| 'Aggressive'` | Investment risk profile   |

**Exported constants:**

- `BASE_CURRENCIES = ['USD', 'CRC'] as const`
- `RISK_TOLERANCES = ['Conservative', 'Medium', 'Medium-High', 'Aggressive'] as const`

**Example valid data:**

```typescript
const example: UpdateProfile = {
  display_name: 'José Romero',
  base_currency: 'USD',
  country: 'CR',
  risk_tolerance: 'Medium-High',
}
```

### Utility Functions (`app/auth/_utils.ts`)

| Function           | Parameters                                                                     | Returns  | Description                                   |
| ------------------ | ------------------------------------------------------------------------------ | -------- | --------------------------------------------- |
| `getDisplayName()` | `profileName: string \| null \| undefined, email: string \| null \| undefined` | `string` | Returns profile name, email prefix, or "User" |
| `getInitials()`    | `displayName: string`                                                          | `string` | Up to 2 uppercase initials from a name        |

---

## Database Schema

### `profiles`

**Created in**: `supabase/migrations/20260320000000_initial_schema.sql`
**Extended in**: `supabase/migrations/20260323000000_ai_provider_and_summaries.sql`

| Column           | Type          | Nullable | Default          | Description                                                                         |
| ---------------- | ------------- | -------- | ---------------- | ----------------------------------------------------------------------------------- |
| `id`             | `uuid`        | No       | —                | PK, FK → `auth.users(id)` ON DELETE CASCADE                                         |
| `display_name`   | `text`        | Yes      | —                | User's display name (from OAuth or manual input)                                    |
| `base_currency`  | `text`        | No       | `'USD'`          | `CHECK (base_currency in ('USD', 'CRC'))`                                           |
| `country`        | `text`        | No       | `'CR'`           | User's country (ISO or freeform)                                                    |
| `risk_tolerance` | `text`        | No       | `'Medium'`       | `CHECK (risk_tolerance in ('Conservative', 'Medium', 'Medium-High', 'Aggressive'))` |
| `ai_provider`    | `text`        | No       | `'openai'`       | `CHECK (ai_provider in ('openai', 'ollama'))`                                       |
| `ai_model`       | `text`        | No       | `'gpt-4.1-mini'` | AI model identifier                                                                 |
| `created_at`     | `timestamptz` | No       | `now()`          | Row creation timestamp                                                              |
| `updated_at`     | `timestamptz` | No       | `now()`          | Last update timestamp                                                               |

**RLS Policies:**

| Policy                         | Operation | Condition         |
| ------------------------------ | --------- | ----------------- |
| `Users can view own profile`   | SELECT    | `auth.uid() = id` |
| `Users can insert own profile` | INSERT    | `auth.uid() = id` |
| `Users can update own profile` | UPDATE    | `auth.uid() = id` |

**Triggers:**

- `on_auth_user_created` → calls `handle_new_user()` AFTER INSERT on `auth.users` — auto-creates a `profiles` row with `id = new.id` and `display_name = new.raw_user_meta_data->>'full_name'`

**Written by**: `updateProfile()` in `app/profile/_actions.ts`, `handle_new_user()` trigger
**Read by**: `getProfile()` in `app/profile/_actions.ts`, `app/dashboard/layout.tsx`, cron jobs (`ai-summary`, `alert-evaluation`)

**Example row:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "display_name": "José Romero",
  "base_currency": "USD",
  "country": "CR",
  "risk_tolerance": "Medium-High",
  "ai_provider": "openai",
  "ai_model": "gpt-4.1-mini",
  "created_at": "2026-03-20T14:30:00.000Z",
  "updated_at": "2026-04-01T09:15:00.000Z"
}
```

---

## Testing

### `app/auth/__tests__/_schema.test.ts`

| Describe Block | Tests | Key Edge Cases                                                 |
| -------------- | ----- | -------------------------------------------------------------- |
| `LoginSchema`  | 5     | Invalid email, short password, missing email, missing password |
| `SignupSchema` | 3+    | Mismatched passwords, invalid email                            |

### `app/auth/__tests__/_utils.test.ts`

| Describe Block   | Tests | Key Edge Cases                                               |
| ---------------- | ----- | ------------------------------------------------------------ |
| `getDisplayName` | 6     | Null/undefined/empty fallbacks, email prefix extraction      |
| `getInitials`    | 6     | Multi-word names, single-word, empty string, "User" fallback |

### `app/profile/__tests__/_schema.test.ts`

| Describe Block        | Tests | Key Edge Cases                                                                 |
| --------------------- | ----- | ------------------------------------------------------------------------------ |
| `UpdateProfileSchema` | 7     | Invalid currency, invalid risk tolerance, empty country, all valid enum values |

**Run this feature's tests:**

```bash
npm test -- app/auth
npm test -- app/profile
```

### Test Gaps

- `_actions.ts` functions (`login`, `signup`, `signInWithGoogle`, `logout`, `updateProfile`, `getProfile`) have no unit tests — they depend on Supabase client mocking which is excluded per project conventions (test pure functions only)
- `proxy.ts` / `lib/supabase/proxy.ts` middleware redirect logic is not tested

---

## File Tree

```
app/auth/
├── _actions.ts                         # login, signup, signInWithGoogle, logout
├── _schema.ts                          # LoginSchema, SignupSchema
├── _utils.ts                           # getDisplayName, getInitials
├── callback/
│   └── route.ts                        # OAuth callback handler
├── login/
│   ├── page.tsx                        # Login page (Server Component)
│   └── _components/
│       ├── login-form.tsx              # Email/password form (Client Component)
│       └── oauth-buttons.tsx           # Google OAuth button (Client Component)
├── signup/
│   ├── page.tsx                        # Signup page (Server Component)
│   └── _components/
│       └── signup-form.tsx             # Registration form (Client Component)
└── __tests__/
    ├── _schema.test.ts                 # LoginSchema + SignupSchema tests
    └── _utils.test.ts                  # getDisplayName + getInitials tests

app/profile/
├── _actions.ts                         # updateProfile, getProfile
├── _schema.ts                          # UpdateProfileSchema, BASE_CURRENCIES, RISK_TOLERANCES
├── _components/
│   ├── onboarding-modal.tsx            # Non-dismissable profile setup dialog
│   └── profile-form.tsx                # Reusable profile form (settings + onboarding)
└── __tests__/
    └── _schema.test.ts                 # UpdateProfileSchema tests

# Related files outside the route:

app/dashboard/
├── layout.tsx                          # Reads user + profile, renders AuthProvider + OnboardingModal
├── _atoms.ts                           # userAtom, profileAtom, Profile type
└── _components/
    ├── auth-provider.tsx               # Jotai hydration + onAuthStateChange listener
    ├── sidebar-nav.tsx                 # Navigation sidebar with UserMenu
    └── user-menu.tsx                   # Avatar, display name, logout button

lib/supabase/
├── client.ts                           # Browser Supabase client (createBrowserClient)
├── server.ts                           # Server Supabase client (cookie-based)
├── proxy.ts                            # Middleware: session refresh + route guards
└── admin.ts                            # Service role client (cron jobs)

proxy.ts                                # Next.js middleware entry point

supabase/migrations/
├── 20260320000000_initial_schema.sql   # profiles table + RLS + trigger
└── 20260323000000_ai_provider_and_summaries.sql  # ai_provider, ai_model columns
```

---

## Known Limitations

- **No password reset flow**: There is no forgot-password page or `resetPasswordForEmail()` call. Users who forget their password cannot recover access via email.
- **No email verification enforcement**: After signup, the user is redirected to login with a confirmation message, but there is no server-side check that the email has been verified before allowing login. Supabase may enforce this depending on project settings.
- **No OAuth providers beyond Google**: Only Google OAuth is implemented. No GitHub, Apple, or other providers.
- **Onboarding modal trigger**: The modal shows when `!profile.base_currency`, but `base_currency` has a default of `'USD'` in the migration, so the trigger condition may never be met for auto-created profiles. The profile is auto-created by the `handle_new_user()` trigger with all defaults populated.
- **`NEXT_PUBLIC_SITE_URL` fallback**: Both `signup()` and `signInWithGoogle()` fall back to `http://localhost:3000` if `NEXT_PUBLIC_SITE_URL` is not set. This must be configured in production.
- **No rate limiting on auth endpoints**: Login and signup actions have no throttling — brute force protection relies entirely on Supabase Auth's built-in rate limiting.
- **Middleware naming**: The middleware file is named `proxy.ts` instead of the Next.js conventional `middleware.ts`. The export is `proxy` instead of `middleware`. This works because of the Next.js config but may confuse developers expecting the standard name.
