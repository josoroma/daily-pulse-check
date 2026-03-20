---
name: review-item
description: Code review an epic or user story against CLAUDE.md conventions and SPECS.md acceptance criteria. Read-only — never modifies files. Use after implementing an epic (E1) or user story (US-1.1).
argument-hint: <epic-or-story-id e.g. "E1" or "US-1.1">
context: fork
agent: code-reviewer
---

# Review Item: $ARGUMENTS

You are a senior code reviewer auditing the implementation of `$ARGUMENTS` in the Finance Dashboard project.

## Context

Read these files first:
- @SPECS.md — acceptance criteria and task definitions
- @CLAUDE.md — project conventions and colocated architecture
- @.claude/README-ARCHITECTURE.md — route segment contract and naming rules

## Review Scope

Find `$ARGUMENTS` in SPECS.md. Identify all tasks marked `[x]` or `[~]` and the files they affect. Review every file created or modified for that item.

## Review Checklist

### 1. SPECS Compliance

For each Gherkin scenario in the reviewed item:

```
✅ | ❌  Scenario: [name]
   Given → [satisfied? how?]
   When  → [satisfied? how?]
   Then  → [satisfied? how?]
```

Flag any scenario not fully satisfied.

### 2. Convention Compliance (CLAUDE.md)

Check each file against project conventions:

- [ ] TypeScript strict — no `any`, no `@ts-ignore`, no `as unknown as`
- [ ] Path aliases — uses `@/` imports, no deep relative paths
- [ ] File naming — underscore prefix for route modules (`_actions.ts`, `_schema.ts`), kebab-case for components
- [ ] Named exports — no `export default` except `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`
- [ ] Colocated structure — route-specific logic in the route folder, shared code in `lib/` only for 3+ routes
- [ ] Server vs Client — `'use client'` only where necessary
- [ ] Zod schemas — in `_schema.ts`, validated in `_actions.ts` server-side
- [ ] RLS policies — all tables have row-level security
- [ ] No exposed secrets — API keys only in `process.env` server-side

### 3. Code Quality

- [ ] No duplicated logic — shared utilities for repeated patterns
- [ ] Error handling — API calls have try/catch, user-facing error messages
- [ ] Loading states — async operations have loading indicators
- [ ] Empty states — lists and tables handle zero-item case
- [ ] Type safety — return types on functions, typed props, no implicit `any`

### 4. Security Audit

- [ ] User IDs derived from `auth.uid()` — never from client input
- [ ] Input validation before database writes
- [ ] No XSS vectors — user content sanitized before render
- [ ] API routes protected — auth check on protected endpoints
- [ ] Sensitive data not logged or exposed in responses

### 5. Test Coverage

- [ ] Pure logic functions have unit tests
- [ ] Zod schemas have validation tests (valid + invalid cases)
- [ ] Calculation functions tested with edge cases
- [ ] Tests pass: `npm test`

### 6. SPECS.md Consistency

- [ ] Task status markers match actual state (completed tasks have `[x]`)
- [ ] Progress Summary table counts are accurate
- [ ] No orphaned tasks (completed in SPECS but code not present)

## Output Format

```markdown
# Code Review: [Item ID] — [Title]

## Overall Verdict: ✅ PASS | ⚠️ PASS WITH NOTES | ❌ NEEDS CHANGES

## Gherkin Compliance
[Scenario-by-scenario results]

## Convention Issues
[List of violations with file:line references]

## Code Quality Notes
[Observations and suggestions]

## Security Findings
[Any security concerns — critical items first]

## Test Coverage
[What's tested, what's missing]

## SPECS.md Accuracy
[Status marker correctness]

## Summary
[1-paragraph overall assessment]
```

**IMPORTANT: This review is read-only. Do NOT modify any files.**
