# Style guide

The look is a **Taskmaster-style studio**: red curtains, sepia paper, gold picture frames, a typewriter font. Everything should feel like a slightly theatrical, hand-made game show, not a web app. When adding something new, find the closest existing piece below and copy it. Each section links to screenshots in [docs/screens](screens/README.md) that show it in the real app.

[![The style sheet: every component below on one page](screens/style-sheet.jpg)](screens/style-sheet.jpg)

*The style sheet: the materials, tokens, type, icons and every component below, drawn with the app's own `src/styles.css` and components.*

All styling lives in `src/styles.css` (no CSS framework, no CSS-in-JS). The colours are tokens on `:root`. Use the token, not a new hex value.

## 1. The materials

Think of the UI as six physical materials. Every element is made of one of them.

| Material | Used for | Recipe |
|---|---|---|
| **Curtain** (backdrop) | Page background everywhere | `--bg-image` under a dark red tint; `--burgundy-deep` as the fallback colour. Already on `body`; don't paint over it. |
| **Paper** | Buttons, inputs, cards, labels, notices | `background: var(--paper)`, `color: var(--ink)`, `border: 2px solid var(--gold-dark)`, drop shadow |
| **Gold** | The main action, the active choice | `--gold-gradient` fill + `--gold-edge` border (see §3) |
| **Gold frame** | Every photo or video on the stage | `border-image: url("./assets/frame.png")` (the `.frame` / `.review .pic` recipe) |
| **Ink on curtain** | Headings and text sitting straight on the backdrop | `--gold-bright` headings, `--fg` body, `--muted` secondary |
| **Aged paper** | The words of a task: the task card, a Secret Task typed out | Mottled cream gradient, torn edges, typewriter in `#1f1a14`, the red wax seal (see §3 Aged paper) |

Rule of thumb: text never sits on a flat grey or white box. If it needs a surface, it's **paper**. If it's the thing to press, it's **gold**.

## 2. Colour tokens

| Token | Value | Use |
|---|---|---|
| `--burgundy-deep` | `#2a0807` | Fallback backdrop colour |
| `--burgundy` | `#580f0d` | Accent text **on paper**: slot headings, stage-label step name, captions, progress bars |
| `--gold` | `#d9b24c` | `h2`, the `&`, QR borders, preview borders, range sliders |
| `--gold-bright` | `#f3d37a` | `h1`, the big join code, phone headers, "now playing" |
| `--gold-dark` | `#8a6a1f` | The 2px border on every paper element |
| `--gold-edge` | `#7a5a14` | Border of gold buttons |
| `--gold-gradient` | `#f3d37a → #d9b24c → #b8902f` | Fill of gold buttons (`.big`, `.active`) |
| `--paper` | `#efe6d2` | Surfaces |
| `--ink` | `#2b1d12` | Text on paper |
| `--fg` | `#f6ecd6` | Body text on the curtain |
| `--muted` | `#c9b48f` | Secondary text on the curtain, labels, link buttons |
| `--stamp-red` | `#a8201a` | The stamp's ink: "done" (✓ You're in, ✓ Submitted). Only on the stamp. |
| `--ok` | `#9be08a` | Reserved; not used yet. Prefer the red stamp for "done". |
| `--bulb-red` | `#e8412e` | The light's red bulb (`/light`) and its glow. Not for text or UI. |
| (per trigger) | see `src/light/triggers.ts` | "All at once" bulbs: each trigger's `colour`, passed to the bulb as `--bulb`. They live in code, not here, because the Hue lamps need them too. |
| `--wood` / `--wood-dark` | `#9a6634` / `#5e3a18` | The wooden box under the bulb (fill / edges and grain). |
| `--tm-red` | `#c8102e` | Taskmaster red: the Noisemaster soundboard. Not for text. |
| `--key` | `#1e1d1c` | The soundboard's near-black buttons. |

Colours in use that don't have a token yet. Reuse these exact values, and promote them to tokens if you touch them:

