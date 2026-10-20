# Style sheet

One page with every piece of [the style guide](../style-guide.md): materials, colour tokens, type, buttons, toggles, inputs, the host header, row states, cards, aged paper, framed media, QR codes, help and icons. It imports `src/styles.css` and the real `Toggle`, `TaskCard`, `PinField`, `SongStrip`, `GotIt` and `Mosaic` components, so it changes when they do. It's a dev-only page and isn't part of the build.

**Keep it current.** When a change adds or changes something the style guide describes, update `sheet.tsx` to match and re-render the image:

1. `npm run dev`, then open <http://localhost:5173/docs/style-sheet/> to check it.
2. `node docs/style-sheet/shoot.mjs` writes `docs/screens/style-sheet.jpg` (needs Playwright with Chromium).
