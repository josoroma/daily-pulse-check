# I built a Spec-Driven harness for Claude Code — here is what changed

We've all seen the demo: an AI agent ships a feature in 30 seconds. We've also all seen the next morning — file in the wrong folder, migration with no RLS, dates in UTC instead of Costa Rica time, no test. Prompting harder doesn't fix it. The fix is a small spec-driven harness that loads automatically and enforces the same rules every time.

After shipping a personal finance dashboard with Claude Code (Next.js 16.2.1, TypeScript strict, Supabase, Vercel AI SDK), I converged on five files: a numbered SPECS.md (Epics → User Stories → Tasks with Gherkin acceptance criteria), a CLAUDE.md the agent reads every session, path-scoped .claude/rules/ auto-loaded when matching files are edited, named .claude/skills/ that own multi-step workflows, and read-only .claude/agents/ that plan, review and document with restricted tools and a fresh context.

The workhorse is /implement-item US-4.1: it reads the SPECS section, marks the task in-progress, writes the code under the route contract, runs lint and tests, walks every Gherkin scenario citing a file:LN for each Then clause, marks it done, recomputes the Progress Summary and proposes a Conventional Commit. Read-only agents (plan-item, review-item, document-feature) write timestamped docs with a severity ladder — every finding cited as path/file.ts:LN. Husky hooks (pre-commit, commit-msg, pre-push) make sure nothing ambiguous reaches main.

It maps cleanly to Azure DevOps: SPECS Epic to ADO Epic, User Story to User Story, Task to Task, Gherkin to Acceptance Criteria, status markers to State, review-item doc to PR review attachment. Before the harness I re-explained conventions every session, PRs needed heavy cleanup, acceptance criteria drifted. After: conventions auto-load by file path, the agent picks up US-4.5, plans, ships, validates Gherkin, suggests a commit — every change traces to a numbered spec and a code citation.

You don't need a bigger model. You need a sharper contract — a numbered backlog with Gherkin, a conventions file, path-scoped rules, named skills, read-only agents, and git hooks that refuse anything ambiguous. If you build with Claude Code, Cursor or any agentic IDE, write your SPECS.md first, then the rules that protect it. The model will meet you there.

#AI #SoftwareEngineering #ClaudeCode #SpecDrivenDevelopment #NextJS #TypeScript #DeveloperProductivity #LLM #AgenticAI
