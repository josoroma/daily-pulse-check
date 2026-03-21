# Epic E2: Authentication & User Profile — Commands Reference

> All commands and configuration used to implement Epic E2 (Authentication & User Profile) with 3 user stories and 16 tasks.

---

## Prerequisites

E2 depends on E1 deliverables:

- Supabase CLI installed and local instance running (`supabase start`)
- `lib/supabase/client.ts` and `lib/supabase/server.ts` helpers created
- Initial migration applied with `profiles` table, RLS policies, and `handle_new_user()` trigger
- `.env.local` configured with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Packages (already installed in E1)

| Package                 | Version | Purpose                        |
| ----------------------- | ------- | ------------------------------ |
| `@supabase/supabase-js` | ^2.99.3 | Supabase client SDK            |
| `@supabase/ssr`         | ^0.9.0  | Server-side auth (cookies)     |
| `react-hook-form`       | ^7.71.2 | Form state management          |
| `@hookform/resolvers`   | ^5.2.2  | Zod resolver for RHF           |
| `zod`                   | ^4.3.6  | Schema validation              |
| `jotai`                 | ^2.18.1 | Client state (atoms)           |
| `next`                  | 16.2.1  | Framework (App Router + proxy) |

No additional packages were installed for E2 — all dependencies were provisioned in E1.

---

## US-2.1: Supabase Authentication

### Supabase Configuration

#### `supabase/config.toml` — Auth Section

Key settings applied for local development:

```toml
[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = [
  "http://localhost:3000/auth/callback",
  "http://127.0.0.1:3000/auth/callback"
]
enable_signup = true
enable_anonymous_sign_ins = false
minimum_password_length = 6

[auth.email]
enable_signup = true
enable_confirmations = false   # No email verification for local dev
max_frequency = "1s"
otp_length = 6
otp_expiry = 3600
```

> **Note**: `enable_confirmations = false` means signup works immediately without email verification in local development. In production, enable this and configure SMTP.

#### Google OAuth Provider

Google OAuth is **disabled** in local config by default. Follow these steps to enable it.

##### Step 1: Create Google Cloud OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. If prompted, configure the **OAuth consent screen** first:
   - User Type: **External** (or Internal for Google Workspace orgs)
   - App name: `Finance Dashboard` (or your app name)
   - User support email: your email
   - Authorized domains: add your production domain (e.g., `yourdomain.com`)
   - Developer contact email: your email
   - Scopes: add `email` and `profile` (`.../auth/userinfo.email`, `.../auth/userinfo.profile`)
6. Back in **Credentials**, click **Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `Finance Dashboard` (or any label)
   - **Authorized JavaScript origins**: add your app URLs
   - **Authorized redirect URIs**: add the Supabase auth callback URL(s)

##### Step 2: Configure Authorized URLs in Google Cloud Console

**Local development:**

| Field                         | Value                                     |
| ----------------------------- | ----------------------------------------- |
| Authorized JavaScript origins | `http://localhost:3000`                   |
| Authorized redirect URIs      | `http://127.0.0.1:54331/auth/v1/callback` |

**Production (Supabase hosted):**

| Field                         | Value                                                |
| ----------------------------- | ---------------------------------------------------- |
| Authorized JavaScript origins | `https://yourdomain.com`                             |
| Authorized redirect URIs      | `https://<project-ref>.supabase.co/auth/v1/callback` |

> **Important**: The redirect URI points to your **Supabase API URL**, not your app URL. Supabase handles the OAuth exchange at `/auth/v1/callback`, then redirects the user to your app's `additional_redirect_urls`.

##### Step 3: Update `supabase/config.toml`

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
redirect_uri = ""  # Leave empty — defaults to <supabase-url>/auth/v1/callback
```

##### Step 4: Add Environment Variables to `.env.local`

```bash
# Google OAuth — from Google Cloud Console → Credentials → OAuth 2.0 Client
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx
```

##### Step 5: Verify Redirect URLs in `config.toml`

Ensure your app's callback route is listed in `additional_redirect_urls`:

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = [
  "http://localhost:3000/auth/callback",
  "http://127.0.0.1:3000/auth/callback"
]
```

This is where Supabase redirects the user **after** the OAuth exchange completes. The flow is:

```
User → Google consent → Supabase /auth/v1/callback → Your app /auth/callback
```

##### Step 6: Restart Supabase

```bash
supabase stop && supabase start
```

