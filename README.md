<div align="center">

# docs-subagents

**11 pinned AI agents that keep your docs in sync with your code, bootstrap new docs from a URL, and run a recurring analytics pipeline that produces machine-readable insight reports.**

[![npm version](https://badge.fury.io/js/docs-subagents.svg)](https://www.npmjs.com/package/docs-subagents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docsbook](https://img.shields.io/badge/Powered%20by-Docsbook-blue.svg)](https://docsbook.io)

[Installation](#install) • [Pipelines](#pipelines) • [Agent Reference](#agent-reference) • [Manual Wiring](#adding-the-missing-pieces-by-hand) • [vs docs-skills](#subagent-vs-skill)

</div>

---

## The Problem

> "I pushed a refactored auth module. Three weeks later, a user filed a bug: the docs still showed the old API. The code and docs had drifted — silently."

Documentation rot is inevitable when code and docs live in separate mental contexts. No one remembers to update the `rate-limit.md` after refactoring the rate limiter. No one re-reads every doc after a big merge.

The result: outdated docs that erode user trust and waste support time.

---

## The Solution

`docs-subagents` ships **11 purpose-built AI agents** organized into three pipelines:

- **Drift-detection pipeline** — watches your `git diff`, finds affected doc pages, patches them in an isolated worktree, and produces a conflict-free commit.
- **Workspace creation pipeline** — crawls your product site, publishes a GitHub repo, and configures a [Docsbook](https://docsbook.io) workspace — fully branded and AI-ready.
- **Insights pipeline** — pulls analytics from the Docsbook MCP on a schedule, clusters the signal, and writes schema-validated JSON reports that downstream actor agents consume to drive PRs, Issues, or AI-chat tuning.

Each agent is pinned to the right model for its job (Haiku for fast lookup, Sonnet for editing) and carries an explicit tool allowlist. No surprises, no scope creep.

---

## Features

✅ **Model pinning** — Haiku for cheap fan-out, Sonnet for editing; costs stay predictable  
✅ **Isolated edits** — `docs-editor` works in a fresh `git worktree`, never touches your working tree  
✅ **Conflict resolution** — `docs-curator` merges parallel patches and drops speculative changes  
✅ **MCP-powered search** — `docs-searcher` uses `doc_search_*` LSP tools when `markdown-lsp` is present  
✅ **Graceful fallback** — works without MCP (falls back to `Grep`/`Read`), just with lower recall  
✅ **Multi-editor support** — install for Claude Code, Cursor, Codex, or Copilot  
✅ **Global or per-project** — `--global` puts agents in `~/.claude/agents/` for every project  

---

## Subagent vs Skill

These two packages live side by side — they solve different problems.

| Concept | Analogy | Lives in | Reusable? |
|---|---|---|---|
| **Skill** | QA Checklist — describes workflow & guardrails | [docs-skills](https://github.com/Docsbook-io/docs-skills) | Yes — any project |
| **Subagent** | Jira ticket — concrete model, pinned tools, one goal | this package | No — runs and done |

**Rule of thumb:** "Would I want this in another project tomorrow?" → Yes = skill. No = subagent.

---

## When to Use Which

| I want… | Use |
|---|---|
| Full pre-push drift workflow, one command, no manual wiring | [docs-claude-plugins](https://github.com/Docsbook-io/docs-claude-plugins) |
| Recurring analytics with schedule + Slack notifications, one setup wizard | [docs-claude-plugins](https://github.com/Docsbook-io/docs-claude-plugins) (`docs-insights` plugin) |
| Just the subagent files, manual invocation or custom pipeline | **docs-subagents** (this package) |
| Agents for Cursor / Codex / Copilot (not Claude Code) | **docs-subagents** — the plugin is Claude Code only |

### Standalone vs plugin versions

The same subagent name (e.g. `docs-planner`, `analytics-collector`) ships **both** here as a standalone `.md` file and inside the matching plugin in [docs-claude-plugins](https://github.com/Docsbook-io/docs-claude-plugins). The two versions are **intentionally not byte-identical**:

|  | Standalone (this package) | Plugin version |
|---|---|---|
| **Audience** | Users who invoke agents manually or build their own orchestrator | Users running the plugin's bundled commands (`/docs-sync`, `/docs-insights`, …) |
| **Prompt scope** | Minimal — no references to plugin commands or config files | Richer — may reference `.docsbook/insights/.config.json`, `/docs-insights-setup`, plugin-bundled MCP |
| **Modes** | Single primary mode (the most common one) | May ship extra modes (e.g. `docs-planner` plugin version has both diff mode and intent mode) |
| **Stability** | Treat the input/output contract as a stable API | Evolves with the plugin's feature surface |
| **Release cadence** | npm `docs-subagents` package | Plugin version in `docs-claude-plugins` |

What is **always shared** between the two versions of the same subagent:

- The agent `name` in the YAML frontmatter.
- The first-line output contract (e.g. `WROTE: <path>`, `CLUSTERED: <path>`, `REPORT_JSON: <path>`).
- The slice / mode vocabulary (e.g. `utm`, `engagement`, `funnel`, …).

This lets you swap one for the other within a pipeline without breaking anything. If both end up in `.claude/agents/` (e.g. you ran both `/plugin install` and `npx docs-subagents install`), the second install will back up the first — keep the version that matches how you actually invoke them.

---

## Install

```bash
npx docs-subagents install              # project: .claude/agents/
npx docs-subagents install --global     # user:    ~/.claude/agents/
npx docs-subagents install --dry-run    # preview, no writes
npx docs-subagents install --force      # overwrite without backup
npx docs-subagents list                 # print bundled agent names
```

After install, restart is **not** required — `/agents` in Claude Code lists all 7 immediately.

### What gets installed

```
.claude/agents/
├── docs-planner.md                   (Haiku)   — drift pipeline
├── docs-searcher.md                  (Haiku)
├── docs-editor.md                    (Sonnet)
├── docs-curator.md                   (Sonnet)
├── docs-site-crawler.md              (Haiku)   — workspace creation
├── docs-publisher.md                 (Haiku)
├── docs-workspace-configurator.md    (Sonnet)
├── analytics-collector.md            (Haiku)   — insights pipeline
├── analytics-clusterer.md            (Sonnet)
├── analytics-reporter.md             (Sonnet)
└── insights-archivist.md             (Haiku)
```

Existing files are backed up to `<name>.md.bak` unless you pass `--force`.

### What does NOT get installed

| Missing piece | Why | How to add |
|---|---|---|
| `markdown-lsp` CLI | `docs-searcher` uses `npx markdown-lsp` for doc-graph search | pre-installed via `npx` (no setup required) |
| Pre-push git hook | Subagents only run when invoked | [Wire manually](#2-wire-a-pre-push-hook-optional) |
| `/docs-sync` command | No orchestrator slash command in this package | Use [docs-claude-plugins](https://github.com/Docsbook-io/docs-claude-plugins) |

---

## Pipelines

### Pipeline 1 — Drift Detection (code ↔ docs sync)

Keeps your docs from going stale after every code change.

```
git diff
   │
   ▼
docs-planner (Haiku)          — clusters the diff into named topics
   │
   ▼ (parallel fan-out per cluster)
docs-searcher (Haiku)         — finds drifted doc pages via markdown-lsp CLI
   │
   ▼
docs-editor (Sonnet)          — patches each page in an isolated worktree
   │
   ▼
docs-curator (Sonnet)         — merges patches, resolves conflicts, writes commit
```

### Pipeline 2 — Workspace Creation

Creates a full Docsbook documentation site from scratch.

```
product URL
   │
   ▼
docs-site-crawler (Haiku)           — crawls site → Markdown + _branding.json
   │
   ▼
docs-publisher (Haiku)              — git init + gh repo create + push
   │
   ▼
docs-workspace-configurator (Sonnet) — branding, SEO, AI via Docsbook MCP
```

### Pipeline 3 — Insights (recurring analytics)

Pulls Docsbook analytics on a schedule, clusters signal, writes machine-readable JSON reports.

```
schedule fires (cron or Claude Code Routine)
   │
   ▼
analytics-collector (Haiku)         — pull one MCP slice (utm/engagement/funnel/cohort/link_clicks/questions/traffic_anomaly)
   │
   ▼
analytics-clusterer (Sonnet)        — group, normalize, period-over-period delta, anomaly flags
   │
   ▼
analytics-reporter (Sonnet)         — emit schema-validated JSON + human Markdown, update latest/ symlinks
   │
   ▼
insights-archivist (Haiku)          — diff vs previous run, build index.json, rotate old reports
```

Output lands under `.docsbook/insights/`. Every JSON validates against [`insight.schema.json`](https://github.com/Docsbook-io/docs-claude-plugins/blob/main/plugins/docs-insights/schemas/insight.schema.json) — the stable contract between analyzer agents and the future actor layer that will turn findings into PRs, Issues, and AI-chat updates.

For one-command setup (workspace picker, OAuth, schedule, Slack notifications), use the [`docs-insights` plugin](https://github.com/Docsbook-io/docs-claude-plugins) — it ships the same four subagents plus a `/docs-insights-setup` wizard and individual shortcut commands.

---

## Usage

In Claude Code:

```
> /agents
✓ docs-planner, docs-searcher, docs-editor, docs-curator,
  docs-site-crawler, docs-publisher, docs-workspace-configurator

> Use the docs-planner agent to cluster this diff: <paste diff>
```

The model is pinned in each agent's frontmatter — invoking `docs-planner` always runs on Haiku, `docs-editor` always on Sonnet, regardless of the parent session model.

---

## Agent Reference

### Drift-detection pipeline

#### `docs-planner` — Haiku

Reads a raw `git diff` and groups changed symbols/files into named thematic clusters (e.g. `auth refactor`, `rate-limit API`). The fan-out step so downstream agents each handle one coherent topic.

- **Tools:** none (pure reasoning)
- **Input:** raw `git diff`
- **Output:** `[{ cluster, files, summary }]`

---

#### `docs-searcher` — Haiku

Takes one cluster from `docs-planner`. Searches `docs/` via MCP `doc_search_*` to find pages likely affected. Returns ranked paths with confidence scores.

- **Tools:** `doc_search_text`, `doc_search_fuzzy`, `doc_outline` (requires `markdown-lsp` MCP)
- **Output:** `[{ path, reason, confidence }]`
- **Without MCP:** falls back to `Grep`/`Read`, lower recall

---

#### `docs-editor` — Sonnet

Takes drifted file paths + the original diff. Checks out a fresh `git worktree`, edits each `.md` to remove direct contradictions with the diff. Does not speculate — only fixes what the diff proves is wrong.

- **Tools:** `Read`, `Edit`, `Bash` (git worktree)
- **Output:** unified diff

---

#### `docs-curator` — Sonnet

Receives all patches from parallel `docs-editor` runs. Resolves line conflicts, drops speculative or duplicate changes, produces a single commit-ready patch.

- **Tools:** `Read`, `Edit`, `Bash`
- **Output:** final unified diff + suggested commit message

---

### Workspace creation pipeline

#### `docs-site-crawler` — Haiku

Crawls a product URL into Markdown plus a `_branding.json` file (colors, logo, name). Stage 1 of workspace creation.

- **Tools:** `Read`, `Write`, `Bash`, `WebFetch`

---

#### `docs-publisher` — Haiku

`git init` + `gh repo create` + push over HTTPS. Stage 2 of workspace creation.

- **Tools:** `Bash`, `Read`

---

#### `docs-workspace-configurator` — Sonnet

Configures branding, UI, AI settings, and SEO via the Docsbook MCP. Stage 3 of workspace creation. Requires the `docsbook` MCP (HTTP, OAuth on first call).

- **Tools:** `Read` + Docsbook MCP tools

---

### Insights pipeline

#### `analytics-collector` — Haiku

Pulls a **specific slice** of analytics from the Docsbook MCP (`utm`, `engagement`, `funnel`, `cohort`, `link_clicks`, `questions`, `traffic_anomaly`) and writes the raw rows as JSON for the downstream agent. Does not reason, does not summarize. Cheap fan-out step.

- **Tools:** `Bash`, `Read`, `Write`, every `mcp__docsbook__get_*` analytics tool, `mcp__docsbook__query_events`
- **Input:** `SLICE`, `WORKSPACE`, `PERIOD`, `OUTPUT` lines in the prompt
- **Output:** writes a dump file, prints `WROTE: <path>`

---

#### `analytics-clusterer` — Sonnet

Reads the collector dump, groups rows by the slice-specific dimension, computes period-over-period deltas, and flags anomalies. Pure reasoning — no MCP calls. Produces an intermediate clustered file for the reporter.

- **Tools:** `Read`, `Write`, `Bash`
- **Output:** writes a clustered intermediate, prints `CLUSTERED: <path>`

---

#### `analytics-reporter` — Sonnet

Turns the clusterer's output into the final **schema-validated JSON report** (`insight.schema.json`, `schema_version: 1`) plus a human-readable Markdown sibling. Updates the `.docsbook/insights/latest/` symlinks. Validates the JSON before writing.

- **Tools:** `Read`, `Write`, `Bash`
- **Output:** writes JSON + MD, prints `REPORT_JSON:` and `REPORT_MD:` paths

---

#### `insights-archivist` — Haiku

Maintains the `.docsbook/insights/` folder: builds `index.json`, computes a `*.diff.json` against the previous run from the same skill (`new` / `resolved` / `changed` / `stable`), rotates reports past the retention policy.

- **Tools:** `Read`, `Write`, `Bash`, `Glob`
- **Output:** writes index + diff, prints `INDEX:`, `DIFF:`, `ROTATED:`

The diff is what makes the pipeline cron-friendly: a downstream actor agent typically only acts on **new** and **changed** findings, ignoring **stable** ones it has already addressed.

---

## Adding the Missing Pieces by Hand

If you want the standalone subagents to behave like the full plugin, add these three things manually.

### 1. Install `markdown-lsp` CLI

`docs-searcher` calls `npx markdown-lsp` directly — no MCP registration needed. The CLI is auto-downloaded via `npx` on first use.

To pre-install globally (optional, faster startup):

```bash
npm install -g markdown-lsp
```

Or as a dev dependency in your repo:

```bash
npm install --save-dev markdown-lsp
```

`docs-searcher` will then call `npx markdown-lsp search-symbols ./docs <term>` and related subcommands.

### 2. Wire a Pre-push Hook (optional)

Drop this into `.git/hooks/pre-push` and `chmod +x`:

```bash
#!/usr/bin/env bash
set -e
[ "$DOCS_SYNC_SKIP" = "1" ] && exit 0
claude --print --dangerously-skip-permissions /docs-sync || true
```

> Note: this requires a `/docs-sync` slash command, which this package does not ship. Either write your own orchestrator, or use [docs-claude-plugins](https://github.com/Docsbook-io/docs-claude-plugins) which includes one.

### 3. Optional Config

Create `.docs-sync.json` at the repo root if your orchestrator reads it:

```json
{
  "docsPath": "./docs",
  "codePaths": ["./src"],
  "threshold": 0.6,
  "diffCap": 0.4
}
```

---

## Uninstall

```bash
rm .claude/agents/docs-{planner,searcher,editor,curator,site-crawler,publisher,workspace-configurator}.md
rm .claude/agents/{analytics-collector,analytics-clusterer,analytics-reporter,insights-archivist}.md
```

Restore backups if you did not use `--force`:

```bash
for f in .claude/agents/docs-*.md.bak; do mv "$f" "${f%.bak}"; done
```

---

## License

MIT © 2024 Dan Bondarev / [docsbook.io](https://docsbook.io)
