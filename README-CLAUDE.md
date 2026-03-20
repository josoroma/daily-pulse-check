# Claude Code Configuration Guide

> Complete reference for `CLAUDE.md` files, skills, hooks, plugins, and agents.
>
> **Source**: [code.claude.com/docs](https://code.claude.com/docs/en/overview)

---

## Table of Contents

- [1. CLAUDE.md Files](#1-claudemd-files)
- [2. Auto Memory](#2-auto-memory)
- [3. Rules (`.claude/rules/`)](#3-rules-clauderules)
- [4. Skills](#4-skills)
- [5. Hooks](#5-hooks)
- [6. Plugins](#6-plugins)
- [7. Subagents (Agents)](#7-subagents-agents)

---

## 1. CLAUDE.md Files

`CLAUDE.md` files give Claude **persistent instructions** for a project, personal workflow, or organization. They are plain Markdown loaded into context at the start of every session.

### Where to Place CLAUDE.md Files

| Location | Scope | Shared? |
|---|---|---|
| `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | **Managed policy** — organization-wide | Deployed by IT/DevOps |
| `./CLAUDE.md` or `./.claude/CLAUDE.md` | **Project** — team-shared | Yes, via source control |
| `~/.claude/CLAUDE.md` | **User** — personal preferences | No, local to your machine |
| `<subdirectory>/CLAUDE.md` | **Subdirectory** — loaded on demand | Yes, via source control |

**Resolution order**: More specific locations take precedence over broader ones. Files in the directory hierarchy *above* the working directory load in full at launch. Files in *subdirectories* load on demand when Claude reads files in those directories.

### Writing Effective Instructions

- **Size**: Target **under 200 lines** per file. Longer files consume more context and reduce adherence.
- **Structure**: Use Markdown headers and bullets to group related instructions.
- **Specificity**: Write concrete, verifiable instructions:
  - ✅ `"Use 2-space indentation"`
  - ❌ `"Format code properly"`
  - ✅ `"Run npm test before committing"`
  - ❌ `"Test your changes"`
  - ✅ `"API handlers live in src/api/handlers/"`
  - ❌ `"Keep files organized"`
- **Consistency**: Remove outdated or conflicting instructions. If two rules contradict, Claude may pick one arbitrarily.

### Importing Additional Files

Use `@path/to/import` syntax to pull in external files:

```markdown
See @README for project overview and @package.json for available npm commands.

# Additional Instructions
- Git workflow: @docs/git-instructions.md

# Personal Preferences (not checked in)
- @~/.claude/my-project-instructions.md
```

- Both relative and absolute paths are supported.
- Relative paths resolve relative to the file containing the import.
- Max import depth: **5 hops**.
- First time external imports are encountered, an **approval dialog** is shown.

### Generating CLAUDE.md Automatically

Run `/init` to auto-generate a starting `CLAUDE.md`. Claude analyzes your codebase and creates a file with build commands, test instructions, and project conventions.

Set `CLAUDE_CODE_NEW_INIT=true` to enable an interactive multi-phase flow where `/init` asks which artifacts to set up (CLAUDE.md files, skills, hooks), explores via a subagent, and presents a reviewable proposal.

### Excluding CLAUDE.md Files (Monorepos)

Add `claudeMdExcludes` to `.claude/settings.local.json`:

```json
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/home/user/monorepo/other-team/.claude/rules/**"
  ]
}
```

### CLAUDE.md for Large Teams

Deploy organization-wide via managed policy locations:

| OS | Path |
|---|---|
| macOS | `/Library/Application Support/ClaudeCode/CLAUDE.md` |
| Linux / WSL | `/etc/claude-code/CLAUDE.md` |
| Windows | `C:\Program Files\ClaudeCode\CLAUDE.md` |

Managed policy files **cannot** be excluded by individual settings.

---

## 2. Auto Memory

Auto memory lets Claude accumulate knowledge across sessions **without you writing anything**. Claude saves notes for itself: build commands, debugging insights, architecture notes, code style preferences.

### Configuration

- Enabled by default. Toggle via `/memory` or:
  ```json
  { "autoMemoryEnabled": false }
  ```
- Or set `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`.

### Storage

Each project gets its own memory at `~/.claude/projects/<project>/memory/`:

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # Concise index, loaded every session (first 200 lines)
├── debugging.md       # Detailed notes on debugging patterns
├── api-conventions.md # API design decisions
└── ...
```

- `MEMORY.md` acts as an index. Content beyond line 200 is **not** loaded at session start.
- Topic files (e.g., `debugging.md`) are read on demand.
- Auto memory is **machine-local**; not shared across machines.

### Managing Memory

- Run `/memory` to browse, open, and edit memory files.
- Ask Claude to remember things: *"always use pnpm, not npm"* — saved to auto memory.
- Ask Claude to add to CLAUDE.md directly: *"add this to CLAUDE.md"*.

---

## 3. Rules (`.claude/rules/`)

For larger projects, organize instructions into modular files under `.claude/rules/`. Rules are modular, easier to maintain, and can be scoped to specific file paths.

### Setup

```
your-project/
├── .claude/
│   ├── CLAUDE.md           # Main project instructions
│   └── rules/
│       ├── code-style.md   # Code style guidelines
│       ├── testing.md      # Testing conventions
│       └── security.md     # Security requirements
```

All `.md` files are discovered recursively. Rules **without** `paths` frontmatter load at launch like `.claude/CLAUDE.md`.

### Path-Specific Rules

Scope rules to specific files using YAML frontmatter:

```yaml
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- All API endpoints must include input validation
- Use the standard error response format
- Include OpenAPI documentation comments
```

Glob pattern examples:

| Pattern | Matches |
|---|---|
| `**/*.ts` | All TypeScript files |
| `src/**/*` | All files under `src/` |
| `*.md` | Markdown files in project root |
| `src/components/*.tsx` | React components in a specific directory |

Multiple patterns with brace expansion:

```yaml
---
paths:
  - "src/**/*.{ts,tsx}"
  - "lib/**/*.ts"
  - "tests/**/*.test.ts"
---
```

### User-Level Rules

Personal rules in `~/.claude/rules/` apply to **every project**:

```
~/.claude/rules/
├── preferences.md    # Personal coding preferences
└── workflows.md      # Preferred workflows
```

User-level rules load before project rules (project rules have higher priority).

### Symlinks for Shared Rules

```bash
ln -s ~/shared-claude-rules .claude/rules/shared
ln -s ~/company-standards/security.md .claude/rules/security.md
```

---

## 4. Skills

Skills extend what Claude can do. A `SKILL.md` file with instructions adds capabilities to Claude's toolkit. Claude uses skills when relevant, or you invoke one with `/skill-name`.

> Skills follow the [Agent Skills](https://agentskills.io/) open standard.

### Where Skills Live

| Level | Location | Availability |
|---|---|---|
| Enterprise | Managed settings | All users in organization |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<skill-name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

Priority: **enterprise > personal > project**. Plugin skills use `plugin-name:skill-name` namespace.

### Skill Directory Structure

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template for Claude to fill in
├── examples/
│   └── sample.md      # Example output showing expected format
└── scripts/
    └── validate.sh    # Script Claude can execute
```

### Creating a Skill

```bash
mkdir -p ~/.claude/skills/explain-code
```

Create `~/.claude/skills/explain-code/SKILL.md`:

```yaml
---
name: explain-code
description: Explains code with visual diagrams and analogies. Use when explaining how code works.
---

When explaining code, always include:

1. **Start with an analogy**: Compare the code to something from everyday life
2. **Draw a diagram**: Use ASCII art to show the flow
3. **Walk through the code**: Explain step-by-step
4. **Highlight a gotcha**: What's a common mistake?
```

### Frontmatter Reference

```yaml
---
name: my-skill
description: What this skill does
disable-model-invocation: true
allowed-tools: Read, Grep
model: opus
context: fork
agent: Explore
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

| Field | Required | Description |
|---|---|---|
| `name` | No | Display name (lowercase, hyphens, max 64 chars). Defaults to directory name |
| `description` | Recommended | What the skill does. Claude uses this to decide when to load it |
| `argument-hint` | No | Hint for autocomplete, e.g., `[issue-number]` |
| `disable-model-invocation` | No | `true` = only manual `/name` invocation. Default: `false` |
| `user-invocable` | No | `false` = hidden from `/` menu. Default: `true` |
| `allowed-tools` | No | Tools allowed without permission when skill is active |
| `model` | No | Model to use when skill is active |
| `context` | No | `fork` = run in a forked subagent context |
| `agent` | No | Subagent type to use with `context: fork` |
| `hooks` | No | Hooks scoped to this skill's lifecycle |

### String Substitutions

| Variable | Description |
|---|---|
| `$ARGUMENTS` | All arguments passed when invoking the skill |
| `$ARGUMENTS[N]` / `$N` | Specific argument by 0-based index |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Directory containing the skill's `SKILL.md` |

### Dynamic Context Injection

Use `!`command`` to run shell commands before skill content is sent to Claude:

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

### Bundled Skills

| Command | Description |
|---|---|
| `/batch <instruction>` | Orchestrate large-scale changes across a codebase in parallel |
| `/claude-api` | Load Claude API reference for your project's language |
| `/debug [description]` | Troubleshoot current session by reading debug log |
| `/loop [interval] <prompt>` | Run a prompt repeatedly on an interval |
| `/simplify [focus]` | Review recently changed files for code reuse and quality |

### Invocation Control

| Setting | You invoke? | Claude invokes? |
|---|---|---|
| *(default)* | Yes | Yes |
| `disable-model-invocation: true` | Yes | **No** |
| `user-invocable: false` | **No** | Yes |

---

## 5. Hooks

Hooks are user-defined shell commands, HTTP endpoints, LLM prompts, or agents that execute automatically at specific points in Claude Code's lifecycle.

### Hook Lifecycle Events

| Event | When It Fires | Can Block? |
|---|---|---|
| `SessionStart` | Session begins or resumes | No |
| `UserPromptSubmit` | You submit a prompt, before Claude processes it | Yes |
| `PreToolUse` | Before a tool call executes | Yes |
| `PermissionRequest` | Permission dialog appears | Yes |
| `PostToolUse` | After a tool call succeeds | No (feedback only) |
| `PostToolUseFailure` | After a tool call fails | No (feedback only) |
| `Notification` | Claude Code sends a notification | No |
| `SubagentStart` | Subagent is spawned | No |
| `SubagentStop` | Subagent finishes | Yes |
| `Stop` | Claude finishes responding | Yes |
| `TeammateIdle` | Agent team teammate about to go idle | Yes |
| `TaskCompleted` | Task being marked as completed | Yes |
| `InstructionsLoaded` | CLAUDE.md or rule file loaded into context | No |
| `ConfigChange` | Configuration file changes during session | Yes |
| `WorktreeCreate` | Worktree being created | Yes |
| `WorktreeRemove` | Worktree being removed | No |
| `PreCompact` | Before context compaction | No |
| `PostCompact` | After compaction completes | No |
| `Elicitation` | MCP server requests user input | Yes |
| `ElicitationResult` | User responds to MCP elicitation | Yes |
| `SessionEnd` | Session terminates | No |

### Configuration Structure

Hooks are defined in JSON settings files with three levels of nesting:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-rm.sh"
          }
        ]
      }
    ]
  }
}
```

### Hook Locations

| File | Scope | Shared? |
|---|---|---|
| `~/.claude/settings.json` | All your projects | No, local |
| `.claude/settings.json` | Single project | Yes, committable |
| `.claude/settings.local.json` | Single project | No, gitignored |
| Managed policy settings | Organization-wide | Yes, admin-controlled |
| Plugin `hooks/hooks.json` | When plugin is enabled | Yes, bundled |
| Skill/agent frontmatter | While component is active | Yes, in component file |

### Hook Handler Types

| Type | Description |
|---|---|
| `command` | Run a shell command. Receives JSON on stdin, returns via exit codes + stdout |
| `http` | POST to a URL. Request body = hook JSON. Response = same JSON output format |
| `prompt` | Single-turn LLM evaluation. Returns `{"ok": true/false, "reason": "..."}` |
| `agent` | Multi-turn agentic verifier with tool access (Read, Grep, Glob) |

### Example: Block Destructive Commands

```bash
#!/bin/bash
# .claude/hooks/block-rm.sh
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked by hook"
    }
  }'
else
  exit 0  # allow the command
fi
```

### Exit Code Behavior

| Exit Code | Meaning |
|---|---|
| `0` | **Success** — stdout parsed for JSON output |
| `2` | **Blocking error** — stderr fed back to Claude. Effect depends on event |
| Other | **Non-blocking error** — stderr shown in verbose mode, execution continues |

### PreToolUse Decision Control

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Approved by hook",
    "updatedInput": { "field_to_modify": "new value" },
    "additionalContext": "Current environment: production."
  }
}
```

| Field | Values |
|---|---|
| `permissionDecision` | `"allow"`, `"deny"`, `"ask"` |
| `permissionDecisionReason` | Explanation text |
| `updatedInput` | Modify tool input before execution |
| `additionalContext` | Inject context for Claude |

### Prompt-Based Hooks

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Evaluate if Claude should stop: $ARGUMENTS. Check if all tasks are complete.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

The LLM must respond with: `{"ok": true}` or `{"ok": false, "reason": "..."}`.

### Agent-Based Hooks

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verify that all unit tests pass. Run the test suite and check the results. $ARGUMENTS",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

Agent hooks spawn a subagent with Read, Grep, Glob tools for up to 50 turns.

### Async Hooks

Add `"async": true` to command hooks to run in the background:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/run-tests.sh",
            "async": true,
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

Async hooks **cannot** block tool calls or return decisions.

### SessionStart: Persist Environment Variables

```bash
#!/bin/bash
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
  echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

`CLAUDE_ENV_FILE` is only available in `SessionStart` hooks.

### Debugging Hooks

Run `claude --debug` to see execution details. Toggle verbose mode with `Ctrl+O`. Use `/hooks` for a read-only browser of all configured hooks.

---

## 6. Plugins

Plugins are self-contained directories that extend Claude Code with skills, agents, hooks, MCP servers, and LSP servers. They can be shared across projects and teams via marketplaces.

### When to Use Plugins vs Standalone

| Approach | Invocation | Best For |
|---|---|---|
| Standalone (`.claude/`) | `/hello` | Personal workflows, project-specific, experiments |
| Plugin | `/plugin-name:hello` | Sharing, versioned releases, reusable across projects |

### Plugin Directory Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json           # Manifest (optional)
├── commands/                  # Legacy skill markdown files
├── agents/                    # Subagent markdown files
├── skills/                    # Agent Skills with SKILL.md
│   └── code-reviewer/
│       └── SKILL.md
├── hooks/
│   └── hooks.json             # Hook configuration
├── settings.json              # Default settings (agent key)
├── .mcp.json                  # MCP server definitions
├── .lsp.json                  # LSP server configurations
├── scripts/                   # Hook and utility scripts
└── CHANGELOG.md
```

> **Warning**: Only `plugin.json` goes inside `.claude-plugin/`. All other directories must be at the **plugin root**.

### Plugin Manifest (`plugin.json`)

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Brief plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com"
  },
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "skills": "./custom/skills/",
  "agents": "./custom/agents/",
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "lspServers": "./.lsp.json"
}
```

Only `name` is required if you include a manifest. If omitted entirely, Claude Code auto-discovers components from default locations.

### Installation Scopes

| Scope | Settings File | Purpose |
|---|---|---|
| `user` | `~/.claude/settings.json` | Personal, all projects (default) |
| `project` | `.claude/settings.json` | Team-shared via version control |
| `local` | `.claude/settings.local.json` | Project-specific, gitignored |
| `managed` | Managed settings | Organization-wide (read-only) |

### CLI Commands

```bash
# Install
claude plugin install formatter@my-marketplace
claude plugin install formatter@my-marketplace --scope project

# Uninstall
claude plugin uninstall my-plugin

# Enable/Disable
claude plugin enable my-plugin
claude plugin disable my-plugin

# Update
claude plugin update my-plugin

# Test locally during development
claude --plugin-dir ./my-plugin
```

### Plugin Hooks Configuration

Create `hooks/hooks.json` in your plugin:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format-code.sh"
          }
        ]
      }
    ]
  }
}
```

Use `${CLAUDE_PLUGIN_ROOT}` for all paths within plugin hooks and scripts.

### Plugin MCP Servers

Add `.mcp.json` at plugin root:

```json
{
  "mcpServers": {
    "plugin-database": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"]
    }
  }
}
```

### Plugin LSP Servers

Add `.lsp.json` at plugin root for code intelligence:

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": {
      ".go": "go"
    }
  }
}
```