##### Step 7: Verify the OAuth Flow

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:3000/auth/login`
3. Click **Continue with Google**
4. Complete Google consent screen
5. Verify redirect to `/dashboard` with a valid session

##### URL Reference Summary

| URL                                          | Owner    | Purpose                                       |
| -------------------------------------------- | -------- | --------------------------------------------- |
| `http://localhost:3000`                      | Next.js  | Your app (JavaScript origin)                  |
| `http://127.0.0.1:54331/auth/v1/callback`    | Supabase | OAuth code exchange endpoint (local)          |
| `http://localhost:3000/auth/callback`        | Next.js  | App callback route (exchanges code → session) |
| `https://<ref>.supabase.co/auth/v1/callback` | Supabase | OAuth code exchange endpoint (production)     |
| `https://yourdomain.com/auth/callback`       | Next.js  | App callback route (production)               |

##### Disabling Google OAuth

To disable, revert `config.toml` and remove env vars:

```toml
[auth.external.google]
enabled = false
client_id = ""
secret = ""
```

Remove from `.env.local`:

```bash
# Delete these lines
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

#### Apply Configuration Changes

```bash
supabase stop && supabase start
```

### Database: Profiles Table & Auto-Creation Trigger

The `profiles` table and signup trigger were created in E1's migration (`supabase/migrations/20260320000000_initial_schema.sql`):

```sql
-- Profiles table with RLS
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  base_currency text not null default 'USD' check (base_currency in ('USD', 'CRC')),
  country text not null default 'CR',
  risk_tolerance text not null default 'Medium'
    check (risk_tolerance in ('Conservative', 'Medium', 'Medium-High', 'Aggressive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup (populates display_name from OAuth metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

#### Reset Database (if needed)

```bash
supabase db reset
```

This drops and recreates the database with the latest migration, clearing stale auth state.

### Files Created

#### Auth Schemas — `app/auth/_schema.ts`

Zod schemas for login and signup form validation:

- `LoginSchema` — email (valid format) + password (min 8 chars)
- `SignupSchema` — email + password + confirmPassword with `.refine()` for match check

#### Server Actions — `app/auth/_actions.ts`

Four server actions using Supabase Auth:

| Action               | Method                                    | Redirect                    |
| -------------------- | ----------------------------------------- | --------------------------- |
| `login()`            | `signInWithPassword()`                    | → `/dashboard`              |
| `signup()`           | `signUp()` + `emailRedirectTo`            | → `/auth/login?message=...` |
| `signInWithGoogle()` | `signInWithOAuth({ provider: 'google' })` | → Google OAuth URL          |
| `logout()`           | `signOut()`                               | → `/`                       |

`emailRedirectTo` and `redirectTo` use:

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
```

#### Login Page — `app/auth/login/page.tsx`

- Route: `/auth/login`
- Components: `app/auth/login/_components/login-form.tsx`, `app/auth/login/_components/oauth-buttons.tsx`
- Uses `useActionState` (React 19) for form submission with server action

#### Signup Page — `app/auth/signup/page.tsx`

- Route: `/auth/signup`
- Component: `app/auth/signup/_components/signup-form.tsx`
- Uses `useActionState` with `signup` server action

#### OAuth Callback — `app/auth/callback/route.ts`

- Route: `GET /auth/callback`
- Exchanges the `code` query parameter for a session via `exchangeCodeForSession()`
- Redirects to `/dashboard` on success, `/auth/login?error=auth_callback_error` on failure

#### Auth Tests — `app/auth/__tests__/_schema.test.ts`

Unit tests for `LoginSchema` and `SignupSchema` covering valid inputs, invalid emails, short passwords, and password mismatch.

### Proxy (Middleware) — Route Protection

#### `proxy.ts` (project root)

Next.js 16 uses `proxy.ts` instead of `middleware.ts`:

```typescript
import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

#### `lib/supabase/proxy.ts`

Session refresh and route protection logic:

- **Public routes**: `/`, `/auth/login`, `/auth/signup`, `/auth/callback`, `/auth/*`
- **Protected routes**: Everything under `/dashboard/*` requires auth
- **Redirects**: Unauthenticated → `/auth/login`, Authenticated on `/auth/*` → `/dashboard`
- **Session refresh**: Calls `supabase.auth.getUser()` on every request to keep cookies fresh

---

## US-2.2: User Profile Setup

### Files Created

#### Profile Schemas — `app/profile/_schema.ts`

```typescript
export const BASE_CURRENCIES = ['USD', 'CRC'] as const
export const RISK_TOLERANCES = ['Conservative', 'Medium', 'Medium-High', 'Aggressive'] as const

export const UpdateProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  base_currency: z.enum(BASE_CURRENCIES),
  country: z.string().min(1).max(100),
  risk_tolerance: z.enum(RISK_TOLERANCES),
})
```

#### Profile Actions — `app/profile/_actions.ts`

| Action            | Method                                        | Purpose                                   |
| ----------------- | --------------------------------------------- | ----------------------------------------- |
| `updateProfile()` | `supabase.from('profiles').update()`          | Update profile fields with Zod validation |
| `getProfile()`    | `supabase.from('profiles').select().single()` | Fetch current user's profile              |

Both actions verify authentication via `supabase.auth.getUser()` before database operations.

#### Onboarding Modal — `app/profile/_components/onboarding-modal.tsx`

- Triggered in `app/dashboard/layout.tsx` when user needs onboarding
- Fields: display name, base currency (USD/CRC), country, risk tolerance
- Submits to `updateProfile` server action
- Uses React Hook Form + Zod resolver

#### Profile Form — `app/profile/_components/profile-form.tsx`

- Reusable form component used by both onboarding modal and settings page
- Fields: display name, base currency dropdown, country input, risk tolerance dropdown

#### Profile Tests — `app/profile/__tests__/_schema.test.ts`

Unit tests for `UpdateProfileSchema` covering valid profiles, enum validation, and required fields.

---

## US-2.3: Protected Dashboard Layout

### Files Created

#### Dashboard Layout — `app/dashboard/layout.tsx`

- Fetches user via `supabase.auth.getUser()` and profile via `getProfile()`
- Wraps children in `AuthProvider` → `SidebarProvider` → `SidebarInset`
- Conditionally renders `OnboardingModal` for users needing profile setup
- Uses shadcn/ui `Sidebar`, `SidebarInset`, `SidebarTrigger`, `Separator`

#### Jotai Atoms — `app/dashboard/_atoms.ts`

```typescript
export const userAtom = atom<User | null>(null)
export const profileAtom = atom<Profile | null>(null)
```

Hydrated from server data via `AuthProvider` on dashboard load.

#### Auth Provider — `app/dashboard/_components/auth-provider.tsx`

- Client component (`'use client'`)
- Receives `initialUser` and `initialProfile` from the server layout
- Hydrates `userAtom` and `profileAtom` on mount via `useHydrateAtoms`

#### Sidebar Navigation — `app/dashboard/_components/sidebar-nav.tsx`

Navigation items:

- Dashboard (`/dashboard`)
- Portfolio (`/dashboard/portfolio`)
- Markets (`/dashboard/markets`)
- DCA (`/dashboard/dca`)
- Alerts (`/dashboard/alerts`)
- Insights (`/dashboard/insights`)
- Settings (`/dashboard/settings`)

Responsive: collapsible on mobile via shadcn/ui `SidebarTrigger`.

#### User Menu — `app/dashboard/_components/user-menu.tsx`

- Dropdown menu in sidebar footer with user avatar and email
- Menu items: Account label, Settings link, Log out action
- Uses `DropdownMenuGroup` to wrap `DropdownMenuLabel` (required by Base UI context)

#### Settings Page — `app/dashboard/settings/page.tsx`

- Route: `/dashboard/settings`
- Fetches profile via `getProfile()` and renders `ProfileForm` with current values
- Reuses the same `ProfileForm` component from `app/profile/_components/`

---

## Environment Variables

### `.env.local` (required)

```bash
# Supabase — values from `supabase status`
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-status>

# App URL — used for email redirects and OAuth callbacks
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Getting Supabase Credentials

```bash
supabase status
```

Output includes:

- **API URL**: `http://127.0.0.1:54331` → `NEXT_PUBLIC_SUPABASE_URL`
- **anon key**: publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key**: admin key (not needed for client-side)

---

## Local Development URLs

| Service          | URL                                                     |
| ---------------- | ------------------------------------------------------- |
| Next.js App      | http://localhost:3000                                   |
| Supabase API     | http://127.0.0.1:54331                                  |
| Supabase Studio  | http://127.0.0.1:54333                                  |
| Supabase DB      | postgresql://postgres:postgres@127.0.0.1:54332/postgres |
| Mailpit (emails) | http://127.0.0.1:54334                                  |

---

## Auth Flow Summary

### Email/Password Signup

1. User visits `/auth/signup`
2. Fills email, password, confirm password → validated by `SignupSchema`
3. `signup()` server action calls `supabase.auth.signUp()` with `emailRedirectTo`
4. With `enable_confirmations = false` (local): account created immediately
5. `handle_new_user()` trigger auto-creates a `profiles` row
6. User redirected to `/auth/login`

### Email/Password Login

1. User visits `/auth/login`
2. Fills email, password → validated by `LoginSchema`
3. `login()` server action calls `supabase.auth.signInWithPassword()`
4. On success: session cookie set, redirect to `/dashboard`
5. Proxy refreshes session on every request via `getUser()`

### Google OAuth (when enabled)

1. User clicks "Continue with Google"
2. `signInWithGoogle()` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. User redirected to Google consent screen
4. Google redirects to `/auth/callback` with auth code
5. Callback route exchanges code for session via `exchangeCodeForSession()`
6. User redirected to `/dashboard`

### Logout

1. User clicks "Log Out" in sidebar user menu
2. `logout()` calls `supabase.auth.signOut()`
3. Redirect to `/` (landing page)

---

## Testing

### Run Auth Tests

```bash
npm test
```

Test files:

- `app/auth/__tests__/_schema.test.ts` — LoginSchema + SignupSchema validation
- `app/profile/__tests__/_schema.test.ts` — UpdateProfileSchema validation

### Manual Testing Checklist

1. **Signup**: Visit `http://localhost:3000/auth/signup` → create account → check redirect
2. **Login**: Visit `http://localhost:3000/auth/login` → sign in → verify dashboard loads
3. **Onboarding**: First login should show onboarding modal (if `display_name` is null)
4. **Settings**: Navigate to Settings → update profile → verify toast + DB update
5. **Logout**: Click "Log Out" → verify redirect to landing page
6. **Route protection**: Visit `/dashboard` while logged out → verify redirect to `/auth/login`
7. **Auth redirect**: Visit `/auth/login` while logged in → verify redirect to `/dashboard`
8. **Mailpit**: Check `http://127.0.0.1:54334` for any verification emails (when confirmations enabled)

---

## Troubleshooting

### "Database error finding user" on signup

```bash
supabase db reset
```

Resets the database and re-applies all migrations, clearing stale auth state.

### `emailRedirectTo` redirecting to Supabase URL

Ensure `_actions.ts` uses the app URL, not the Supabase URL:

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
```

### Session not persisting / proxy not running

Verify `proxy.ts` exists at the project root (not `middleware.ts` — Next.js 16 convention):

```typescript
export async function proxy(request: NextRequest) { ... }
```

### "MenuGroupRootContext is missing" error

Ensure `DropdownMenuLabel` is wrapped in `DropdownMenuGroup` in `user-menu.tsx`:

```tsx
<DropdownMenuGroup>
  <DropdownMenuLabel>Account</DropdownMenuLabel>
  {/* menu items */}
</DropdownMenuGroup>
```

---

## File Tree

```
app/
├── auth/
│   ├── _actions.ts              # login, signup, signInWithGoogle, logout
│   ├── _schema.ts               # LoginSchema, SignupSchema
│   ├── __tests__/
│   │   └── _schema.test.ts      # Auth schema unit tests
│   ├── callback/
│   │   └── route.ts             # OAuth code exchange
│   ├── login/
│   │   ├── page.tsx             # Login page
│   │   └── _components/
│   │       ├── login-form.tsx   # Email/password form
│   │       └── oauth-buttons.tsx # Google OAuth button
│   └── signup/
│       ├── page.tsx             # Signup page
│       └── _components/
│           └── signup-form.tsx  # Signup form
├── dashboard/
│   ├── layout.tsx               # Protected layout + onboarding check
│   ├── page.tsx                 # Dashboard home
│   ├── _atoms.ts                # userAtom, profileAtom
│   ├── _components/
│   │   ├── auth-provider.tsx    # Hydrates Jotai atoms from server
│   │   ├── sidebar-nav.tsx      # Sidebar with nav items
│   │   └── user-menu.tsx        # User dropdown menu
│   └── settings/
│       └── page.tsx             # Settings page (uses ProfileForm)
├── profile/
│   ├── _actions.ts              # updateProfile, getProfile
│   ├── _schema.ts               # UpdateProfileSchema
│   ├── __tests__/
│   │   └── _schema.test.ts     # Profile schema unit tests
│   └── _components/
│       ├── onboarding-modal.tsx # First-time user setup
│       └── profile-form.tsx     # Reusable profile form
lib/
├── supabase/
│   ├── client.ts                # Browser Supabase client
│   ├── server.ts                # Server Supabase client (cookies)
│   └── proxy.ts                 # Session refresh + route protection
proxy.ts                         # Next.js 16 proxy entry point
supabase/
├── config.toml                  # Auth config, providers, redirect URLs
└── migrations/
    └── 20260320000000_initial_schema.sql  # profiles table + trigger
```
