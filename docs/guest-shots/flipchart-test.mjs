// Checks Start on the Flipchart task against a round from before, on the big screen: needs Playwright and the shots server running:
//   npx vite --config docs/guest-shots/vite.config.ts   (then)   node docs/guest-shots/flipchart-test.mjs
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await p.goto("http://localhost:5174/docs/guest-shots/live.html");
const now = Date.now();
const old = { startedAt: now - 30 * 60_000, endsAt: now - 10 * 60_000 };
const tree = (flipchart) => ({ sessions: { ABCD: { hostUid: "h", begun: true, display: { step: "curtain" }, players: { u1: { name: "Alex", joinedAt: 1 }, u2: { name: "Greg", joinedAt: 2 } },
  scoreboard: { contestants: {}, tasks: { t1: { order: 1, name: "Flipchart", game: "flipchart", minutes: 20 } } }, games: { flipchart } } } });
const ok = (name, cond) => console.log(cond ? "PASS" : "FAIL", name);
const round = () => p.evaluate(() => window.t.read("sessions/ABCD/games/flipchart"));
// Start, then watch the big screen for a second: whether the clock was ever up.
async function start(flipchart) {
  await p.evaluate((t) => window.t.seed(t), tree(flipchart));
  await p.waitForTimeout(200);
  await p.evaluate(() => window.t.begin("t1"));
  let clock = false;
  for (let i = 0; i < 10; i++) { clock ||= (await p.locator(".fc-clock").count()) > 0; await p.waitForTimeout(100); }
  return clock;
}
// 1. left while the clock ran, nothing drawn: no flash, and the round starts fresh
ok("try-out left running: no clock flash", !(await start(old)));
ok("try-out left running: cleared", !(await round())?.startedAt);
await p.evaluate(() => window.t.startClock());
await p.waitForTimeout(300);
ok("try-out left running: Your time starts now puts the clock up", (await p.locator(".fc-clock").count()) === 1);
// 2. closed, blank portraits sent: cleared too
ok("try-out closed: no clock flash", !(await start({ ...old, closed: true, submitted: { u1: true } })));
const blank = await round();
ok("try-out closed: cleared", !blank?.startedAt && !blank?.closed && !blank?.submitted?.u1);
// 3. left while the clock ran, with drawings: closed at once, drawings kept
ok("drawn left running: no clock flash", !(await start({ ...old, pages: { u2: { p1: "x" } } })));
const drawn = await round();
ok("drawn left running: closed, pages kept", drawn?.closed === true && drawn?.pages?.u2?.p1 === "x");
// 4. still running: carries on
ok("still running: clock up", await start({ startedAt: now - 60_000, endsAt: now + 60_000 }));
ok("still running: untouched", (await round())?.closed === undefined);
await b.close();