---

## 7. Subagents (Agents)

Subagents are specialized AI assistants that handle specific tasks. Each runs in its own context window with a custom system prompt, specific tool access, and independent permissions.

### Built-In Subagents

| Agent | Model | Tools | Purpose |
|---|---|---|---|
| **Explore** | Haiku (fast) | Read-only | File discovery, code search, codebase exploration |
| **Plan** | (varies) | Read-only | Planning and analysis |
| **General-purpose** | (varies) | All inherited | General task delegation |

### Where Agents Live

| Location | Scope | Priority |
|---|---|---|
| `--agents` CLI flag | Current session only | 1 (highest) |
| `.claude/agents/` | Current project | 2 |
| `~/.claude/agents/` | All your projects | 3 |
| Plugin `agents/` directory | Where plugin is enabled | 4 (lowest) |

### Creating an Agent File

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: opus
---

You are a code reviewer. When invoked, analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

The frontmatter defines metadata/configuration. The body becomes the **system prompt**.

### Supported Frontmatter Fields

| Field | Required | Description |
|---|---|---|
| `name` | **Yes** | Unique ID (lowercase letters and hyphens) |
| `description` | **Yes** | When Claude should delegate to this subagent |
| `tools` | No | Tool allowlist. Inherits all if omitted |
| `disallowedTools` | No | Tools to deny (removed from inherited list) |
| `model` | No | `sonnet`, `opus`, `haiku`, full ID, or `inherit` (default) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before stop |
| `skills` | No | Skills to preload into subagent's context at startup |
| `mcpServers` | No | MCP servers available to this subagent |
| `hooks` | No | Lifecycle hooks scoped to this subagent |
| `memory` | No | Persistent memory: `user`, `project`, or `local` |
| `background` | No | `true` = always run as background task |
| `isolation` | No | `worktree` = run in temporary git worktree |

