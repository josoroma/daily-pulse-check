---
paths:
  - "lib/supabase/**"
  - "app/**/_actions.ts"
  - "app/api/**"
  - "middleware.ts"
---

# Security Rules

- All Supabase tables must have Row Level Security (RLS) enabled
- RLS policies: users can only SELECT, INSERT, UPDATE, DELETE their own rows (match `auth.uid()`)
- Never expose `service_role` key to the client — server-side only
- Validation always happens in `_actions.ts` (server-side) via Zod — UI shows client-side hints only
- Never trust client-provided user IDs — always derive from `auth.uid()` server-side
- API keys (Twelve Data, FRED, CoinGecko) must stay in `process.env` — never in client bundles
- Encrypt sensitive user data (API keys stored by users) at rest using Supabase vault or pgcrypto
- Sanitize all user input rendered in the UI to prevent XSS
