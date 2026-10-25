// Checks that no two files in src/ import as the same path once capitals are ignored (stageBar.ts beside StageBar.tsx).
// macOS ignores capitals, so "./StageBar" there can open stageBar.ts and the build fails, though it passes on Linux.
// Runs before every commit (.githooks/pre-commit) and every build: node scripts/check-names.mjs
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = readdirSync(`${root}src`, { recursive: true, withFileTypes: true }).filter((f) => f.isFile())
  .map((f) => `${f.parentPath ?? f.path}/${f.name}`.slice(root.length));
const seen = new Map();
for (const file of files) {
  // Imports leave off these extensions, so stageBar.ts and StageBar.tsx are both "./stageBar".
  const key = file.replace(/\.(tsx?|jsx?)$/, "").toLowerCase();
  seen.set(key, [...(seen.get(key) ?? []), file]);
}
const clashes = [...seen.values()].filter((group) => group.length > 1);
if (clashes.length) {
  console.error(`These files differ only in capitals or extension, which breaks the build on macOS. Rename one of each:\n${clashes.map((g) => `  - ${g.join("  vs  ")}`).join("\n")}`);
  process.exit(1);
}
