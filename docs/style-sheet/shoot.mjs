// Renders the style sheet to docs/screens/style-sheet.jpg. Needs Playwright with Chromium, and `npm run dev` running.
// Usage: node docs/style-sheet/shoot.mjs [url]
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/docs/style-sheet/";
const out = new URL("../screens/style-sheet.jpg", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, reducedMotion: "reduce" });
await page.goto(url);
await page.waitForSelector(".sheet");
await page.evaluate(() => document.fonts.ready);
// The curtain is sized to the viewport, so grow the viewport to the whole sheet rather than taking a full-page shot.
const height = await page.evaluate(() => document.querySelector(".sheet").scrollHeight);
await page.setViewportSize({ width: 1800, height });
await page.waitForTimeout(800);
await page.screenshot({ path: out, type: "jpeg", quality: 88 });
await browser.close();
console.log(`wrote ${out}`);
