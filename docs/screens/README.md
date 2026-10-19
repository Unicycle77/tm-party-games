# Screens

Reference screenshots of the app, taken on 2026-10-02. They show the UI at that date and go stale as it changes. The host remote's pages were redrawn on 2026-10-18 (see "The host remote, less crowded" in [redesign-decisions](../redesign-decisions.md)); the ones dated then are current, and an older host screenshot may still show the previous layout around a part that hasn't changed (the points rows, for instance).

Style sheet (taken on 2026-10-17, from `src/styles.css` and the real `Toggle`, `TaskCard`, `PinField`, `SongStrip` and `GotIt` components; re-render it with [docs/style-sheet](../style-sheet/README.md)):

| File | What it shows |
|---|---|
| `style-sheet.jpg` | Every piece of [the style guide](../style-guide.md) on one page: the six materials, the colour tokens, type, buttons, toggles and inputs, the host header's icon states, row states, cards, aged paper, framed media, QR codes, help and the icons |

Host phone (`/host`, 390px wide):

| File | What it shows |
|---|---|
| `host-choose-game.jpg` | "Play a game" for a game that's not on the run of show: the picker under the task page's top, "Not on the run of show, so it isn't scored" (2026-10-18) |
| `host-collecting-entries.jpg` | An app game's task page while entries come in (Photos: best costume): "Task 2 of 8 · app game", the status line, gold "First up: Sam →", stamps and 🔒, "◫ Show everyone", and Points open below (2026-10-18) |
| `host-contestant-on-screen.jpg` | A contestant on the big screen, a step inside the task page: "Alex, 3 of 4", their controls, "Lower the curtain", Points still at the bottom (2026-10-18) |
| `host-running-order.jpg` | Curtain down between contestants: gold "Next: Alex →", the running order (shown ones dimmed), Points below (2026-10-18) |
| `host-box-setup.jpg` | [BLANK] in a Box: setting up a round |
| `host-light.jpg` | 💡 The light as a side page: "← Back", the status line, then the light's switch, its secret and the "Got it" list (2026-10-18) |
| `host-light-got-it.jpg` | 💡 The light's "Got it" list: Sam 1st, Priya just tapped in 2nd ("✓ Priya got it 2nd · 4 points."), their chips dimmed with ✓ (2026-10-17) |
| `host-light-got-it-fix.jpg` | Fixing a mark: Tom's row open with the place chips (3rd pressed in) and "Take Tom off the list" (2026-10-17) |
| `host-light-got-it-listed.jpg` | The light on the task list: "✓ Mei got it 4th · 2 points on the scoreboard.", no nudge (2026-10-17) |
| `host-light-got-it-dq.jpg` | Sam DQ'd on the scoreboard: struck through with "DQ", the others moved up (2026-10-17) |
| `run-of-show-host-light.jpg` | "7 💡 The light · 3 of 5 got it" on Run of show: tapping the row opens its page, and there is no ▶ Start (2026-10-18) |
| `scoreboard-host-points-light.jpg` | The light's points page: "got it 2nd" or "not yet" for each contestant, "Fastest wins · order from the light · 4 of 6 got it · 1 bonus point", Sam DQ'd and the others moved up, "Change the order on 💡 The light", Mei's +1 bonus (2026-10-17) |
| `noisemaster-host-kept.jpg` | A Noisemaster go while it isn't on the task list: "Kept. Not on the task list yet, so this time isn't on the scoreboard. Add it" (2026-10-17) |
| `host-jukebox.jpg` | 🎵 The jukebox while a song plays: "← Back", the status line, the pressed-in now-playing strip, the jukebox below, and the four header icons with 🎵▶ open (2026-10-18) |
| `host-now-playing.jpg` | A task page with a song playing: the pressed-in "⏸ Eye of the Tiger · 1:55 left" strip under the status line, and the task's own song strip pressed in too (2026-10-18) |
| `host-read-it-out.jpg` | "📏 Read it out" open under a measured task's points: contestant chips with Jordan picked (the last number typed), the conversion card, "Surprise me again", paper "Show on the big screen" (2026-10-18) |
| `host-read-it-out-up.jpg` | The same with it on the big screen: the status line says "a useless conversion", the button is pressed in ("On the big screen · Jordan"), and 📏 is lit in the header (2026-10-18) |
| `host-party-settings.jpg` | Party settings, at the bottom of Run of show: only the night-of switches, the download button and "Disconnect this phone" (the name, portrait and pin moved to Plan the party) (2026-10-18) |

