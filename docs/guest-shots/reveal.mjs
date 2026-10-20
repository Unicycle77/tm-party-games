// Renders the reveal as a strip: Sam's frame on the big screen as he checks in, a still each 400ms step from
// the 3 by 4 mosaic to his face. Needs Playwright with Chromium, Python with Pillow, and the shots server running:
//   npx vite --config docs/guest-shots/vite.config.ts   (then, in another shell)   node docs/guest-shots/reveal.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto("http://localhost:5174/docs/guest-shots/index.html?shot=tv-pixel-arriving");
await page.waitForSelector(".scoreboard-stage");
// Hold the frames still, so each step lines up with the last.
await page.addStyleTag({ content: ".sb-frame-container { animation: none !important; }" });
await page.waitForTimeout(500);
// The board adds the last contestant first: Sam, fifth of six, is second in the page.
const sam = page.locator(".sb-frame-container").nth(1);
const dir = mkdtempSync(join(tmpdir(), "reveal-"));
const stills = [];
const snap = async () => { const p = join(dir, `${stills.length}.png`); await sam.screenshot({ path: p }); stills.push(p); };
await snap();
await page.evaluate(() => window.checkIn("sam"));
for (let i = 0; i < 5; i++) { await page.waitForTimeout(i ? 400 : 600); await snap(); }
await browser.close();
const out = new URL("../screens/pixelate-main-reveal.jpg", import.meta.url).pathname;
execFileSync("python3", ["-c", `
import sys
from PIL import Image
ims = [Image.open(p).convert("RGB") for p in sys.argv[2:]]
w, h = ims[0].size
strip = Image.new("RGB", (w * len(ims) + 24 * (len(ims) + 1), h + 48), "#2a1a10")
for i, im in enumerate(ims): strip.paste(im, (24 + i * (w + 24), 24))
strip.save(sys.argv[1], quality=88)
`, out, ...stills]);
console.log(`wrote ${out}`);
