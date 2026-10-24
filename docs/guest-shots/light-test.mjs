// Checks the light run by the main screen end to end in a real browser (Chromium's fake camera, a pretend Hue
// Bridge): started from the phone, set up from its checklist, switched on, flashing, stopped. Needs Playwright
// and the shots server running:
//   npx vite --config docs/guest-shots/vite.config.ts   (then)   node docs/guest-shots/light-test.mjs
import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const p = await b.newPage({ viewport: { width: 800, height: 900 } });
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await p.goto("http://localhost:5174/docs/guest-shots/light-test.html");
const ok = (name, cond) => { console.log(cond ? "PASS" : "FAIL", name); if (!cond) process.exitCode = 1; };
const read = (path) => p.evaluate((x) => window.t.read(`sessions/ABCD/${x}`), path);
const until = async (fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await p.waitForTimeout(200); } return false; };
const phone = p.locator("#phone");

await p.waitForTimeout(500);

// 1. Not started: the gold Start, no switch, no test
ok("not started: Start the light", await phone.getByRole("button", { name: "Start the light" }).isVisible());
ok("not started: no Light on switch", (await phone.getByRole("switch").count()) === 0);
ok("not started: no Test the light", (await phone.getByRole("button", { name: "Test the light" }).count()) === 0);

// 2. Start: the main screen takes the light, and the phone's checklist opens on the camera
await phone.getByRole("button", { name: "Start the light" }).click();
ok("start: the main screen claims the light", await until(async () => (await read("lightUid")) === "tv"));
ok("start: checklist open", (await read("light/setup")) === true);
ok("camera: starts and reports", await until(async () => { const c = await read("light/camera"); return !!c && (c.people !== undefined || !!c.error); }, 45000));
const camera = await read("light/camera");
console.log("  camera says:", JSON.stringify(camera));
ok("camera: the main screen lists its cameras", await until(async () => !!(await read("light/stage/cameras"))?.length));
ok("camera: the checklist shows the camera row", await phone.getByText(/Camera: /).first().isVisible());
ok("camera: nothing visible on the main screen", await p.locator("#tv").evaluate((el) => [...el.querySelectorAll("*")].every((e) => e.matches("video.light-camera"))));

// 3. The lamp: find the bridge, connect, pick a lamp, flash it
await phone.getByRole("button", { name: "Next: the Hue lamp" }).click();
await phone.getByRole("button", { name: "Find it" }).click();
ok("lamp: bridge found", await until(async () => (await phone.getByRole("button", { name: "192.168.1.50" }).count()) === 1));
await phone.getByRole("button", { name: "192.168.1.50" }).click();
await phone.getByRole("button", { name: "Connect" }).click();
ok("lamp: paired, lamps listed", await until(async () => (await phone.getByRole("button", { name: "Living room (red)" }).count()) === 1));
ok("lamp: the key stays out of the session", !JSON.stringify(await read("light")).includes("secret-key"));
await phone.getByRole("button", { name: "Living room (red)" }).click();
ok("lamp: picked", await until(async () => (await read("light/stage/hue/chosen"))?.["1"] === true));
ok("lamp: ticked in the checklist", await phone.getByText("✓ Hue lamp: Living room").isVisible());
const before = (await p.evaluate(() => window.t.hueLog.length));
await phone.getByRole("button", { name: "Flash the lamp" }).click();
ok("lamp: test flash on and back", await until(async () => {
  const log = (await p.evaluate(() => window.t.hueLog)).slice(before).filter((l) => l.method === "PUT");
  return log.some((l) => l.body.on === true) && log.some((l) => l.body.on === false);
}));

// 4. Done: the evening page, with the switch and the ready line, and the camera off until it's on
await phone.getByRole("button", { name: "Done: the light is ready" }).click();
ok("ready: checklist closed", await until(async () => !(await read("light/setup"))));
ok("ready: ready line", await phone.getByText(/Ready on the big screen's computer: .*Hue lamp: Living room/).isVisible());
ok("ready: no Test the light", (await phone.getByRole("button", { name: "Test the light" }).count()) === 0);
ok("ready: camera off while the light is off", await until(async () => (await read("light/camera"))?.off === true));

// 5. On, and a flash: the lamp goes red, the 💡 pulses, the main screen still shows nothing
await phone.getByRole("switch").click();
ok("on: armed", await until(async () => (await read("light/armed")) === true));
// The camera starting up again holds the page for a while (loading the models), so flash once it's watching.
ok("on: camera watching", await until(async () => (await read("light/camera"))?.people !== undefined, 45000));
const mark = (await p.evaluate(() => window.t.hueLog.length));
await p.evaluate(() => window.t.flash());
ok("flash: 💡 pulses", await until(async () => (await phone.locator(".head-icon.flash").count()) === 1, 3000));
ok("flash: lamp on in red", await until(async () => (await p.evaluate(() => window.t.hueLog)).slice(mark).some((l) => l.method === "PUT" && l.body.on === true && l.body.xy)));
// (Generous: the camera starting up again can hold the page for a few seconds.)
ok("flash: pulse ends", await until(async () => (await phone.locator(".head-icon.flash").count()) === 0, 10000));
ok("flash: nothing visible on the main screen", await p.locator("#tv").evaluate((el) => [...el.querySelectorAll("*")].every((e) => e.matches("video.light-camera"))));

// 5b. The lamp drops mid-game: the alert dot, the line saying what to do, and its link to the lamp step, with no test while it's on
await p.evaluate(() => window.t.bridgeDown(true));
await p.waitForTimeout(600);
await p.evaluate(() => window.t.flash());
ok("lamp down: 💡 alert dot", await until(async () => (await phone.locator(".head-icon.alert").count()) === 1, 8000));
ok("lamp down: says what to do", await phone.getByText(/The Hue lamp isn't responding: couldn't reach the bridge\. Check the lamp/).isVisible());
await p.waitForTimeout(1500);
ok("lamp down: still says so once the flash is over", await phone.getByText(/The Hue lamp isn't responding/).isVisible());
await phone.getByRole("button", { name: "fix it here" }).click();
ok("lamp down: opens on the lamp step", await until(async () => (await phone.getByRole("button", { name: "Living room (red)" }).count()) === 1));
ok("lamp down: no test while the light is on", (await phone.getByRole("button", { name: "Flash the lamp" }).count()) === 0
  && await phone.getByText(/Switch the light off to test the lamp/).isVisible());
await p.evaluate(() => window.t.bridgeDown(false));
await phone.getByRole("button", { name: "Done: the light is ready" }).click();
ok("lamp down: back to the evening page", await until(async () => !(await read("light/setup"))));
ok("lamp back: asked again, the alert goes", await until(async () => (await phone.locator(".head-icon.alert").count()) === 0
  && (await phone.getByText(/The Hue lamp isn't responding/).count()) === 0, 8000));

// 6. Stopped from party settings: the main screen lets go and doesn't take it back
await p.evaluate(() => window.t.stop());
await p.waitForTimeout(1000);
ok("stop: released", (await read("lightUid")) === null && !(await read("light/onStage")));
ok("stop: camera gone from the main screen", (await p.locator("#tv video").count()) === 0);
ok("stop: Start again", await phone.getByRole("button", { name: "Start the light" }).isVisible());

// 7. A reload of the main screen with the light started: it takes it back by itself
await p.evaluate(() => window.t.restart({ onStage: true, armed: true }));
ok("reload: the main screen picks the light back up", await until(async () => (await read("lightUid")) === "tv"));
ok("reload: camera running again", await until(async () => (await p.locator("#tv video").count()) === 1));

await b.close();