Main screen (`/`, 1600×900):

| File | What it shows |
|---|---|
| `main-welcome.jpg` | The welcome: join QR, code, contestants |
| `main-collecting-entries.jpg` | Before & After task card while entries come in |
| `converter-main-whole.jpg` | A useless conversion on the big screen (2026-10-15): "39 dice tall is / 65 LEGO bricks / a 2×4 brick, without its studs" on a paper card |
| `converter-main-loudness.jpg` | A sound on the big screen: "94.2 dB is / about 26 garbage disposals at once / at the sink" (2026-10-17) |
| `converter-main-fraction.jpg` | The same with a fraction: "exactly 1/300 the height of Big Ben" |
| `main-hidden-menu.jpg` | The ☰ Menu in the top-left corner, open |
| `main-curtain-join-qr.jpg` | The curtain while the host remote's "Show QR code" is open: the join QR in the bottom-right corner, above the address (taken 2026-10-13, stand-in portrait) |

They were rendered from the real components with a made-up session (no Firebase), so names and counts are invented and photos are missing.

Games:

| File | What it shows |
|---|---|
| `noisemaster-soundboard.jpg` | Noisemaster's board: the player's phone before the first press and while playing (every button glowing), and the host phone's board with its words |
| `noisemaster-host-landscape.jpg` | Noisemaster round on the host app in landscape (iPad): controls left, the whole board right, no scrolling |
| `noisemaster-host-typed-words.jpg` | Noisemaster setup with no sound files: the host app (not the main screen) says to click the main screen once, and where recordings go |
| `noisemaster-host-saved.jpg` | A finished Noisemaster go on the host phone: "Saved for the scoreboard: 2nd fastest of 4 so far." under the time (the board is left out of this one) (2026-10-17) |

Scoreboard (taken on 2026-10-12, from the real components with made-up sessions; the photos in the Headshot task are stand-ins):

