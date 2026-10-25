// Renders the guest screens to docs/screens. Needs Playwright with Chromium and the shots server running:
//   npx vite --config docs/guest-shots/vite.config.ts   (then, in another shell)   node docs/guest-shots/shoot.mjs [name ...]
import { chromium } from "playwright";

const base = "http://localhost:5174/docs/guest-shots/index.html";
// file name → [shot, extra query, what to do before the shot]
const SHOTS = {
  "guest-checkin-list": ["checkin-list"],
  "guest-checkin-confirm": ["checkin-confirm", "", async (p) => { await p.getByRole("button", { name: /Sam/ }).click(); }],
  "guest-checkin-headshot": ["checkin-headshot"],
  "guest-checkin-house-rules": ["checkin-house-rules"],
  "guest-checkin-rules": ["checkin-rules"],
  "guest-checkin-arrival": ["checkin-arrival"],
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
  "guest-home-arrival": ["home-arrival"],
  "guest-task-photos": ["task-photos"],
  "guest-task-photos-sent": ["task-photos-sent"],
  "guest-noisemaster-up": ["noisemaster-up"],
  "guest-noisemaster-watch": ["noisemaster-watch"],
  // the big screen, 1600x900: same party as the check-in shots
  "main-welcome": ["tv-welcome"],
  "rules-main": ["tv-rules"],
  "main-noisemaster": ["tv-noisemaster"],
  "main-noisemaster-done": ["tv-noisemaster-done"],
  "main-secret-tasks": ["tv-secret"],
  "prize-main-photo": ["tv-prize"],
  "prize-host-up": ["host-prize"],
  "prize-host-before": ["host-prize-before"],
  "guest-secret-open": ["home-waiting", "", async (p) => { await p.getByRole("button", { name: /Secret envelope/ }).click(); await p.getByRole("button", { name: /Open your secret task/ }).click(); await p.waitForTimeout(1500); }],
  "secret-tasks-host-who-has-what": ["host-secret", "", async (p) => { await p.getByRole("button", { name: /Sam/ }).first().click(); }],
  // the host phone, whole page
  "noisemaster-host-round": ["host-noisemaster"],
  // the task pages (docs/showcase): Photos, Headshot, Before & After, [BLANK] in a Box and the light
  "photos-main-photo": ["tv-photos"],
  "photos-main-everyone": ["tv-photos-grid", "", async (p) => { await p.waitForTimeout(11000); await readyPics(p); }],
  "photos-host-up": ["host-photos"],
  "headshot-main-photo": ["tv-headshot"],
  "headshot-main-everyone": ["tv-headshot-grid", "", async (p) => { await p.waitForTimeout(11000); await readyPics(p); }],
  "headshot-host-up": ["host-headshot"],
  "before-after-main-both": ["tv-beforeafter"],
  "before-after-main-everyone": ["tv-beforeafter-review", "", async (p) => { await p.waitForTimeout(11000); await readyPics(p); }],
  "before-after-guest": ["task-beforeafter"],
  "before-after-host-up": ["host-beforeafter"],
  "box-main-closed": ["tv-box"],
  "box-main-open": ["tv-box-open"],
  "box-guest-peek": ["task-box-peek"],
  "box-guest-decide": ["task-box-decide"],
  "box-host": ["host-box"],
  "light-main-lit": ["tv-light", "", async (p) => { await p.waitForTimeout(3000); }],
  "light-host-got-it": ["host-light"],
  "light-main-all": ["tv-light-all", "", async (p) => { await p.waitForTimeout(3000); }],
  "light-host-change": ["host-light-change", "", async (p) => { await p.getByRole("button", { name: "Change" }).first().click(); }],
  // the light run by the big screen, set up from the phone: not started, the camera check, the lamp check, ready, and the 💡 pulsing for a flash
  "light-host-start": ["host-light-start"],
  "light-host-camera": ["host-light-camera"],
  "light-host-lamp": ["host-light-lamp", "", async (p) => { await p.getByRole("button", { name: "Next: the Hue lamp" }).click(); }],
  "light-host-ready": ["host-light-ready"],
  "light-host-flash": ["host-light-flash", "", async (p) => { await p.waitForSelector(".head-icon.flash"); }, ".host-head"],
  // the lamp dropped mid-game: the alert dot and the line saying what to do; then its link, on the lamp step with no test while the light is on
  // a /light page left holding the light: the phone offers to move it to the big screen
  "light-host-left-over": ["host-light-left-over"],
  "light-host-trouble": ["host-light-trouble"],
  "light-host-trouble-fix": ["host-light-trouble-fix", "", async (p) => { await p.getByRole("button", { name: "Next: the Hue lamp" }).click(); }],
  "noisemaster-host-setup": ["host-noisemaster-setup", "", async (p) => {
    await p.getByRole("button", { name: "Sam", exact: true }).click();
    await p.getByPlaceholder(/quick brown fox/).fill("I am the Noisemaster");
    await p.getByPlaceholder(/cat dog banana/).fill("cheese banana wobble Greg sausage trumpet Alex moist duck hello spoon yes");
    await p.evaluate(() => window.scrollTo(0, 0));
  }],
  "run-of-show-host": ["host-run"],
  "run-of-show-host-arrivals": ["host-arrivals"],
  // the Up next card for a task that opens with a sting from the Transitions folder
  "up-next-transition": ["host-run-transition", "", undefined, ".up-next"],
  // the big screen just after that Start: the task's sting picture, whole, while the sting plays
  "main-sting": ["tv-sting"],
  // the same card when the sting's file has gone from Transition music: struck through, "not in the folder", Start still gold
  "up-next-transition-missing": ["host-run-transition-missing", "", undefined, ".up-next"],
  // the host's phone two seconds after that Start: the big-screen line names the picture, the ⏹ strip ends the transition
  "host-sting": ["host-sting"],
  "host-sting-held": ["host-sting-held"],
  // the task's page after its transition has played: the strip to play it again, above the song's
  "host-replay": ["host-replay"],
  // the gate after a refresh: the music folder's line, then a line for each transition folder
  "main-gate-transitions": ["tv-gate"],
  // the same with the light started from the host phone: "✓ The light: running here, out of sight · …"
  "main-gate-light": ["tv-gate-light"],
  // Dice tower's ✎ page with its Transition open: music and a picture picked, the video empty
  "task-edit-transition": ["host-edit-transition", "", async (p) => { await p.locator(".summary-line", { hasText: "Transition" }).getByRole("button", { name: "Change" }).click(); }],
  // the same part while "Try it" is playing what's picked: pressed in, "⏹ Stop"
  "task-edit-transition-try": ["host-edit-transition-try", "", async (p) => { await p.locator(".summary-line", { hasText: "Transition" }).getByRole("button", { name: "Change" }).click(); }],
  "points-host-given": ["host-points"],
  "main-secret-sealed": ["tv-secret-sealed"],
  "haul-main-winner": ["tv-haul"],
  "haul-host-up": ["host-haul"],
  // a task with two parts (Individual, then Team)
  // Plan the party's Print group: everything on, all tasks ticked
  "plan-host-rules": ["host-plan-pile", "", async (p) => { await p.locator("section.rules-setup").getByRole("button", { name: "Change" }).click(); }, "section.rules-setup"],
  "host-setup-file": ["host-plan-pile", "", undefined, "section.setup-file"],
  "plan-host-print": ["host-plan-pile", "", undefined, "section.print"],
  // the same with Change open under Task pages and two tasks unticked
  "plan-host-print-pick": ["host-plan-pile", "", async (p) => { const s = p.locator("section.print"); await s.getByRole("button", { name: "Change" }).click(); await s.locator(".choices.two button").nth(1).click(); await s.locator(".choices.two button").nth(3).click(); }, "section.print"],
  "task-page-host-live": ["host-onepart"],
  "task-page-host-live-up": ["host-onepart-up"],
  "task-parts-host": ["host-parts"],
  "task-parts-host-up": ["host-parts-up"],
  "task-parts-main": ["tv-parts"],
  "task-parts-host-phones": ["host-parts-phones"],
  "guest-task-parts-phone": ["task-parts-phone"],
  "task-parts-edit": ["host-parts-edit", "", async (p) => { await p.getByRole("button", { name: "Change" }).first().click(); }],
  // "task", never "game": the screens that name app tasks, the unlisted task and the party code
  "task-page-host-app-game": ["host-app-game"],
  "host-choose-game": ["host-adhoc"],
  "run-of-show-host-play-a-game": ["host-adhoc"],
  "run-of-show-host-add-game": ["host-plan-add", "", async (p) => { await p.getByRole("button", { name: "+ App task" }).click(); }],
  "scoreboard-host-tasks-contestants": ["host-plan-ipad"],
  "task-edit-scoring": ["host-plan-edit"],
  "task-edit-arrival": ["host-edit-arrival", "", async (p) => { await p.locator(".summary-line", { hasText: "Task text" }).getByRole("button", { name: "Change" }).click(); }],
  // ✉ Secret envelopes opened with Change before the night: two more tasks typed in, the pile of ten below
  "secret-tasks-host-pile-open": ["host-plan-pile", "", async (p) => {
    await p.locator("section.envelopes").getByRole("button", { name: "Change" }).click();
    await p.getByLabel("New tasks, one per line").fill("Swap seats with someone without asking.\nLaugh at a joke before it ends.");
  }, "section.envelopes"],
  "host-reset-scores": ["host-reset", "", async (p) => {
    await p.getByRole("button", { name: "Party settings" }).click();
    await p.getByRole("button", { name: /Reset scores/ }).click();
    await p.getByRole("switch", { name: /Also remove guests/ }).check();
    await p.evaluate(() => window.scrollTo(0, 0)); // the sticky header would otherwise land mid-page
  }],
  // Flipchart: the guest's phone before the start, drawing, asking to send on the last page, sent; the big screen's clock, one portrait, everyone's; the host's phone
  "flipchart-guest-front": ["task-flipchart-front"],
  "flipchart-guest-drawing": ["task-flipchart-drawing"],
  "flipchart-guest-send": ["task-flipchart-send", "", async (p) => { await p.getByRole("button", { name: /Send my portrait/ }).click(); }],
  "flipchart-guest-sent": ["task-flipchart-sent"],
  "flipchart-main-clock": ["tv-flipchart-clock"],
  "flipchart-main-portrait": ["tv-flipchart-portrait"],
  "flipchart-main-everyone": ["tv-flipchart-everyone"],
  "flipchart-host-start": ["host-flipchart"],
  "flipchart-host-live": ["host-flipchart-live"],
  "flipchart-host-edit": ["host-flipchart-edit"],
  // The ⏱ clock: set from Dice tower's 3 minutes, with a song that ends on 0:00, counting, the task page with its strip, Flipchart's clock, a stopwatch; the big screen's two
  "clock-host-set": ["host-cd-set"],
  "clock-host-song": ["host-cd-song"],
  "clock-host-running": ["host-cd-running"],
  "clock-host-task": ["host-cd-task"],
  // started from the task page: one player at a time (host, then the big screen), no time in the words, and ⏱ at 0:00
  "clock-host-turns": ["host-cd-turns"],
  "clock-main-turn": ["tv-cd-turn"],
  "clock-host-untimed": ["host-cd-untimed"],
  "clock-host-done": ["host-cd-done"],
  // The clock left up over Dice tower's words: Scores · Clock · Curtain under the line, Clock pressed in
  "stage-chips-host-clock": ["host-cd-stuck"],
  // The big screen's backup bar, the mouse just moved: the clock up (Clock pressed in); Sam's Before & After, the game's own controls after the chips
  "stage-bar-main-clock": ["tv-cd", "&bar=1", async (p) => { await p.mouse.move(800, 300); await p.mouse.move(820, 320); }],
  "stage-bar-main-before-after": ["tv-beforeafter", "&bar=1", async (p) => { await p.mouse.move(800, 300); await p.mouse.move(820, 320); }],
  // Curtain tapped while Dice tower's transition video held its last frame: it's ended, the curtain is up
  "stage-chips-host-transition-curtain": ["host-sting-held", "", async (p) => { await p.getByRole("group", { name: "Put on the big screen" }).getByRole("button", { name: "Curtain" }).click(); }],
  // Curtain tapped while Flipchart's guests draw: the round goes on behind it
  "stage-chips-host-flipchart-curtain": ["host-flipchart-live", "", async (p) => { await p.getByRole("group", { name: "Put on the big screen" }).getByRole("button", { name: "Curtain" }).click(); }],
  "clock-host-flipchart": ["host-cd-flipchart"],
  "clock-host-stopwatch": ["host-sw-running"],
  // a time limit set on a part in ✎: Dice tower's Task text opened (4 min set on part 1, part 2's 2 minutes read from its words), its closed line, and ⏱ offering it
  "time-limit-host-edit": ["host-cd-limit-edit", "", async (p) => { await p.getByRole("button", { name: "Change" }).first().click(); await p.evaluate(() => window.scrollTo(0, 0)); }],
  "time-limit-host-summary": ["host-cd-limit-summary"],
  "time-limit-host-clock": ["host-cd-limit-set"],
  "clock-main-countdown": ["tv-cd"],
  "clock-main-stopwatch": ["tv-sw"],
  "guest-join-code": ["join-code"],
  // Secret Tasks as the last task: the reveal's title card up, Part 2 behind a plain "Show the task", no point buttons
  "secret-reveal-host-title": ["host-secret-title"],
  "secret-reveal-main-part2": ["tv-secret-part2"],
  // its ✎ page: Part 1 (the rules) and Part 2 (the reveal), the built-in words for a new party
  "secret-tasks-edit-parts": ["host-secret-edit", "", async (p) => { await p.getByRole("button", { name: "Change" }).first().click(); await p.evaluate(() => window.scrollTo(0, 0)); }],
  // the contestants on Plan the party, tall thumbnails, Greg's tapped: Crop or Replace photo
  "headshot-crop-choice": ["host-plan-crop", "", async (p) => { await p.getByRole("button", { name: "Change Greg's headshot" }).click(); }, "section:has(.sb-contestant-list)"],
  // the contestants on Plan the party mid-arrival, with the pixelate switch under the heading
  "pixelate-host-plan": ["host-plan-pixel", "", undefined, "section:has(.sb-contestant-list)"],
  // back on the list after Save: Greg's tall thumbnail shows his crop
  "headshot-crop-saved": ["host-plan-cropped", "", undefined, "section:has(.sb-contestant-list)"],
  // Greg's crop page: his wide group shot whole, the window dragged left onto him, the frame beside it
  "headshot-crop-page": ["host-crop", "", async (p) => {
    const c = await p.locator(".crop-corner.se").boundingBox();
    await p.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await p.mouse.down();
    await p.mouse.move(c.x + c.width / 2 - 80, c.y + c.height / 2 - 80, { steps: 5 }); await p.mouse.up();
    const w = await p.locator(".crop-window").boundingBox();
    await p.mouse.move(w.x + w.width / 2, w.y + w.height / 2); await p.mouse.down();
    await p.mouse.move(w.x + w.width / 2 - 60, w.y + w.height / 2 + 20, { steps: 5 }); await p.mouse.up();
  }],
  // the scoreboard after the update, Greg in his cropped group shot, everyone else as before
  "headshot-crop-scoreboard": ["tv-scores-cropped"],
  // Run of show before the first task: "Here so far", tall thumbnails, Greg's cropped, Sam not here yet
  "headshot-crop-arrivals": ["host-arrivals", "", undefined, "section.arrivals"],
  "scores-main-before": ["tv-scores-before"],
  // mid-arrival, before any points: Mei and Sam haven't checked in, so they're 3 by 4 mosaics; Tom has no headshot yet
  "pixelate-main-arriving": ["tv-pixel-arriving"],
  "scores-main-after": ["tv-scores"],
  // 📏 started from a thing: "a thing ▾" open with "eif" typed; the Eiffel Tower picked and put in Jimothys; the big screen
  "converter-host-find-thing": ["host-convert", "", async (p) => { await openThings(p); await p.getByLabel("Find a thing").fill("eif"); }],
  "converter-host-thing": ["host-convert", "", async (p) => {
    await openThings(p); await p.getByLabel("Find a thing").fill("eif"); await p.getByRole("button", { name: /Eiffel Tower/ }).click();
    await p.getByRole("button", { name: /Or pick one/ }).click(); await p.getByRole("button", { name: /^Jimothy/ }).click(); await p.evaluate(() => window.scrollTo(0, 0));
  }],
  "converter-main-jimothy": ["tv-convert"],
  // "Or pick one ▾" before the first result: the same find box, "jim" typed
  "converter-host-pick-one": ["host-convert", "", async (p) => {
    await openThings(p); await p.getByLabel("Find a thing").fill("eif"); await p.getByRole("button", { name: /Eiffel Tower/ }).click();
    await p.getByRole("button", { name: /Or pick one/ }).click(); await p.getByLabel("Find a thing").fill("jim"); await p.evaluate(() => window.scrollTo(0, 0));
  }],
  // …and "⇄ Flip it": Jimothy is about 1/2,165 the height of the Eiffel Tower
  "converter-host-flipped": ["host-convert", "", async (p) => {
    await openThings(p); await p.getByLabel("Find a thing").fill("eif"); await p.getByRole("button", { name: /Eiffel Tower/ }).click();
    await p.getByRole("button", { name: /Or pick one/ }).click(); await p.getByRole("button", { name: /^Jimothy/ }).click(); await p.getByRole("button", { name: "⇄ Flip it" }).click(); await p.evaluate(() => window.scrollTo(0, 0));
  }],
  // 📏 without a party (/convert): opening on a US phone; a sandwich, 1 ft 2 in long, put in Jimothys; the way in from the host remote's start page
  "converter-alone-open": ["alone-convert"],
  "converter-alone-result": ["alone-convert", "", async (p) => {
    await p.getByRole("button", { name: "Length" }).click(); await p.getByLabel("ft", { exact: true }).fill("1"); await p.getByLabel("in", { exact: true }).fill("2");
    await p.getByRole("button", { name: /Or pick one/ }).click(); await p.getByLabel("Find a thing").fill("jim"); await p.getByRole("button", { name: /^Jimothy/ }).click();
  }],
  "host-start-convert": ["start-host"],
  // Taking over the remote with no big screen: on Plan the party, the pin set and "📤 Send yourself the host link" under it;
  // the phone that was bumped, back on its start page, with "Another phone took over …" and gold "Take it back"
  "host-pin-send-link": ["host-plan-pin", "", async (p) => { await p.locator(".party-summary").getByRole("button", { name: "Change" }).click(); }, ".party-summary"],
  "host-taken-over": ["start-host-taken"],
};
async function openThings(p) { await p.getByRole("button", { name: /Useless conversions/ }).click(); await p.getByRole("button", { name: /a thing/ }).click(); }
// The grid of everyone's photos waits on each photo's load event, which the in-memory data URLs don't always fire here:
// once its 10 s fallback has shown the grid, mark the frames ready, as they are once a real photo loads.
async function readyPics(p) { await p.evaluate(() => document.querySelectorAll(".review .pic").forEach((e) => e.classList.add("ready"))); await p.waitForTimeout(800); }
const only = process.argv.slice(2);
const browser = await chromium.launch();
for (const [name, [shot, extra = "", before, part]] of Object.entries(SHOTS)) {
  if (only.length && !only.includes(name)) continue;
  const tv = shot.startsWith("tv-");
  const ipad = shot.endsWith("-ipad");
  const page = await browser.newPage({ viewport: tv ? { width: 1600, height: 900 } : ipad ? { width: 1100, height: 1024 } : { width: 390, height: 844 }, deviceScaleFactor: tv ? 1 : 2, reducedMotion: "reduce" });
  await page.goto(`${base}?shot=${shot}${extra}`);
  await page.waitForSelector("main, .scoreboard-stage, .task-text-stage");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  if (before) { await before(page); await page.waitForTimeout(300); }
  const out = new URL(`../screens/${name}.jpg`, import.meta.url).pathname;
  if (part) await page.locator(part).first().screenshot({ path: out, type: "jpeg", quality: 88 });
  else await page.screenshot({ path: out, type: "jpeg", quality: 88, fullPage: shot.startsWith("host-") });
  console.log(`wrote ${out}`);
  await page.close();
}
await browser.close();