### CLI-Defined Agents

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on code quality and security.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  },
  "debugger": {
    "description": "Debugging specialist for errors and test failures.",
    "prompt": "You are an expert debugger. Analyze errors and provide fixes."
  }
}'
```

### Restricting Subagent Spawning

```yaml
---
name: coordinator
description: Coordinates work across specialized agents
tools: Agent(worker, researcher), Read, Bash
---
```

Only `worker` and `researcher` can be spawned. Omit `Agent` entirely to block all subagent spawning.

### Scoping MCP Servers to a Subagent

```yaml
---
name: browser-tester
description: Tests features in a real browser using Playwright
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github
---
```

### Persistent Memory for Subagents

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
memory: user
---

You are a code reviewer. As you review code, update your agent memory with
patterns, conventions, and recurring issues you discover.
```

| Scope | Storage Location | Use When |
|---|---|---|
| `user` | `~/.claude/agent-memory/<name>/` | Learnings across all projects |
| `project` | `.claude/agent-memory/<name>/` | Project-specific, shareable |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific, not checked in |

### Hooks in Subagent Frontmatter

```yaml
---
name: db-reader
description: Execute read-only database queries
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
---
```

### Example: Code Reviewer Agent

```yaml
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code for quality, security, and maintainability.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer ensuring high standards of code quality and security.

When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Begin review immediately

Review checklist:
- Code is clear and readable
- Functions and variables are well-named
- No duplicated code
- Proper error handling
- No exposed secrets or API keys
- Input validation implemented
- Good test coverage
- Performance considerations addressed

Provide feedback organized by priority:
- **Critical issues** (must fix)
- **Warnings** (should fix)
- **Suggestions** (consider improving)
```

