// Renders the showcase at phone width as one tall JPEG for sharing in a text message.
// Usage: NODE_PATH=$(npm root -g) node docs/showcase/export.cjs   (needs Playwright installed globally)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const dir = __dirname;
  const page = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const still = fs.readFileSync(path.join(dir, "export.css"), "utf8");
  const tmp = path.join(dir, "_export.html");
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${page}<style>${still}</style></body></html>`);
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await tab.goto("file://" + tmp);
  await tab.waitForTimeout(1500); // fonts, images and the frame's hang animation
  await tab.screenshot({ path: path.join(dir, "taskmaster-party-showcase.jpg"), fullPage: true, type: "jpeg", quality: 85 });
  await browser.close();
  fs.unlinkSync(tmp);
})();
