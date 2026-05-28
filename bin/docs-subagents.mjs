#!/usr/bin/env node
const cmd = process.argv[2];

if (!cmd || cmd === "install") {
  await import("../install.mjs");
} else if (cmd === "list") {
  const { readdirSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  const agentsDir = join(here, "..", "agents");
  for (const f of readdirSync(agentsDir).filter(n => n.endsWith(".md"))) {
    console.log(f.replace(".md", ""));
  }
} else if (cmd === "--help" || cmd === "-h") {
  console.log("Usage: docs-subagents [install|list] [--global] [--dry-run] [--force]");
} else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