- `#7a6a55`: muted text **on paper** (`.status`, `button .muted`)
- `#6b5a44`: hint text inside a paper slot (`.slot-hint`)
- `#8b7a63`: input placeholder
- `#ff9c8a`: error text (`.error`), always on the curtain
- `#1a0f08`: the dark mat behind framed media
- `#e6d6b0`: paper **pressed in** (a marked chip, the row on the big screen)
- `#e3d6ba`: the track of an upload progress bar
- `#f4ecd6 → #e9dcbc → #d9c79c`: aged paper's radial gradient; `#1f1a14` is its ink
- `#e2433a → #b51d17 → #7d0f0b`, rings `#a81a14` / `#6c0c08`: the wax seal (stage task card, envelopes)
- `#fff`: QR code backgrounds and the envelope's white only

Contrast note: `--muted` is for the dark backdrop only. On paper, use `#7a6a55` / `#6b5a44` instead.

## 3. Components

### Buttons
- **Default** is paper: typewriter font, 2px `--gold-dark` border, 6px radius, a `0 3px 0` hard shadow that "presses in" on `:active` (`translateY(2px)`). Already styled on the bare `button` element, so a plain `<button>` needs no class.
- **Primary** (`.big`): the one main action on a screen (Start a session, Join, Submit). Full-width gold gradient, uppercase, bold. **One per screen.**
- **Selected / active** (`button.active`): the same gold as the primary button, for what's currently on screen or playing (stage steps, tabs, the current track, the backup stage controls). One shared rule, `button.big, button.active`, supplies the gold; adding `active` to any button is all it takes.
- **Choices** (`.choices`): picking one of several *settings* (the game, the light's mode and its secret, the Box round's players). A compact, wrapping row of paper chips, three to a row (`.choices.two` for long labels), the chosen one `.active` with `aria-pressed`. Smaller than `.steps`, which are for what the stage shows right now.
- **Marks** (`.choices.marks`): marking several things true at once, like Secret Tasks' scoring ("Did Sam do it?", "Who guessed it?"). The same paper chips, but a marked one stays pressed in, with a ✓ and `aria-pressed`, and never turns gold, so gold stays on the screen's one next action.
- **Points chips** (`.choices.marks.sb-chips`): a contestant's points on the scoreboard, "DQ 1 2 3 4 5 …", one line per contestant. The picked chip is pressed in like a mark. A DQ'd contestant's points stay on their chip, struck through and faded (`.was`); a **dashed** chip (`.before`) is what someone had before a DQ moved them up, explained by a key under the list. DQ is only ever on the host's screens.
- **Measured rows** (`.sb-measured`): a number box per contestant, the unit (or Noisemaster's "↺ 2") after it, the points over the place ("4" over "2nd") as a quiet button that opens the points chips, and a DQ chip. One subgrid, so the columns line up. A point set by hand carries a small ✎; a small dashed number beside the points is the one before a DQ. A DQ'd row strikes its number through; one a dB task's DQ line made says "over 60" under its 0 instead of "DQ". On a lowest-wins dB task, a small LO chip (`.sb-lo`) opens under the box while it's typed in, for the meter's LO. On a wide iPad the box keeps a fixed width. See: [scoreboard-host-points-db-dq.jpg](screens/scoreboard-host-points-db-dq.jpg), [scoreboard-host-points-db-lo.jpg](screens/scoreboard-host-points-db-lo.jpg).
- **Link** (`.link`): no chrome, `--muted`, underlined. For quiet or escape actions: Not Alex? Not the right party?, Disconnect, End session, Lower the curtain, Reset.
- **Icon button** (`.picker .x`, `.picker .lock`): a small paper square next to a row. Always give it an `aria-label`.
- **Disabled**: `opacity: 0.45`, `not-allowed` cursor. Prefer disabling to hiding when the button's position matters (see §5).

See: [host-choose-game.jpg](screens/host-choose-game.jpg) (paper, gold, `.steps`), [host-box-setup.jpg](screens/host-box-setup.jpg) (`.choices`), [checkin-phone-confirm.jpg](screens/checkin-phone-confirm.jpg) (one gold button), [host-collecting-entries.jpg](screens/host-collecting-entries.jpg) (the stamp, 🔒/🔓).

### Toggles
Any on/off setting is a **switch**, not a button whose label flips between "Show" and "Hide". Use `<Toggle label on onChange />` (`src/Toggle.tsx`) and stack them in a `.toggles` list: typewriter label on the left, a switch on the right (a wooden slot that fills gold when on, with a paper knob). Label it with what it controls, stated positively, so on means "shown" or "running" ("🔁 Repeat", "Light on"). Buttons stay for actions and for choosing one of several (`.active`).

See: [host-party-settings.jpg](screens/host-party-settings.jpg).

### Inputs
Paper background, `--gold-dark` border, 6px radius, full width. Wrap them in a `<label>`: labels are a grid with `--muted` text above the field. Pin inputs are `<PinField>` (`src/HostPin.tsx`): typewriter digits with 0.3em tracking and a 👁 inside the field's right end that shows them; hidden as dots by default, except while choosing a new pin. Game-code inputs use the typewriter font with wide letter spacing (`0.3em`), uppercase, `maxLength={4}`, `placeholder="ABCD"`, plus a 📷 scan button beside them in a `.row`.

See: [host-pin-connect.jpg](screens/host-pin-connect.jpg) (pin), [player-join-code-first.jpg](screens/player-join-code-first.jpg) (game code).

### Cards and panels
- **Player tile** (`.tile`): an index card, 3px radius, **slightly rotated** (`-1deg`, `1.2deg`, `-0.4deg` by position). On hover it straightens, grows 4% and gets a gold ring.
- **Slot** (`.slot`): the phone's paper panel. The heading is `--burgundy`, the hints are `#6b5a44`.
- **Read-aloud card** (`.slot.conversion`, and `.conversion-card` on the big screen): the three lines of a useless conversion on plain paper: the lead and the "what was measured" line in typewriter ink, the result between them in large `--burgundy` typewriter. On the big screen it hangs on the curtain like a photo (§6). A sound is always "about", rounded to two figures, and counted "at once" ("about 26 garbage disposals at once"). See: [converter-host-result.jpg](screens/converter-host-result.jpg), [converter-main-whole.jpg](screens/converter-main-whole.jpg), [converter-main-loudness.jpg](screens/converter-main-loudness.jpg).
- **Floating label** (`.stage-label`, `.review-name`, `.review-loading`, `.sound-hint`): a paper strip over the stage, typewriter font, centred, with a drop shadow.

### Row states
Lists of people, tasks and photos on the host remote use the same handful of states. Reuse them rather than inventing a colour:

| State | Look | Where |
|---|---|---|
| Already shown | Dimmed to `opacity: 0.55` | The running order |
| Next up | 3px `--gold` outline, plus "← next" in the row's muted line | The running order, the task list |
| On the big screen now | **Pressed in**: down 2px, inset shadow, `#e6d6b0` fill, bold, plus "on the big screen" in words | Headshot task's list (`li.up`), the same as a marked chip (§ Marks) |
| On the big screen now (a photo) | Gold ring: `--gold-edge` border and a `--gold-bright` glow | Prize task's previews |
| The chosen one | A small gold `★` disc in the corner; `☆` on the others moves it | Prize photos (the one the haul shows) |
| Not available yet | Disabled (`opacity: 0.45`, `not-allowed`), with a muted line saying when it will be ("· only if there's a tie"). Its side buttons, like ✎, still work | The tiebreaker task |
| Already used | Disabled, with a small uppercase "on the list" label inside | "+ App game" choices |
| Can't play | Disabled, with the reason in words where the song's length goes ("music folder not open", "not in the music folder") | A task's song strip |
| Playing | Gold (`button.active`), ▶ becomes ⏸ | A task's song strip, the jukebox's current song |
| Disqualified | DQ chip pressed in; what they'd have had struck through and faded (`.was`), never removed | The points page |
| Over a dB task's line | The same DQ, with "over 60" under the 0 instead of "DQ" | The points page |
| Before a DQ moved them | A dashed outline (`.before`, `.sb-before`), with a key under the list | The points page |
| Not tappable but not unavailable | `.sb-task:disabled` keeps full opacity: the row is just information until there are contestants | Task rows before anyone is added |

State is never colour alone: each one also has its words (✓, "next", "on the big screen", "scored", "not yet").

See: [scoreboard-host-points-dq.jpg](screens/scoreboard-host-points-dq.jpg), [scoreboard-host-points-measured.jpg](screens/scoreboard-host-points-measured.jpg), [headshot-task-host-up.jpg](screens/headshot-task-host-up.jpg), [prize-host-up.jpg](screens/prize-host-up.jpg), [run-of-show-host-tiebreaker.jpg](screens/run-of-show-host-tiebreaker.jpg), [run-of-show-host-add-game.jpg](screens/run-of-show-host-add-game.jpg).

### Help
`.help-q`: a circled `?` beside a heading, drawn in `currentColor` with no fill. It opens an explanation in place, and fills `--burgundy` while open (`aria-expanded`). Use it when the rules are worth having but not worth showing every time (Secret Tasks' envelope rules). See: [secret-tasks-player-rules.jpg](screens/secret-tasks-player-rules.jpg).

### Aged paper
The **task card** (`.task-card`, `TaskCard.tsx`) is what a task is written on: aged, slightly mottled paper (a radial gradient `#f4ecd6 → #e9dcbc → #d9c79c`) with **torn edges** (a `clip-path` polygon), typewriter text in `#1f1a14`, a deep drop shadow, and the red TM **wax seal** (`.wax-seal`) in its bottom-right corner. `.task-card.small` is the same card at phone size. The same paper, without the tear, is the card a Secret Task is typed on (`.env-letter`, `.finale-card`), where the heading is uppercase `--burgundy`. Use it only for **the words of a task**, never for UI: controls stay on ordinary paper.

See: [main-collecting-entries.jpg](screens/main-collecting-entries.jpg), [secret-tasks-player-envelope.jpg](screens/secret-tasks-player-envelope.jpg).

### Hidden menu
`.lobby-menu` (`LobbyMenu` in `Screen.tsx`, borrowed from tm-scoreboard): a paper `☰ Menu` button fixed in the top-left corner, invisible until the mouse comes near. It opens a burgundy panel with a 3px `--gold` border for setup hints and quiet exits (host remote status, `/screen` and `/light` hints, End session). Escape or a click outside closes it. Put anything the room doesn't need to read here instead of under the players.

See: [main-hidden-menu.jpg](screens/main-hidden-menu.jpg).

### Stamp
`.stamp` is a red-ink rubber stamp tilted `-4deg`: uppercase, bold, 3px `--stamp-red` border, a faint red fill. It's the **one** visual for "done", and it always carries a ✓ and words (✓ You're in, ✓ Submitted). Don't invent a second "success" style. Red works here because it's the show's own ink (the red seal), not a warning, so **errors never look like a stamp**: they're plain `.error` text, with no border, tilt or ✓.

### Framed media
Photos and videos on the stage are **always** in the gold frame (`frame.png` as a 9-slice `border-image`). The frame hugs the media's real aspect ratio (`--ratio`, set on load) and grows to the largest size that fits. Never crop the media (`object-fit: contain`). On phones, previews get a simpler 3px `--gold` border instead.

See: [headshot-task-main-everyone.jpg](screens/headshot-task-main-everyone.jpg), [prize-main-photo.jpg](screens/prize-main-photo.jpg).

### QR codes
White background, 6px `--gold` border (`--paper` border for the host QR, so the two can't be confused), with a typewriter caption underneath ("Players scan here" / "Host scans here").

See: [main-welcome.jpg](screens/main-welcome.jpg).

## 4. Type

- **Typewriter** (`var(--typewriter)`, Veteran Typewriter): all headings, buttons, captions, labels on the stage, codes and "now playing". This is the show's voice.
- **System sans** (`system-ui`): body text, hints, form labels, errors. It keeps long text readable.
- Headings: `h1` in `--gold-bright` with a `0 2px 0` shadow; `h2` in `--gold`. Normal weight, slight letter spacing (`0.04em`).
- Uppercase + letter spacing is for **short labels only**: the stamp, statuses, the stage step name, primary buttons.
- Codes are huge and spaced out: `5.5rem`, `0.3em` tracking, a gold glow. They have to be readable from the back of the room.
- Numbers that change in place (durations, counts) use `font-variant-numeric: tabular-nums`.

## 5. The three screens

Each screen has its own rules. Know which one you're designing for.

### Stage (`/`: the TV)
- Seen from across a room. Size things in **viewport units** (`vmin`, `vh`, `clamp()`), not px, so they scale with the TV.
- During a reveal the **media is the whole show**: full screen, framed, with nothing but the small paper label at the bottom.
- No visible controls. The backup `.stage-controls` bar only fades in while the mouse moves, and the cursor hides when idle. Keyboard shortcuts mirror the host remote.
- Never show browser media controls on the stage.
- On the curtain and while entries come in, the join address sits small in the bottom-right corner (`.corner-code`: "site/play · ABCD" in `--muted`, the code in gold typewriter), so a late guest can still join. While the host remote's "Show QR code" is open, the join QR (24vh, `--gold` border, no caption: the address underneath is its caption) sits just above it.
- **Prize haul** (`.haul`): the finale. "Prize Haul" as a huge typewriter `h1` across the top, the winner's headshot in the largest gold frame in the centre with a paper placard ("Priya is the winner!"), and each prize's ★ photo in smaller frames around it, each with a small "from Sam" placard. The prizes hang one by one from the centre outwards.
- **The scoreboard is the one exception to the curtain.** It's ported as is from tm-scoreboard (`src/scoreboard/scoreboard.css`, VodBox, MIT): its own sepia typewriter photo (`assets/background.jpg`), each contestant's headshot in a gold frame over their score on a red wax seal, sorted with the leader scaled up, sliding to new places over 2s. It's sized in fixed px and scaled to the screen. Leave its look alone so it stays the show's own; new stage screens follow the curtain rules above, not this one.

See: [main-welcome.jpg](screens/main-welcome.jpg), [main-collecting-entries.jpg](screens/main-collecting-entries.jpg), [headshot-task-main.jpg](screens/headshot-task-main.jpg), [main-prize-haul.jpg](screens/main-prize-haul.jpg), [scoreboard-main-after.jpg](screens/scoreboard-main-after.jpg).

### Player phone (`/play`)
- One column, `max-width: 480px`, `gap: 1rem`. Big tap targets (the default button padding is the minimum).
- Always tell the player what state they're in, in plain words ("Not submitted yet", "Submitted and locked").
- Keep the main action (`.big`) near their thumb, and put quiet exits (`.link`) at the bottom.
- Once their part is done, a finished card shrinks to one line with its state ("🎁 🔒 Your prize has been presented."), so the next thing they need is on top.

See: [checkin-phone-list.jpg](screens/checkin-phone-list.jpg), [checkin-phone-confirm.jpg](screens/checkin-phone-confirm.jpg), [prize-player-check.jpg](screens/prize-player-check.jpg), [prize-player-submitted.jpg](screens/prize-player-submitted.jpg), [prize-player-after.jpg](screens/prize-player-after.jpg).

### Host remote (`/host`)
- Same phone column, but it's a **control panel**: every control keeps its position on every view. Disable controls that don't apply; don't remove them (see the comment in `HostRemote.tsx`).
- **Header** (`HostPage.tsx`): `🎮 Host · Party name · CODE`, then five icon buttons, in this order: 🏆 the run of show (glows while the scoreboard is on the big screen), 🎵 the jukebox (shows ▶ and glows while a song plays), ✉ Secret Tasks, 💡 the light (glows while it's on), 📏 Useless conversions (glows while a conversion is on the big screen). The open one has a `--gold-bright` outline. Idle icons are faded and greyed (`.head-icon`); `.lit` is the gold glow, meaning "running"; `.alert` is a small burgundy dot, meaning "needs the host". Never use the glow for "needs you". 🎵 ✉ 💡 📏 open in place of the show with "← Back to the game" (or "← Back to the run of show"). A new all-evening feature gets a header icon, not another section on a page.
- **Home is the run of show** (🏆, `ScoreboardRemote.tsx`). Every party opens on it. Top to bottom:
  1. `Run of show` heading, and while a game is on, "Now playing: Photos: best costume" with a paper "Open →".
  2. One `.on-screen` line saying what the big screen shows ("On the big screen: the scoreboard", "…: not connected yet"), with at most one `.muted.small` line under it.
  3. **The one next thing** in gold: "Update the scores · 2 new tasks", "🎁 Show the prize haul · Priya", "Play the tiebreaker task · Sam and Priya", or "Lower the curtain". The quiet way out sits under it as a `.link`. When nothing is next, it's a paper button ("Show the scoreboard").
  4. "Give points: 2  Build the tallest tower →": a paper shortcut to the next unscored task.
  5. **Tasks (N)**: one row per task in running order: `≡` (drag to reorder), the task as a left-aligned paper button (number, name, "· app game", the note in quotes, then "← next" or "scored"), `▶ Start` for an app game, and `✎`. A task with a song has a slim **song strip** (`SongStrip.tsx`, `.sb-song`) under its row, in line with the task card: "♪ title ▶ 2:40", gold with ⏸ while it plays. It's a small remote for the jukebox, and the same strip sits under the heading on the task's own page (points page, game page, tiebreaker page). ✎ picks it from the jukebox's song list (`SongField`). The tiebreaker task is always last, outside the numbering, with no ≡ (see Row states, §3). Under the list, "+ Live task" and "+ App game" side by side.
  6. **Contestants (N)**: `+` (give points) · name with "checked in" / "not yet" on the right · `×`. Guests who are here but not on the scoreboard come after them as plain text with "+ Add", then a "Name of the next contestant" field.
  7. Quiet links at the bottom: "Play a game that's not on the list", "Show QR code", "Party settings".
- **On a wide iPad** (≥1000px) the run of show splits into two columns, tasks on the left and contestants on the right, with the heading, the big-screen line and the gold action spanning both.
- **Inside a game** the same shape holds: the game's name as an `h2` with "← Run of show" as a link beside it, the `.on-screen` line, the one next action in gold ("First up: Alex →", "Next: Priya →"), then the contestants as the running order.
- **Size by use:** `.steps` (big) only for what the stage shows right now; `.choices` (compact) for settings; toggles for on/off. If a section needs a paragraph of explanation, keep it one `.muted.small` line.
- `.steps` grids (`.two`, `.three`) for big side-by-side buttons; `.active` shows what the stage is currently showing.

See: [run-of-show-host.jpg](screens/run-of-show-host.jpg), [run-of-show-host-playing.jpg](screens/run-of-show-host-playing.jpg), [scoreboard-host-tasks-contestants.jpg](screens/scoreboard-host-tasks-contestants.jpg) (wide iPad), [scoreboard-host-points.jpg](screens/scoreboard-host-points.jpg), [run-of-show-host-task-songs.jpg](screens/run-of-show-host-task-songs.jpg), [task-song-edit.jpg](screens/task-song-edit.jpg), [host-contestant-on-screen.jpg](screens/host-contestant-on-screen.jpg), [host-running-order.jpg](screens/host-running-order.jpg).

## 6. Motion

- **Hang**: framed media drops in like a picture being hung, with a small overshoot and settle (`@keyframes hang`, ~0.6–0.7s, `cubic-bezier(0.2, 0.9, 0.3, 1.15)`). Stagger pairs by 0.25s.
- **Press**: buttons move down 2px on press and brighten slightly on hover.
- **Fades**: 0.15–0.25s for things appearing and disappearing (controls, photos once loaded).
- **Tick and re-sort**: the scoreboard's scores count up in place, then the contestants slide to their new order (2s).
- **Fade-out note** (`.fade-note`): a short confirmation that holds for 3s, then fades over 1s.
- Show things only once they're ready. Photos stay invisible until they've loaded, and the review waits for every photo, then reveals them all together.
- Every animation has a `prefers-reduced-motion: reduce` opt-out.

## 7. Icons and copy

**Icons are emoji and Unicode symbols, not an icon library.** Reuse the existing set so each one keeps its meaning:

| Symbol | Meaning |
|---|---|
| 🎮 | Host remote |
| 🏆 | The run of show and the scoreboard (host header) |
| 🎁 | The Prize task, prizes in, the prize haul |
| ★ / ☆ | The chosen prize photo, the one the haul shows / move the ★ here |
| ≡ | Drag to reorder (tasks, prize photos) |
| ? (circled) | Read the rules (`.help-q`) |
| ▾ / ▸ | A folded section, open / closed ("▾ The pile (5)") |
| + | Add (a live task, an app game, a contestant, more photos) |
| → | Go to the next thing ("Give points: … →", "Next task →", "Open →") |
| ☰ | The main screen's hidden menu |
| 📺 / 🎵 | Screen tab / Jukebox |
| 📷 | Scan a QR code |
| ◫ | Side by side, review everyone |
| ▶ ⏸ ↺ | Play, pause, restart; `▶ Start` starts an app game from the run of show |
| ← | Back |
| ✕ / × | Close / remove |
| ✉ | Secret Tasks: the envelope, the host's ✉ page |
| ✎ | Fix this text in place |
| \|\|\|\| | Points, as tally marks (Secret Tasks only) |
| ✓ | Submitted |
| 🔒 🔓 | Locked / may resubmit |
| 🔇 | Sound blocked; a dB task's "DQ if louder than" line |
| 💡 | The light (`/light`), its Hue lamp and its host-remote tab |
| 📏 | Useless conversions: the host's tool, and a task's "Measured in" |
| 🎲 | The dice preset for a task's unit |
| 🔊 | The dB meter preset: a task measured in dB |
| 👁 | Show a hidden pin (inside the field, pressed in while shown) |
| 🔑 | The host pin, in the big screen's hidden menu |
| … | In progress (`Joining…`, `sending…`) |

**Copy voice:**
- Short, friendly and plain; talk to the person ("your video", "Ask the host if you need to change it").
- Sentence case for buttons and headings ("Start a session", "Choose file"). Uppercase only comes from CSS on short labels.
- In-progress labels end in a real ellipsis `…` (not `...`): `Connecting…`, `Submitting…`.
- Errors say what happened and what to do next: "Upload failed. Try again.", "No session found for code ABCD."
- Ask before destructive actions with `confirm()`, and name the consequence ("Remove Sam and their video and photos? They can then rejoin fresh.").

## 8. Writing CSS here

- Add rules to `src/styles.css` under the section they belong to (`main screen: lobby`, `reveal stage`, `phones`, `jukebox`, `review`…), and give a new section a `/* ---- name ---- */` header.
- Plain, short, lowercase-hyphen class names tied to what the thing *is* (`.stamp`, `.slot`, `.tile`), not what it looks like.
- A one-line comment explains *why*, when a rule is doing something clever (the frame sizing, the rotated tiles).
- Use tokens for colour. A new colour needs a reason, and it becomes a token.
- Layout with `display: grid` / `flex` and `gap`; avoid margins between siblings.
- Check each change at phone width (~375px), on a laptop, and on a TV-sized window.
