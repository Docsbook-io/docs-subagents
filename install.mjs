import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import process from "node:process";

const args = process.argv.slice(2).filter(a => a !== "install");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: docs-subagents [install|list] [options]

Options:
  --global    Install to ~/.claude/agents/ instead of project .claude/agents/
  --dry-run   Print planned actions without writing files
  --force     Overwrite existing files without creating backups
  --help, -h  Show this help

Examples:
  npx docs-subagents install
  npx docs-subagents install --global
  npx docs-subagents install --dry-run
`);
  process.exit(0);
}

const isGlobal = args.includes("--global");
const isDryRun = args.includes("--dry-run");
const isForce = args.includes("--force");

function getTargetDir() {
  if (isGlobal) {
    return join(homedir(), ".claude", "agents");
  }
  let repoRoot;
  try {
    repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    console.error("Error: not inside a git repository. Run from your project root, or use --global.");
    process.exit(1);
  }
  return join(repoRoot, ".claude", "agents");
}

export function main() {
  const sourceDir = join(new URL(".", import.meta.url).pathname, "agents");
  const targetDir = getTargetDir();

  const mdFiles = readdirSync(sourceDir).filter(f => f.endsWith(".md"));

  if (mdFiles.length === 0) {
    console.error("Error: no agent .md files found in", sourceDir);
    process.exit(1);
  }

  if (!isDryRun && !existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  let installed = 0;
  let skipped = 0;
  let updated = 0;

  for (const file of mdFiles) {
    const src = join(sourceDir, file);
    const dest = join(targetDir, file);
    const srcContent = readFileSync(src, "utf8");

    if (existsSync(dest)) {
      const destContent = readFileSync(dest, "utf8");
      if (destContent === srcContent) {
        console.log(`= ${file}`);
        skipped++;
        continue;
      }
      if (isForce) {
        console.log(`↻ ${file} (overwritten)`);
      } else {
        const backup = `${dest}.backup-${Date.now()}`;
        if (!isDryRun) copyFileSync(dest, backup);
        console.log(`↻ ${file} (backed up as ${basename(backup)})`);
      }
      if (!isDryRun) writeFileSync(dest, srcContent, "utf8");
      updated++;
    } else {
      console.log(`+ ${file}`);
      if (!isDryRun) writeFileSync(dest, srcContent, "utf8");
      installed++;
    }
  }

  const n = installed + updated;
  const dryTag = isDryRun ? " [dry-run, no files written]" : "";
  console.log(`
${dryTag ? "Would install" : "Installed"} ${n} subagent${n !== 1 ? "s" : ""} to ${targetDir}${dryTag}

Try it in Claude Code:
  /agents              — list available agents
  "Use docs-planner to cluster this diff..."
`);
}

main();
