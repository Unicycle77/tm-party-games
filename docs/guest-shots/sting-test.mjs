// Checks a task's transition end to end in a real browser (real audio and video, generated on the fly): needs Playwright and the shots server running:
//   npx vite --config docs/guest-shots/vite.config.ts   (then)   node docs/guest-shots/sting-test.mjs
import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await p.goto("http://localhost:5174/docs/guest-shots/live.html");
const tree = (task) => ({ sessions: { ABCD: { hostUid: "h", begun: true, display: { step: "curtain" }, jukebox: { open: true, state: { playing: false } }, scoreboard: { contestants: {}, tasks: { t1: { order: 1, name: "Dice", ...task } } } } } });
const ok = (name, cond) => console.log(cond ? "PASS" : "FAIL", name);
const sting = () => p.evaluate(() => window.t.read("sessions/ABCD/sting"));
const pic = () => p.locator(".sting-stage img").count();
const vid = () => p.locator("video.sting-video").count();
async function run(name, task, files, body) {
  await p.evaluate(([t, f]) => window.t.files(f).then(() => window.t.seed(t)), [tree(task), files]);
  await p.waitForTimeout(200);
  await body();
}
// 1. music (1.5s) + picture: starts, picture up, marked, ends itself, picture gone
await run("music+picture", { transition: "Fanfare", transitionImage: "Slide.png" }, { music: 2 }, async () => {
  await p.evaluate(() => window.t.startSting("ABCD", "t1", false));
  await p.waitForTimeout(700);
  ok("music+picture: picture up while it plays", (await pic()) === 1);
  const s = await sting(); ok("music+picture: sting marked with a start time", !!s?.at);
  await p.waitForTimeout(2500);
  ok("music+picture: ends itself", (await sting()) === null);
  ok("music+picture: picture gone", (await pic()) === 0);
});
// 2. picture alone: stays, until something else goes on the big screen
await run("picture", { transitionImage: "Slide.png" }, { music: 0 }, async () => {
  await p.evaluate(() => window.t.startSting("ABCD", "t1", false));
  await p.waitForTimeout(1000);
  ok("picture alone: still up after a second", (await pic()) === 1 && !!(await sting()));
  await p.evaluate(() => window.t.setDisplay("ABCD", { step: "tasktext", task: "t1" }));
  await p.waitForTimeout(400);
  ok("picture alone: goes when something else is put up", (await sting()) === null && (await pic()) === 0);
});
// 3. music file missing: ends at once
await run("missing", { transition: "Gone" }, { music: 2 }, async () => {
  await p.evaluate(() => window.t.startSting("ABCD", "t1", false));
  await p.waitForTimeout(500);
  ok("missing music: ends at once", (await sting()) === null);
});
// 4. video: plays full screen, ends itself
await run("video", { transitionVideo: "Intro.webm" }, { video: 1 }, async () => {
  await p.evaluate(() => window.t.startSting("ABCD", "t1", false));
  await p.waitForTimeout(500);
  ok("video: on screen", (await vid()) === 1);
  await p.waitForTimeout(3000);
  ok("video: ends itself", (await sting()) === null && (await vid()) === 0);
});
// 5. ending it by hand (the host's strip) stops it
await run("end", { transition: "Fanfare" }, { music: 5 }, async () => {
  await p.evaluate(() => window.t.startSting("ABCD", "t1", true));
  await p.waitForTimeout(500);
  ok("jukebox stopped by Start", (await p.evaluate(() => window.t.read("sessions/ABCD/jukebox/state/playing"))) === false);
  ok("music: sting on", !!(await sting()));
});
await b.close();
