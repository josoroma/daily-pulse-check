---
paths:
  - "app/**/__tests__/**"
  - "app/**/*.test.ts"
  - "lib/**/__tests__/**"
  - "lib/**/*.test.ts"
---

# Testing Rules

- Use Vitest — never Jest
- Test pure logic functions: calculations, validators, parsers, evaluators
- Do not mock Supabase or external APIs in unit tests — isolate pure functions
- Test files colocated in `__tests__/` within each route segment or `lib/` module
- Test file naming mirrors the `_` file: `_schema.test.ts`, `_actions.test.ts`, `_utils.test.ts`
- Each test must have a descriptive name: `it('calculates unrealized P&L as current minus cost basis')`
- Test edge cases: zero values, negative inputs, empty arrays, missing fields
- Zod schema tests: validate both passing and failing cases with specific error messages
