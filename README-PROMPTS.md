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