| File | What it shows |
|---|---|
| `scoreboard-main-before.jpg` | Main screen: the scoreboard at the totals last shown |
| `scoreboard-main-updating.jpg` | Main screen: the scores ticking up after "Update the scores" |
| `scoreboard-main-after.jpg` | Main screen: re-sorted, the leader scaled up |
| `scoreboard-host-start-party.jpg` | Host remote's connect page: "Start a new party", recent parties by name |
| `main-recent-sessions.jpg` | Main screen's start page: "Recent sessions" chips with the party name over the code (a party from before names has the code alone) |
| `scoreboard-host-name-party.jpg` | "Name this party" before starting one from the iPad |
| `scoreboard-host-new-party.jpg` | 🏆 on a new party: not connected yet, the starter Headshot and Prize tasks |
| `scoreboard-host-points.jpg` | Points on a task scored by hand, at the bottom of its page under the title: each contestant on one line, the name with "now N" under it, a small DQ chip, chips 1 to 5, then the bonus chip (Priya's tapped twice, Alex's once), "3 of 5 scored · 3 bonus points" (2026-10-18) |
| `scoreboard-host-points-iphone.jpg` | The points page at iPhone width: still one line per contestant, with the +1 at the end (2026-10-17) |
| `scoreboard-host-points-dq.jpg` | A by-hand task with a DQ after the points: Sam's 4 struck through but his +1 bonus kept, the people below him moved up with dashed chips for what they had, "Sam's DQ moved 3 people up. Don't move them", and Tom DQ'd with no points (2026-10-17) |
| `scoreboard-host-points-measured.jpg` | A measured live task's page: gold "Show the task", the song, the task card, then Points with a number box per contestant and "cm" after it, the points over the place, then "+1" (2026-10-18) |
| `scoreboard-host-points-override.jpg` | Overriding a measured point: Mei's points open the chips 1 to 5 (no "…"), "Automatic: 4 for 2nd"; Sam's 3 was set by hand (✎) (2026-10-17) |
| `scoreboard-host-points-measured-ipad.jpg` | The measured page on an iPad in landscape: DQ right after "Priya now 24", the box keeps its width, "+1" right after the points (2026-10-17) |
| `scoreboard-host-points-noisemaster.jpg` | Noisemaster's points: the soundboard's times, still whole with the +1 column, "↺ 2" restarts, "Fastest wins", Alex DQ'd for giving up, Jo's bonus, Tom "not played" (2026-10-17) |
| `task-edit-scoring.jpg` | A task's ✎ page: its own page with "← Plan the party", the name, the note and "Scoring" always there, then "+ Task text", "+ Song" and "+ 📏 Unit" for what's not set yet, gold Save, Cancel, "Remove this task" (2026-10-18) |
| `task-edit-db-meter.jpg` | "+ 📏 Unit" opened on a task with none: 🔊 dB meter beside 🎲 Dice under "Measured in", one open at a time with Done (2026-10-18) |
| `task-edit-db-meter-on.jpg` | A dB task's ✎ page with its unit section open: 🔊 dB meter pressed, "🔇 DQ if louder than" set to 90 dB, Done and "✕ Remove unit"; the song above it is one summary line (2026-10-18) |
| `scoreboard-host-points-db-dq.jpg` | A dB task, highest wins without going over 100: Priya's 101.2 struck through with "over 100" under her 0, the others moved up, "over 100 dB is a DQ" in the status line, gold "Done: back to Run of show →" (2026-10-18) |
| `scoreboard-host-points-db-lo.jpg` | A quietest-wins dB task: the LO chip under Mei's box while it's typed in, and Jo's LO in 1st (2026-10-17) |
| `scoreboard-host-tasks-contestants.jpg` | Plan the party on a wide iPad: the party line across the top, tasks on the left and contestants on the right, the envelopes line across the bottom (2026-10-18) |
| `scoreboard-host-update.jpg` | 🏆 with the scoreboard up: gold "Update the scores · N new tasks" |
| `scoreboard-host-remote-scoreboard-up.jpg` | The remote's main view while the scoreboard is on the big screen |
| `scoreboard-host-name-photo-task.jpg` | ✎ on a Photos task: "Photos: name it (optional)", no Scoring, the three "+" chips (2026-10-18) |
| `scoreboard-host-photos-named.jpg` | A named photo task running: "Photos: best costume" |
| `checkin-phone-list.jpg` | Guest's phone: "Joining Halloween party", tap your name |
| `player-join-code-first.jpg` | Guest's phone without the QR: the code alone with "Next", then the list to tap a name, and "Not on the list? Type your name" |
| `checkin-phone-confirm.jpg` | "You're Sam?" with gold "That's me" |
| `checkin-phone-not-on-list.jpg` | Not on the list: typing a name, "Back to the list" |
| `checkin-phone-headshot.jpg` | No headshot on file: "Add your headshot" |
| `player-not-right-party.jpg` | A guest's phone after check-in with the quiet "Not Jeffrey? Not the right party?" at the bottom, and where it lands: the party's list to tap a name, with "Wrong party? Enter a different code" |
| `headshot-task-host.jpg` | Headshot task on the remote: running order, "no headshot", Show everyone |
| `headshot-task-host-up.jpg` | A headshot on the big screen: still the one list, Sam pressed in as "on the big screen", Next, Lower the curtain |
| `headshot-task-main.jpg` | Main screen: one headshot in the gold frame |
| `headshot-task-main-everyone.jpg` | Main screen: everyone's headshots |
| `host-party-settings-name.jpg` | Plan the party with the party line opened by "Change": renaming the party, with the portrait and the host pin under it (2026-10-18) |
| `run-of-show-host.jpg` | The remote's home between tasks: "On the big screen: the curtain", the "Up next" card with gold "Start task 4 →", paper "Show the scoreboard" with "Opens on the scores before …", the read-only task list with one state each, and "Plan the party", "Show QR code", "Party settings" at the bottom. The header is four icons, with the party name and code under the title (2026-10-18) |
| `run-of-show-host-scrolled.jpg` | Run of show scrolled down to the task list (party ABCD, Halloween party): the four header icons stay at the top on their dark band, with the page sliding under them. Older host screenshots show the header without its band (2026-10-19) |
| `run-of-show-host-scores-up.jpg` | The scores up: the scoreboard's controls take the top slot, gold "Update the scores" with "On the big screen: the scores, before Hum a theme tune", "Lower the curtain" as a link, and the "Up next" card's button paper (2026-10-18) |
| `run-of-show-host-scores-updated.jpg` | After the update: gold "Lower the curtain" alone in the top slot, the pending note gone (2026-10-18) |
| `task-page-host-live.jpg` | A live task's page: "← Run of show", the task as the title, "Task 4 of 8 · live task", gold "Show the task", the song strip, the note, the task card, then Points with a number box (2026-10-18) |
| `task-page-host-live-up.jpg` | The same with its words on the big screen: "On the big screen: the task", "Show the task" pressed in (2026-10-18) |
| `task-page-host-app-game.jpg` | An app game's page (Photos: best costume) with entries coming in: "Task 2 of 8 · app game", gold "First up: Sam →", Points at the bottom (2026-10-18) |
| `task-page-host-points-done.jpg` | Everyone shown and scored: "All 5 shown." with "◫ Show everyone", Points with Priya's +1, gold "Done: back to Run of show →" (2026-10-18) |
| `task-song-edit.jpg` | "Change" on the song summary line: "Song (optional)" opened with its picker and ✕, Done and "✕ Remove song", the other summary lines kept above and below (2026-10-18) |
| `task-song-edit-missing.jpg` | A task whose song left the folder: the title struck through, "Not in the music folder any more. Pick another, or ✕." (2026-10-18) |
| `converter-host-empty.jpg` | 📏 Useless conversions (2026-10-15; now with "← Back" and the status line on top): "How much?", the tasks' units first (the next to score chosen), then Height · Length · Weight · Time · Volume and the common units, dimmed while a task's unit is in use |
| `converter-host-result.jpg` | After "Surprise me": three lines to read aloud, the working in small print, "Use a different unit ▾", "Show on the big screen" |
| `converter-host-loudness.jpg` | The converter on a dB task's reading: Loudness among the kinds, "94.2 dB is / about 4.2 blenders at once / on high, at the counter" and "a blender is about 88 dB" (2026-10-17) |
| `converter-host-other-unit.jpg` | "Use a different unit ▴" open: every unit of the kind, the one shown in gold |
| `converter-host-common.jpg` | Measuring in a common unit: Weight, kg, 70 |
| `converter-host-volume.jpg` | Volume (2026-10-17): the five kinds three and two, the volume units (ml L tsp tbsp fl oz cup pt qt gal), 2 cups as a fraction of a minute of shower |
| `converter-host-on-screen.jpg` | The result on the big screen: the toggle on, 📏 glowing in the header |
| `task-unit-edit.jpg` | A task with a unit: "📏 Measured in · cm · one is 1 cm" as one summary line with Change, the song and the task text the same (2026-10-18) |
| `task-unit-empty.jpg` | The "+ 📏 Unit" section just opened: the name field and "🎲 Dice (16 mm)" (2026-10-18) |
| `host-game-task-song.jpg` | An app game's page with its task's song strip under the status line (2026-10-18) |
| `run-of-show-host-playing.jpg` | The run of show during a game: "Now playing: Photos: best costume · Open →" |
| `run-of-show-host-play-a-game.jpg` | A game that's not on the list: the same page with no number and no points (2026-10-18) |
| `run-of-show-host-add-game.jpg` | "+ App game" on Plan the party: Noisemaster and Headshot greyed out as "on the list", Photos still offered (2026-10-18) |
| `secret-tasks-host-who-has-what.jpg` | Secret tasks on the host app (✉): "Who has what" with Sam's task tapped open ("Tap again to hide it."), the pile folded below |
| `secret-tasks-host-pile-open.jpg` | "✉ Secret envelopes" opened with Change on Plan the party: "New tasks, one per line", Add to the pile, and the pile to fix or take out (2026-10-18) |
| `secret-tasks-player-pile-drag.jpg` | A guest's phone picking an envelope: the pile, then an envelope being dragged off the others |
| `secret-tasks-player-envelope.jpg` | A guest's envelope: sealed ("Tap the seal to open it."), and open with "Seal it again" |
| `secret-tasks-player-rules.jpg` | A guest's envelope with the circled ? beside the heading, closed and then open on the rules card |
| `secret-tasks-host-send-back.jpg` | "Who has what" with Sam's ✎ open: Save, Cancel and "Send it back to the pile" |
| `prize-player-choose.jpg` | Prize task on a guest's phone after check-in: "🎁 Your prize" under "✓ You're in", one "Add photos" button |
| `prize-player-check.jpg` | Prize task: checking the picks before submitting, thumbnails with ≡ and ✕, the first photo starred ★ for the haul, "+ Add more", gold Submit (stand-in photos) |
| `prize-player-submitted.jpg` | Prize task: the receipt after submitting, "✓ Submitted", the photos in order with ★, "Change my photos" (stand-in photos) |
| `prize-host-picked.jpg` | Prize task on the iPad: the contestants in no set order beside Sam's prize, his photos as previews with ★, nothing on the big screen yet (stand-in photos) |
| `prize-host-up.jpg` | Prize task on the iPad with Sam's second photo on the big screen: gold ring and "on the big screen", ✕ to remove a photo and ☆ to move the ★, Lower the curtain enabled (stand-in photos) |
| `prize-main-photo.jpg` | Main screen: one prize photo hung in the gold frame, labelled "prize · Sam" (stand-in photo) |
| `main-prize-haul.jpg` | Main screen at the end of the party: "Prize Haul" across the top, the winner's headshot in the centre with "Priya is the winner!" and every prize's ★ photo hung around it with "from Sam" placards (stand-in photos) |
| `main-prize-haul-hanging.jpg` | The same haul mid-way through hanging, the prizes going up one by one from the centre outwards |
| `run-of-show-host-haul-remote.jpg` | The run of show after the last update: gold "🎁 Show the prize haul · Priya", "Lower the curtain" as a link (2026-10-18) |
| `prize-host-adding.jpg` | Prize task on the iPad: the host adding photos to Jo's prize, one sent (★, since Jo had none) and one still sending (rendered from the component with stand-in photos) |
| `run-of-show-host-prizes-in.jpg` | Run of show mid-party: the Prize task's row reads "2 of 5 prizes in" (2026-10-18) |
| `prize-player-presented.jpg` | Prize task on a guest's phone once the host has started presenting their prize: the receipt with "🔒 Your prize has been presented." in place of "Change my photos" |
| `prize-player-after.jpg` | The same guest later in the party: the prize card shrunk to one line, "🎁 🔒 Your prize has been presented." |
| `run-of-show-host-haul-up.jpg` | The haul on the big screen: gold "Lower the curtain", "Back to the scoreboard" as a link (2026-10-18) |
| `run-of-show-host-haul-waiting.jpg` | The scoreboard up with a task still without points: "The prize haul comes once every task has points. Still none for Prize task." under gold "Lower the curtain", and the "Up next" card's button paper (2026-10-18) |
| `main-prize-haul-winner-only.jpg` | The prize haul when no prize has photos: "Prize Haul" and the winner's headshot alone, "Priya is the winner!" |
| `run-of-show-host-arrivals.jpg` | Run of show before the first task: "Here so far · 3 of 5" in guest-list order with headshots and "checked in" or "not yet" (dimmed), paper "Show QR code", then the Up next card with gold "▶ Start Headshot" (2026-10-18) |
| `host-new-guest.jpg` | A guest who isn't on the scoreboard comes as a card at the top of the page: "Riley joined, but isn't on the scoreboard. Add them if they're playing." with "Add Riley" and "Not playing" (2026-10-18) |
| `host-new-guest-late.jpg` | The same card on a task page, mid-show: it appears on whatever page the host is on (2026-10-18) |
| `scoreboard-host-not-playing.jpg` | Plan the party after "Not playing": Riley stays under "Here, but not on the scoreboard" marked "not playing", with "+ Add" if they change their mind (2026-10-18) |
| `run-of-show-host-finale.jpg` | Every task has points: the Up next card becomes "The finale · All 8 tasks scored" with gold "🏆 Declare the winner", the quiet end-night link gone (2026-10-18) |
| `run-of-show-host-declare.jpg` | Run of show mid-party with tasks unscored: a quiet "End the night now: declare the winner" under the task list (2026-10-18) |
| `run-of-show-host-declare-update.jpg` | After "Declare the winner": the scoreboard is up, gold "Update the scores" for one last update (the status line names the task it adds), and "Declaring the winner with Prize task unscored. Not yet" (2026-10-18) |
| `run-of-show-host-declare-haul.jpg` | After that last update: gold "🎁 Show the prize haul · Priya", the winner decided on the points so far (2026-10-18) |
| `run-of-show-host-declared.jpg` | Back at the curtain after the haul with a task unscored: "Declaring the winner with Prize task unscored. Not yet" under the Up next card (2026-10-18) |

