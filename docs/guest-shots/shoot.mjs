// Renders the guest screens to docs/screens. Needs Playwright with Chromium and the shots server running:
//   npx vite --config docs/guest-shots/vite.config.ts   (then, in another shell)   node docs/guest-shots/shoot.mjs [name ...]
import { chromium } from "playwright";

const base = "http://localhost:5174/docs/guest-shots/index.html";
// file name → [shot, extra query, what to do before the shot]
const SHOTS = {
  "guest-checkin-list": ["checkin-list"],
  "guest-checkin-confirm": ["checkin-confirm", "", async (p) => { await p.getByRole("button", { name: /Sam/ }).click(); }],
  "guest-checkin-headshot": ["checkin-headshot"],
  "guest-checkin-rules": ["checkin-rules"],
  "guest-checkin-envelopes": ["checkin-pile", "", async (p) => { await p.getByRole("button", { name: /Got it/ }).click(); }],
  "guest-home-todo": ["home-todo-envelope"],
  "guest-home-prize-ask": ["home-prize-ask"],
  "guest-prize-photos": ["prize-check", "", async (p) => {
    const pngs = [new URL("./prizes/sock-puppet.jpg", import.meta.url).pathname];
    const chooser = p.waitForEvent("filechooser");
    await p.getByRole("button", { name: /Yes, add photos/ }).click();
    await (await chooser).setFiles(pngs);
  }],
  "guest-home-waiting": ["home-waiting"],
  "guest-task-photos": ["task-photos"],
  "guest-task-photos-sent": ["task-photos-sent"],
  "guest-noisemaster-up": ["noisemaster-up"],
  "guest-noisemaster-watch": ["noisemaster-watch"],
  // the big screen, 1600x900: same party as the check-in shots
  "main-welcome": ["tv-welcome"],
  "main-noisemaster": ["tv-noisemaster"],
  "main-secret-tasks": ["tv-secret"],
  "prize-main-photo": ["tv-prize"],
  "prize-host-up": ["host-prize"],
  "guest-secret-open": ["home-waiting", "", async (p) => { await p.getByRole("button", { name: /Secret envelope/ }).click(); await p.getByRole("button", { name: /Open your secret task/ }).click(); await p.waitForTimeout(1500); }],
  "secret-tasks-host-who-has-what": ["host-secret", "", async (p) => { await p.getByRole("button", { name: /Sam/ }).first().click(); }],
  // the host phone, whole page
  "noisemaster-host-round": ["host-noisemaster"],
  "run-of-show-host": ["host-run"],
  "points-host-given": ["host-points"],
  "main-secret-sealed": ["tv-secret-sealed"],
  "haul-main-winner": ["tv-haul"],
  "haul-host-up": ["host-haul"],
  // a task with two parts (Individual, then Team)
  "task-page-host-live": ["host-onepart"],
  "task-page-host-live-up": ["host-onepart-up"],
  "task-parts-host": ["host-parts"],
  "task-parts-host-up": ["host-parts-up"],
  "task-parts-main": ["tv-parts"],
  "task-parts-host-phones": ["host-parts-phones"],
  "guest-task-parts-phone": ["task-parts-phone"],
  "task-parts-edit": ["host-parts-edit", "", async (p) => { await p.getByRole("button", { name: "Change" }).first().click(); }],
  "scores-main-before": ["tv-scores-before"],
  "scores-main-after": ["tv-scores"],
};
const only = process.argv.slice(2);
const browser = await chromium.launch();
for (const [name, [shot, extra = "", before]] of Object.entries(SHOTS)) {
  if (only.length && !only.includes(name)) continue;
  const tv = shot.startsWith("tv-");
  const page = await browser.newPage({ viewport: tv ? { width: 1600, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: tv ? 1 : 2, reducedMotion: "reduce" });
  await page.goto(`${base}?shot=${shot}${extra}`);
  await page.waitForSelector("main, .scoreboard-stage, .task-text-stage");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  if (before) { await before(page); await page.waitForTimeout(300); }
  const out = new URL(`../screens/${name}.jpg`, import.meta.url).pathname;
  await page.screenshot({ path: out, type: "jpeg", quality: 88, fullPage: shot.startsWith("host-") });
  console.log(`wrote ${out}`);
  await page.close();
}
await browser.close();
