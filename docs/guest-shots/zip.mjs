// Renders what the download-all zip adds at its top, from the ABCD party's tied night (Priya won the tiebreaker),
// with the app's own renderers: the scoreboard, the prize haul and the scores PDF's first page. Needs the shots
// server running (see shoot.mjs) and pdftoppm (poppler) for the PDF page:
//   node docs/guest-shots/zip.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const screens = (name) => new URL(`../screens/${name}`, import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:5174/docs/guest-shots/index.html?shot=tv-scores-tie");
await page.waitForSelector(".scoreboard-stage");
const files = await page.evaluate(async () => {
  const db = await import("/docs/guest-shots/fake-database.ts");
  const session = (await db.get(db.ref(null, "sessions/ABCD"))).val();
  const { scoreFiles } = await import("/src/scoreboard/zipScores.ts");
  const out = [];
  for (const f of scoreFiles(session)) {
    const bytes = new Uint8Array(await (await f.render()).arrayBuffer());
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    out.push({ name: f.name, data: btoa(s) });
  }
  return out;
});
await browser.close();

const shots = { "Final scoreboard.png": "zip-final-scoreboard", "Prize haul.png": "zip-prize-haul", "Scores by task.pdf": "zip-scores-by-task" };
for (const f of files) {
  const tmp = join(tmpdir(), f.name.replace(/ /g, "-"));
  writeFileSync(tmp, Buffer.from(f.data, "base64"));
  const out = screens(`${shots[f.name]}.jpg`);
  if (f.name.endsWith(".pdf")) execFileSync("pdftoppm", ["-r", "110", "-jpeg", "-singlefile", tmp, out.replace(/\.jpg$/, "")]);
  else execFileSync("python3", ["-c", `from PIL import Image; Image.open(${JSON.stringify(tmp)}).convert("RGB").save(${JSON.stringify(out)}, quality=88)`]);
  console.log(`wrote ${out}`);
}