Tiebreaker task (taken on 2026-10-13, from the real components with a made-up party):

| File | What it shows |
|---|---|
| `run-of-show-host-tiebreaker.jpg` | Plan the party: the tasks with ≡ and ✎ (no ▶ Start), "+ Live task" and "+ App game", then "Tiebreaker task · only if there's a tie" as a summary line with ✎ under the list, then the contestants, "Add contestants, one per line" and "✉ Secret envelopes · 12 in the pile" with Change (2026-10-18) |
| `run-of-show-host-tiebreaker-edit.jpg` | ✎ on the tiebreaker task: its own page with "← Plan the party", name, note, "+ Task text" and "+ Song", no Scoring and no "Remove this task" (2026-10-18) |
| `run-of-show-host-haul-remote-tie.jpg` | The run of show after the last update with Sam and Priya tied at the top: gold "Play the tiebreaker task · Sam and Priya", "Lower the curtain" as a link (2026-10-18) |
| `tiebreaker-host-playing.jpg` | The tiebreaker's page, with the curtain down: "← Run of show", its name as the title, "Tiebreaker · Sam and Priya", the note to read out, "Tap who won.", nobody tapped (2026-10-18) |
| `tiebreaker-host-won.jpg` | The same page with Sam tapped as "won the tiebreaker": gold "🎁 Show the prize haul · Sam" under the status line (2026-10-18) |

