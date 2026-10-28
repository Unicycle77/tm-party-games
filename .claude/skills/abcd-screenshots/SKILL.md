---
name: abcd-screenshots
description: Use when shooting, re-shooting or sketching any screen of the Taskmaster party app (guest phone, TV, host remote) for docs/screens, a design sketch or the showcase.
---

# Shoot screens from the ABCD party

Every picture of the app comes from the real components, rendered over one made-up party. Never use a mock-up, a hand-drawn screen or an old shot from a different party.

## The one party

- The code is **ABCD**. The guests are Alex, Greg, Mei, Priya, Tom and Sam. Alex and Greg are always in, as a nod to the show. Sam is the one checking in last.
- The TV, the guest phone and the host remote must agree on who's in, who's checked in and what's on. When shots go together (a README set, a showcase section), take them all from the same moment.
- If a new shot would contradict an old one beside it, re-shoot the old one too. Don't mix them.
- The party lives in `docs/guest-shots/shots.tsx`: people, faces, secret tasks, the Noisemaster board, prize photos (`prizes/`), and the tasks (Dice tower, Five socks and the others). Add to it rather than starting a second party.

## How it works

- `docs/guest-shots/fake-database.ts` and its siblings (`fake-app`, `fake-auth`, `fake-storage`) stand in for Firebase. `shots.tsx` seeds the party for the `?shot=<name>` in the URL and mounts the real `Play`, `HostPage`, `Screen` or another page.
- The viewport comes from the shot's name:
  - a guest or host phone is 390x844 at 2x;
  - `tv-*` is 1600x900 at 1x;
  - `*-ipad` is 1100x1024;
  - `host-*` is captured as the whole page.
- `docs/guest-shots/live.tsx` (`live.html`) drives a moving party for anything that has to play out, such as stings, the clock or transitions.

## Adding a shot

1. In `shots.tsx`, add a `shot === "<name>"` branch that seeds the state the moment needs. Tweak the shared party; don't fork it.
2. In `docs/guest-shots/shoot.mjs`, add an entry to `SHOTS`: `"<file-name>": ["<shot>", "<extra query>", async (p) => { /* taps */ }, "<css selector to crop to>"]`.
   - Put a `//` comment above the entry saying what the shot shows.
   - Do the taps with `getByRole` and `getByLabel`, the way a person would.
   - Call `window.scrollTo(0, 0)` before shooting a page with the sticky header.
3. Start the server: `npx vite --config docs/guest-shots/vite.config.ts` (port 5174).
4. Shoot: `node docs/guest-shots/shoot.mjs <file-name> ...`. Leave out the names only if you mean to re-shoot everything.
5. Look at every JPEG before using it. Check for unloaded fonts or photos (see `readyPics`), a half-scrolled header, and wrong names.

## Where shots go

- **Shipped screens** go in `docs/screens/<area>-<screen>-<state>.jpg`, named like `flipchart-guest-drawing` or `clock-host-running`.
  - Every new or changed screen gets a row in `docs/screens/README.md`, in its section: `| file | what it shows |`.
  - Write the row in the app's own words, quote the copy exactly, and end with `(party ABCD, <date>)`.
  - When a shot replaces an older one, say so in the row.
- **Design sketches**, made while a moment is still being agreed, go in the project's shared files, `/mnt/project-files/screens/<feature>/<moment>-sketch.jpg`.
  - Render them through the same harness, from draft components if needed. Commit those as "Draft: …".
  - Show one moment per sketch, and name the sketch in the feature's notes file.
- **The style sheet** gets re-rendered with `node docs/style-sheet/shoot.mjs` whenever the style guide changes.
- **The showcase** uses crops from `docs/screens` in `docs/showcase/img/`. Re-export its share pictures with `NODE_PATH=$(npm root -g) node docs/showcase/export.cjs`.

## Playwright

Chromium and Playwright are already installed in cloud sessions. Don't run `playwright install`.