### Example: Debugger Agent

```yaml
---
name: debugger
description: Debugging specialist for errors, test failures, and unexpected behavior.
tools: Read, Edit, Bash, Grep, Glob
---

You are an expert debugger specializing in root cause analysis.

When invoked:
1. Capture error message and stack trace
2. Identify reproduction steps
3. Isolate the failure location
4. Implement minimal fix
5. Verify solution works

For each issue, provide:
- Root cause explanation
- Evidence supporting the diagnosis
- Specific code fix
- Testing approach
- Prevention recommendations
```

### Foreground vs Background Subagents

- **Foreground**: Blocks main conversation. Permission prompts pass through to you.
- **Background**: Runs concurrently. Permissions are pre-approved at launch; unapproved tool calls auto-deny.

Press `Ctrl+B` to background a running task. Set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` to disable.

### Disabling Specific Subagents

```json
{
  "permissions": {
    "deny": ["Agent(Explore)", "Agent(my-custom-agent)"]
  }
}
```

---

## Quick Reference: File Layout

```
your-project/
├── CLAUDE.md                          # Project instructions (loaded every session)
├── .claude/
│   ├── CLAUDE.md                      # Alternative project instructions location
│   ├── settings.json                  # Project settings (shared)
│   ├── settings.local.json            # Local settings (gitignored)
│   ├── rules/
│   │   ├── code-style.md              # Always-loaded rule
│   │   ├── testing.md                 # Always-loaded rule
│   │   └── api-design.md              # Path-scoped rule (with `paths:` frontmatter)
│   ├── skills/
│   │   └── deploy/
│   │       ├── SKILL.md               # Skill definition
│   │       └── scripts/
│   │           └── deploy.sh
│   └── agents/
│       ├── code-reviewer.md           # Project-level subagent
│       └── debugger.md                # Project-level subagent
├── ~/.claude/
│   ├── CLAUDE.md                      # User-level instructions (all projects)
│   ├── settings.json                  # User settings
│   ├── rules/                         # User-level rules (all projects)
│   ├── skills/                        # User-level skills (all projects)
│   ├── agents/                        # User-level subagents (all projects)
│   └── projects/<project>/memory/     # Auto memory storage
│       └── MEMORY.md
└── my-plugin/                         # Plugin (distributable)
    ├── .claude-plugin/
    │   └── plugin.json
    ├── skills/
    ├── agents/
    ├── hooks/
    │   └── hooks.json
    ├── .mcp.json
    └── scripts/
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Claude isn't following CLAUDE.md | Run `/memory` to verify files are loaded. Make instructions more specific. Check for conflicts. |
| CLAUDE.md is too large | Keep under 200 lines. Move details to `@path` imports or `.claude/rules/` files. |
| Instructions lost after `/compact` | CLAUDE.md survives compaction. If instruction disappeared, it was only in conversation — add to CLAUDE.md. |
| Skill not triggering | Check description includes matching keywords. Verify with `What skills are available?`. Try `/skill-name` directly. |
| Skill triggers too often | Make description more specific. Add `disable-model-invocation: true`. |
| Hook not firing | Run `claude --debug`. Check script is executable (`chmod +x`). Verify matcher pattern. |
| Plugin not loading | Run `claude plugin validate`. Ensure components at plugin root, not inside `.claude-plugin/`. |

---

## Official Docs

- [Memory (CLAUDE.md)](https://code.claude.com/docs/en/memory)
- [Skills](https://code.claude.com/docs/en/skills)
- [Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [Plugins](https://code.claude.com/docs/en/plugins)
- [Plugins Reference](https://code.claude.com/docs/en/plugins-reference)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Settings](https://code.claude.com/docs/en/settings)
