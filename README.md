# docs-subagents

> Standalone Claude Code subagents for documentation work — planner, searcher, editor, curator, crawler, publisher, workspace configurator.

This package is the **subagent layer only**. It does not register MCP servers and does not install git hooks. If you want the full pre-push `docs-sync` workflow with one command, use the [docs-claude-plugins](https://github.com/Docsbook-io/docs-claude-plugins) plugin instead — it bundles these same subagents with the MCP server and the hook installer.

---

## When to use which

| You want… | Use |
|---|---|
| The full pre-push drift workflow, no manual wiring | [docs-claude-plugins](https://github.com/Docsbook-io/docs-claude-plugins) (`/plugin install docs-sync@…`) |
| Just the subagent files, to invoke them by hand or wire your own pipeline | This package (`npx docs-subagents install`) |
| Subagents for Cursor / Codex / Copilot | This package — the plugin is Claude Code only |

---

## What this package installs

`npx docs-subagents install` copies 7 subagent files into `.claude/agents/` of the current project:

```
.claude/agents/
├── docs-planner.md             (Haiku)
├── docs-searcher.md            (Haiku)
├── docs-editor.md              (Sonnet)
├── docs-curator.md             (Sonnet)
├── docs-site-crawler.md        (Haiku)
├── docs-publisher.md           (Haiku)
└── docs-workspace-configurator.md (Sonnet)
```

Each file has a YAML frontmatter that pins its model and tool list. Existing files are backed up to `<name>.md.bak` unless you pass `--force`.

`--global` writes to `~/.claude/agents/` instead, making the subagents available in every project.

### What it does NOT install

- **No MCP server.** `docs-searcher` calls `doc_search_text`, `doc_search_fuzzy`, `doc_outline` — these come from the `markdown-lsp` MCP. Without it, `docs-searcher` falls back to plain `Grep`/`Read` and finds far fewer drifted pages.
- **No git hook.** Subagents only run when you invoke them. There is no automatic pre-push trigger.
- **No orchestrator command.** There is no `/docs-sync` slash command in this package — you invoke each subagent manually, or chain them in your own script.

If any of those matter, install the plugin instead.

---

## Install

```bash
npx docs-subagents install              # project: .claude/agents/
npx docs-subagents install --global     # user:    ~/.claude/agents/
npx docs-subagents install --dry-run    # preview, no writes
npx docs-subagents install --force      # overwrite without backup
npx docs-subagents list                 # print bundled agent names
```

After install, restart `claude` is **not** required — `/agents` should list all 7 immediately.

---

## Use

In Claude Code:

```
> /agents
✓ docs-planner, docs-searcher, docs-editor, docs-curator,
  docs-site-crawler, docs-publisher, docs-workspace-configurator

> Use the docs-planner agent to cluster this diff: <paste>
```

The model is pinned in each subagent's frontmatter — invoking `docs-planner` always runs on Haiku, `docs-editor` always on Sonnet, regardless of the parent session.

---

## Adding the missing pieces by hand

If you want the standalone subagents to behave like the plugin, you need three more things.

### 1. Register `markdown-lsp` MCP

Add to `.mcp.json` at the repo root:

```json
{
  "mcpServers": {
    "markdown-lsp": {
      "command": "npx",
      "args": ["-y", "markdown-lsp-mcp", "--docs", "./docs"]
    }
  }
}
```

Restart Claude Code. `docs-searcher` will now use `doc_search_*` tools instead of falling back to `Grep`.

### 2. Wire a pre-push hook (optional)

Drop this into `.git/hooks/pre-push` and `chmod +x`:

```bash
#!/usr/bin/env bash
set -e
[ "$DOCS_SYNC_SKIP" = "1" ] && exit 0
claude --print --dangerously-skip-permissions /docs-sync || true
```

Note: this needs a `/docs-sync` command — which this package does not ship. Either write your own orchestrator slash command, or use the plugin which includes one ([commands/docs-sync.md](https://github.com/Docsbook-io/docs-claude-plugins/blob/main/plugins/docs-sync/commands/docs-sync.md)).

### 3. Optional config

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

## Subagent reference

### `docs-planner` — Haiku

Reads a raw `git diff` and groups changed symbols/files into named thematic clusters (e.g. `auth refactor`, `rate-limit API`). The fan-out step so downstream agents each handle one coherent topic.

- **Tools:** none (pure reasoning)
- **Returns:** `[{ cluster, files, summary }]`

### `docs-searcher` — Haiku

Takes one cluster from `docs-planner`. Searches `docs/` via MCP `doc_search_*` to find pages likely affected. Returns ranked paths with confidence scores.

- **Tools:** `doc_search_text`, `doc_search_fuzzy`, `doc_outline` (requires `markdown-lsp` MCP)
- **Returns:** `[{ path, reason, confidence }]`
- **Without MCP:** falls back to `Grep`/`Read`, lower recall

### `docs-editor` — Sonnet

Takes drifted file paths + the original diff. Checks out a fresh `git worktree`, edits each `.md` to remove direct contradictions with the diff. Does not speculate.

- **Tools:** `Read`, `Edit`, `Bash` (git worktree)
- **Returns:** unified diff

### `docs-curator` — Sonnet

Receives all patches from parallel `docs-editor` runs in a fresh context. Resolves line conflicts, drops speculative or duplicate changes, produces a single commit-ready patch.

- **Tools:** `Read`, `Edit`, `Bash`
- **Returns:** final unified diff + suggested commit message

### `docs-site-crawler` — Haiku

Crawls a product URL into Markdown plus a `_branding.json` file. Used as stage 1 of `/docs-create`.

- **Tools:** `Read`, `Write`, `Bash`, `WebFetch`

### `docs-publisher` — Haiku

`git init` + `gh repo create` + push over HTTPS. Stage 2 of `/docs-create`.

- **Tools:** `Bash`, `Read`

### `docs-workspace-configurator` — Sonnet

Branding, UI, AI, SEO via Docsbook MCP. Stage 3 of `/docs-create`. Requires the `docsbook` MCP (HTTP, OAuth on first call).

- **Tools:** `Read` + Docsbook MCP tools

---

## Uninstall

Delete the files:

```bash
rm .claude/agents/docs-{planner,searcher,editor,curator,site-crawler,publisher,workspace-configurator}.md
```

Restore backups if you used `--force`:

```bash
for f in .claude/agents/docs-*.md.bak; do mv "$f" "${f%.bak}"; done
```

---

## License

MIT © 2024 Dan Bondarev / [docsbook.io](https://docsbook.io)
