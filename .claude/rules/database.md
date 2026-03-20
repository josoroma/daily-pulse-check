---
paths:
  - "supabase/migrations/**"
  - "lib/supabase/**"
  - "app/**/_schema.ts"
---

# Database & Schema Rules

## Migrations (`supabase/migrations/`)

- Never modify an existing migration — always create a new one
- Every migration that creates a table must include RLS policies in the same file
- RLS policies must restrict all operations (SELECT, INSERT, UPDATE, DELETE) to `auth.uid() = user_id`
- After adding or changing migrations, regenerate types: `supabase gen types typescript --local > lib/supabase/database.types.ts`
- Migration filenames follow Supabase convention: `<timestamp>_<description>.sql`
- Include `NOT NULL` constraints and sensible defaults — don't leave columns implicitly nullable

## Zod Schemas (`_schema.ts`)

- Separate Create vs Update schemas: `CreatePositionSchema` (all required fields) vs `UpdatePositionSchema` (partial fields)
- Zod schemas validate **inputs** (form data, action payloads) — they are NOT 1:1 copies of database rows
- Never include `id`, `user_id`, `created_at`, `updated_at` in Create schemas — these are set server-side
- Update schemas should use `.partial()` for optional fields but keep `id` required
- Export both the schema and inferred type: `export const CreatePositionSchema = z.object({...})` + `export type CreatePosition = z.infer<typeof CreatePositionSchema>`

## Generated Types (`lib/supabase/database.types.ts`)

- This file is auto-generated — never edit it manually
- Import DB row types from here when you need the full row shape (e.g., for query results)
- Use Zod schemas (not DB types) for validating user input in `_actions.ts`
