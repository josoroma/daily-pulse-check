---
paths:
  - "app/**/*.{ts,tsx}"
  - "lib/**/*.{ts,tsx}"
---

# Code Style Rules

- 2-space indentation, single quotes, trailing commas, no semicolons
- Named exports only — `export default` allowed only for `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`
- Always use `@/` path alias — `@/app/...`, `@/lib/...` — never relative imports up more than one level
- Route module files: underscore prefix — `_actions.ts`, `_schema.ts`, `_hooks.ts`, `_atoms.ts`, `_types.ts`, `_utils.ts`, `_constants.ts`
- Component folder: `_components/` — kebab-case files, PascalCase component names
- One component per file — file name matches the primary export
- Prefer `const` arrow functions for components: `export const MyComponent = () => {}`
- Destructure props in function signature
- Colocate types with their route — only extract to `lib/` if used by 3+ routes
- Schema exports: `export const <Name>Schema = z.object({...})` + `export type <Name> = z.infer<typeof <Name>Schema>`
- Action exports: `export async function <verbNoun>(...)` — e.g., `createPosition`, `updateProfile`
