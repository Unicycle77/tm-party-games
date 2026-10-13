// Renders the showcase at phone width as one JPEG per moment, for sharing together in a text message.
// Usage: NODE_PATH=$(npm root -g) node docs/showcase/export.cjs   (needs Playwright installed globally)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// [file name, from the top of this element, to the bottom of this one]. The tasks are one
// picture each, or that section alone would be as tall as the rest put together.
const SHOTS = [
  ["1-opening", "section.hero", "section.hero"],
  ["2-walk-in", "#check-in", "#check-in"],
  ["3-tasks-noisemaster", "#tasks", ".task:nth-child(1)"],
  ["4-tasks-secret-tasks", ".task:nth-child(2)", ".task:nth-child(2)"],
  ["5-tasks-prize", ".task:nth-child(3)", "#tasks"],
  ["6-run-the-show", "#host", "#host"],
  ["7-scoreboard", "#scoreboard", "#scoreboard"],
  ["8-prize-haul", "#haul", "section.signoff"],
];
const PAD = 14; // curtain around a task cut out of the middle of its section

(async () => {
  const dir = __dirname;
  const out = path.join(dir, "share");
  fs.mkdirSync(out, { recursive: true });
  const page = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const still = fs.readFileSync(path.join(dir, "export.css"), "utf8");
  const tmp = path.join(dir, "_export.html");
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${page}<style>${still}</style></body></html>`);
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await tab.goto("file://" + tmp);
  await tab.waitForTimeout(1500); // fonts, images and the frame's hang animation
  for (const [name, from, to] of SHOTS) {
    const a = await tab.locator(from).boundingBox();
    const b = await tab.locator(to).boundingBox();
    const top = from.startsWith(".task") ? a.y - PAD : a.y;
    const bottom = to.startsWith(".task") ? b.y + b.height + PAD : b.y + b.height;
    await tab.screenshot({ path: path.join(out, `${name}.jpg`), type: "jpeg", quality: 85, fullPage: true,
      clip: { x: 0, y: top, width: 390, height: bottom - top } });
  }
  await browser.close();
  fs.unlinkSync(tmp);
})();
