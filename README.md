# docs-subagents

> Drop-in Claude Code subagents that detect and fix code↔docs drift.

Four subagents with pinned models for cost efficiency:

| Subagent | Model | Job |
|---|---|---|
| `docs-planner` | Haiku | Cluster a code diff into thematic groups |
| `docs-searcher` | Haiku | Find docs pages that drifted from one cluster |
| `docs-editor` | Sonnet | Edit drifted `.md` files inside a git worktree |
| `docs-curator` | Sonnet | Merge edits, resolve overlaps, drop speculative changes |

---

## Install

```bash
npx docs-subagents install
```

Copies agents into `.claude/agents/` of your current project. Global install:

```bash
npx docs-subagents install --global
```

Other options:

```bash
npx docs-subagents install --dry-run   # preview without writing
npx docs-subagents install --force     # overwrite without backup
npx docs-subagents list                # print bundled agent names
```

---

## Use

In Claude Code:

```
> /agents
✓ docs-planner, docs-searcher, docs-editor, docs-curator (and your existing agents)

> Use the docs-planner agent to cluster this diff: <paste>
```

The model is pinned in each subagent's frontmatter — invoking `docs-planner` always runs on Haiku, `docs-editor` always on Sonnet. No config needed.

---

## Designed for docs-sync

These subagents are the workers behind the `docs-sync` pre-push workflow:

1. `docs-planner` (Haiku) — reads the staged diff, clusters changes by theme
2. Per cluster in parallel: `docs-searcher` (Haiku) finds drifted pages → `docs-editor` (Sonnet) rewrites them in a git worktree
3. `docs-curator` (Sonnet) — merges all worktree edits in a fresh context, resolves overlaps
4. Final patch is committed atomically with the original push

Get the full hook + MCP server via the [docs-claude-plugins](https://github.com/Docsbook-io/docs-claude-plugins) Claude Code plugin.

---

## Subagents

### `docs-planner` — Haiku

Reads a raw `git diff` and groups changed symbols/files into named thematic clusters (e.g. "auth refactor", "rate-limit API"). Returns a JSON array of clusters. Used as the fan-out step so downstream agents each handle one coherent topic.

**Tools:** none (read-only reasoning task)
**Returns:** `[{ cluster, files, summary }]`

### `docs-searcher` — Haiku

Takes one cluster object from `docs-planner`. Searches `.claude/agents/` and `docs/` via MCP `doc_search_*` tools to find pages likely affected by the cluster. Returns ranked file paths with drift confidence.

**Tools:** `doc_search_text`, `doc_search_fuzzy`, `doc_outline` (via `markdown-lsp-mcp`)
**Returns:** `[{ path, reason, confidence }]`

### `docs-editor` — Sonnet

Takes a list of drifted file paths + the original diff. Checks out a fresh git worktree, applies targeted edits to each `.md` file using Replace/Edit tools, then returns a patch. Does not speculate — only updates text directly contradicted by the diff.

**Tools:** `Read`, `Edit`, `Bash` (git worktree)
**Returns:** unified diff of edited files

### `docs-curator` — Sonnet

Receives all patches from parallel `docs-editor` runs. Applies them to a clean worktree, resolves line conflicts, drops speculative or duplicate changes, and produces a single clean commit-ready patch.

**Tools:** `Read`, `Edit`, `Bash`
**Returns:** final unified diff + commit message suggestion

---

## License

MIT © 2024 Dan Bondarev / [docsbook.io](https://docsbook.io)
