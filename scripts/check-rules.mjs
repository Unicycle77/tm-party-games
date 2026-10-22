// Checks database.rules.json against the games in src/types.ts, so a game the rules don't know about can't ship.
// The database refuses those writes silently: the phone shows the change for a moment, then goes back.
// Runs before every commit (.githooks/pre-commit) and every build: node scripts/check-rules.mjs
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const ids = read("src/types.ts").match(/export const GAME_IDS = \[([^\]]*)\]/)?.[1].match(/"[^"]+"/g)?.map((s) => s.slice(1, -1));
if (!ids?.length) {
  console.error("check-rules: couldn't find GAME_IDS in src/types.ts.");
  process.exit(1);
}
const session = JSON.parse(read("database.rules.json")).rules.sessions.$code;
const on = session.game?.[".validate"] ?? "";
const problems = ids.flatMap((id) => [
  ...(on.includes(`'${id}'`) ? [] : [`"${id}" is missing from the \`game\` .validate list, so it can never be the game that's on.`]),
  ...(session.games?.[id] ? [] : [`"${id}" has no \`games/${id}\` block, so none of its data can be saved.`]),
]);
if (problems.length) {
  console.error(`database.rules.json doesn't match GAME_IDS in src/types.ts:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
