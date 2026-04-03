# Runtime Environment Variables in Next.js

## Table of Contents

- [1. Next.js App Router — Built-in Runtime Env (Recommended)](#1-nextjs-app-router--built-in-runtime-env-recommended)
- [2. `next.config.js` `serverRuntimeConfig` / `publicRuntimeConfig` (Pages Router only)](#2-nextconfigjs-serverruntimeconfig--publicruntimeconfig-pages-router-only-deprecated-pattern)
- [3. `@t3-oss/env-nextjs` (Type-safe validation)](#3-t3-ossenv-nextjs-type-safe-validation)
- [4. Custom `<script>` Injection (DIY)](#4-custom-script-injection-diy)
- [5. Docker `ENTRYPOINT` Script (Ops-level approach)](#5-docker-entrypoint-script-ops-level-approach)
- [Recommendation](#recommendation)

## Alternatives and Approaches to `next-runtime-env`

---

### 1. Next.js App Router — Built-in Runtime Env (Recommended)

Since Next.js 13.4+ (App Router), you can avoid `next-runtime-env` entirely:

- **Server Components** read `process.env` directly at request time — no build-time inlining.
- **Route Handlers** and **Server Actions** also have full runtime access.
- Only **Client Components** still need `NEXT_PUBLIC_*` (inlined at build).

**Pattern:** Keep secrets and dynamic config in Server Components, pass only what the client needs via props or a Server Action.

```tsx
// app/page.tsx (Server Component — reads env at runtime)
export default function Page() {
  const apiUrl = process.env.API_URL // runtime, not inlined
  return <ClientWidget apiUrl={apiUrl} />
}
```

This is the simplest "build once, deploy anywhere" approach if you can structure your app around Server Components.

---

### 2. `next.config.js` `serverRuntimeConfig` / `publicRuntimeConfig` (Pages Router only, deprecated pattern)

```js
// next.config.js
module.exports = {
  publicRuntimeConfig: { API_URL: process.env.API_URL },
}
```

Accessed via `getConfig()` from `next/config`. **Not supported in the App Router** and considered legacy — avoid for new projects.

---

### 3. `@t3-oss/env-nextjs` (Type-safe validation)

Doesn't solve _runtime_ injection, but pairs well with any approach by adding **Zod-based validation** of env vars at build/start time:

```ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: { DATABASE_URL: z.string().url() },
  client: { NEXT_PUBLIC_API_URL: z.string().url() },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
})
```

Catches missing/malformed vars immediately. Widely adopted (T3 stack, etc.).

---

### 4. Custom `<script>` Injection (DIY)

The same pattern `next-runtime-env` uses, but without the dependency:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  const envScript = `window.__ENV = ${JSON.stringify({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  })}`

  return (
    <html>
      <head>
        <script dangerouslySetInnerHTML={{ __html: envScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

```ts
// lib/env.ts
export function env(key: string) {
  if (typeof window !== 'undefined') return (window as any).__ENV?.[key]
  return process.env[key]
}
```

Minimal, no dependency, ~10 lines of code. This is essentially what `next-runtime-env` does under the hood.

---

### 5. Docker `ENTRYPOINT` Script (Ops-level approach)

Replace placeholders in the built `.next` output at container start:

```dockerfile
# Replace build-time placeholder with runtime value
ENTRYPOINT ["/bin/sh", "-c", \
  "find /app/.next -type f -name '*.js' -exec sed -i \"s|__API_URL_PLACEHOLDER__|$API_URL|g\" {} + && node server.js"]
```

Crude but works without any library. Common in enterprise setups.

---

## Recommendation

| Scenario                             | Best approach                                      |
| ------------------------------------ | -------------------------------------------------- |
| App Router, most config server-side  | **Server Components + props** (no library needed)  |
| App Router, client needs runtime env | **DIY `<script>` injection** or `next-runtime-env` |
| Type-safe env validation             | **`@t3-oss/env-nextjs`**                           |
| Pages Router legacy                  | `next-runtime-env` still works fine                |

**For new App Router projects:** lean on Server Components for runtime env access and use the DIY script pattern for the few client-side values that need to vary by deployment. Combine with `@t3-oss/env-nextjs` for validation. This eliminates the need for `next-runtime-env` entirely.
