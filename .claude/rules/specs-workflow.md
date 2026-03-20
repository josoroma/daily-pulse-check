---
paths:
  - "SPECS.md"
  - "CLAUDE.md"
---

# SPECS Workflow Rules

- SPECS.md is the single source of truth for project scope and progress
- Never add features, stories, or tasks not defined in SPECS.md without explicit approval
- Reference items by their ID: `E1`, `US-1.1`, `T-1.1.1`
- Status markers: `[ ]` todo, `[~]` in progress, `[x]` completed, `[!]` blocked
- When changing task statuses, also update the Progress Summary table counts
- A user story is complete only when ALL its tasks are done AND Gherkin scenarios pass
- When implementing, follow the task order within each story — earlier tasks are dependencies
- Always read the Gherkin scenarios before implementing — they are the acceptance criteria