Task text (taken on 2026-10-18, from the real components with a made-up party; the monster lines are stand-ins):

| File | What it shows |
|---|---|
| `run-of-show-host-task-text-edit.jpg` | "Change" on a live task's task text: "Task type (optional)" with the heading it makes, then "Task text (optional)" grown to fit the story, Done and "✕ Remove task text"; the song and unit stay as summary lines (2026-10-18) |
| `run-of-show-host-tiebreaker-text-edit.jpg` | The tiebreaker's task text opened with "Change": no type picked, so "Heads the task text: TIEBREAKER TASK." (2026-10-18) |
| `tiebreaker-host-text.jpg` | The tiebreaker's page with its text: gold "Show the task", the song, the note, the story on the task card (TIEBREAKER TASK centred), and "Tap who won." fixed to the bottom with Sam and Priya side by side (2026-10-18) |
| `tiebreaker-host-text-mid.jpg` | The same page scrolled mid-story: the bar stays at the bottom |
| `tiebreaker-host-text-won.jpg` | Priya tapped as "won the tiebreaker": gold "🎁 Show the prize haul · Priya" with paper "Show the task" under it (2026-10-18) |
| `tiebreaker-host-text-up.jpg` | The story on the big screen: "On the big screen: the task", the gold button pressed in (tap it again to lower the curtain) (2026-10-18) |
| `scoreboard-host-points-text.jpg` | A live task's points page with its text: INDIVIDUAL TASK on the card under the note, "Show the task" under "Show the scoreboard" |
| `scoreboard-host-points-text-up.jpg` | The same with its text on the big screen |
| `main-task-text.jpg` | The big screen: the tiebreaker's story on the task card, centred on the curtain, TIEBREAKER TASK centred at the top, the type shrunk to fit |

Host pin (taken on 2026-10-13, from the real components with a made-up party):

| File | What it shows |
|---|---|
| `host-pin-connect.jpg` | A new phone connecting to a pinned party: "Connecting to Halloween party ABCD", the pin with 👁, gold "Connect" |
| `host-party-settings-pin-add.jpg` | The same with no pin yet: "Host pin" under the portrait, "4 to 6 digits…", Save (2026-10-18) |
| `main-pin-open.jpg` | The big screen opening a pinned party: the same pin step at TV size, gold "Open the party", "📺 Show it here too" needing no pin |
| `main-hidden-menu-pin.jpg` | The ☰ Menu with "🔑 Host pin on: a new phone needs it to connect. Remove the pin" |

Video limits (taken on 2026-10-14, from the real `PlayerView` with a made-up party and a 2½-minute test video):

| File | What it shows |
|---|---|
| `before-after-player-too-long.jpg` | Before & After on a guest's phone: the hint now says "up to 2 minutes", and the error after choosing a longer video ("That video is 2:30 long… Trim it in your phone's Photos app, then choose it again."). A file over 300 MB gets the same kind of error before it's even read |
