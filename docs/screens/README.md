# Screens

Reference screenshots of the app, taken on 2026-10-02. They show the UI at that date and go stale as it changes.

Style sheet (taken on 2026-10-17, from `src/styles.css` and the real `Toggle`, `TaskCard`, `PinField`, `SongStrip` and `GotIt` components; re-render it with [docs/style-sheet](../style-sheet/README.md)):

| File | What it shows |
|---|---|
| `style-sheet.jpg` | Every piece of [the style guide](../style-guide.md) on one page: the six materials, the colour tokens, type, buttons, toggles and inputs, the host header's icon states, row states, cards, aged paper, framed media, QR codes, help and the icons |

Host phone (`/host`, 390px wide):

| File | What it shows |
|---|---|
| `host-choose-game.jpg` | Between games: choose a game, the contestants |
| `host-collecting-entries.jpg` | Before & After while entries come in: stamps, 🔒/🔓, "First up" |
| `host-contestant-on-screen.jpg` | A contestant on the big screen: Before / After / Side by side / Video, Lower the curtain |
| `host-running-order.jpg` | Curtain down between contestants: the running order |
| `host-box-setup.jpg` | [BLANK] in a Box: setting up a round |
| `host-light.jpg` | 💡 The light, "All at once" mode |
| `host-light-got-it.jpg` | 💡 The light's "Got it" list: Sam 1st, Priya just tapped in 2nd ("✓ Priya got it 2nd · 4 points."), their chips dimmed with ✓ (2026-10-17) |
| `host-light-got-it-fix.jpg` | Fixing a mark: Tom's row open with the place chips (3rd pressed in) and "Take Tom off the list" (2026-10-17) |
| `host-light-got-it-listed.jpg` | The light on the task list: "✓ Mei got it 4th · 2 points on the scoreboard.", no nudge (2026-10-17) |
| `host-light-got-it-dq.jpg` | Sam DQ'd on the scoreboard: struck through with "DQ", the others moved up (2026-10-17) |
| `run-of-show-host-light.jpg` | "3 💡 The light · app game" on the task list, with no ▶ Start (2026-10-17) |
| `scoreboard-host-points-light.jpg` | The light's points page: "got it 2nd" or "not yet" for each contestant, "Fastest wins · order from the light · 4 of 8 got it", Sam DQ'd and the others moved up, "Change the order on 💡 The light" (2026-10-17) |
| `noisemaster-host-kept.jpg` | A Noisemaster go while it isn't on the task list: "Kept. Not on the task list yet, so this time isn't on the scoreboard. Add it" (2026-10-17) |
| `host-jukebox.jpg` | 🎵 The jukebox |
| `host-party-settings.jpg` | Party settings (portrait, download button, disconnect) |

Main screen (`/`, 1600×900):

| File | What it shows |
|---|---|
| `main-welcome.jpg` | The welcome: join QR, code, contestants |
| `main-collecting-entries.jpg` | Before & After task card while entries come in |
| `converter-main-whole.jpg` | A useless conversion on the big screen (2026-10-15): "39 dice tall is / 65 LEGO bricks / a 2×4 brick, without its studs" on a paper card |
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
| `scoreboard-host-points.jpg` | Giving points for one task scored by hand: each contestant on one line, the name with "now N" under it and chips DQ, 1 to 5 and "…", "← All tasks", "Next task →" (2026-10-17) |
| `scoreboard-host-points-iphone.jpg` | The points page at iPhone width: still one line per contestant (2026-10-17) |
| `scoreboard-host-points-dq.jpg` | A by-hand task with a DQ after the points: Sam's 4 struck through, the people below him moved up with dashed chips for what they had, "Sam's DQ moved 3 people up. Don't move them", and Tom DQ'd with no points (2026-10-17) |
| `scoreboard-host-points-measured.jpg` | A measured task ("Highest wins"): a box per contestant with "dice" after it, the points over the place, DQ; Alex DQ'd, his 19 struck through, the others moved up; Tom not measured yet (2026-10-17) |
| `scoreboard-host-points-override.jpg` | Overriding a measured point: Mei's points open the chips, "Automatic: 4 for 2nd"; Sam's 3 was set by hand (✎) (2026-10-17) |
| `scoreboard-host-points-measured-ipad.jpg` | The measured page on an iPad in landscape: the box keeps its width, "now N" beside the name (2026-10-17) |
| `scoreboard-host-points-noisemaster.jpg` | Noisemaster's points: the soundboard's times, "↺ 2" restarts, "Fastest wins", Alex DQ'd for giving up, Tom "not played" (2026-10-17) |
| `task-edit-scoring.jpg` | ✎ on a live task: "Scoring" with By hand, Highest wins and Lowest wins under the note (2026-10-17) |
| `scoreboard-host-tasks-contestants.jpg` | The run of show on a wide iPad: tasks and contestants side by side |
| `scoreboard-host-update.jpg` | 🏆 with the scoreboard up: gold "Update the scores · N new tasks" |
| `scoreboard-host-remote-scoreboard-up.jpg` | The remote's main view while the scoreboard is on the big screen |
| `scoreboard-host-name-photo-task.jpg` | ✎ on a Photos task: "Photos: name it (optional)" |
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
| `host-party-settings-name.jpg` | Party settings: renaming the party |
| `run-of-show-host.jpg` | The remote's home, the run of show: scoreboard buttons, "Give points", tasks ending with the tiebreaker task (disabled until there's a tie), contestants with "not yet", Jo here but not on the scoreboard yet |
| `run-of-show-host-task-songs.jpg` | Task songs on the run of show (2026-10-14): a slim strip under each task with a song, one playing in gold with ⏸, "Theme from Jaws · not in the music folder" disabled, the tiebreaker's song |
| `run-of-show-host-task-songs-folder-closed.jpg` | The same with the main screen's music folder not open: every strip disabled, "music folder not open" |
| `task-song-edit.jpg` | ✎ on a task: "Song (optional)" with the jukebox's song list open, the chosen song gold, "as it was on Oct 12" |
| `task-song-edit-missing.jpg` | ✎ on a task whose song left the folder: the title struck through, "Not in the music folder any more. Pick another, or ✕." |
| `converter-host-empty.jpg` | 📏 Useless conversions (2026-10-15): "How much?", the tasks' units first (the next to score chosen), then Height · Length · Weight · Time · Volume and the common units, dimmed while a task's unit is in use |
| `converter-host-result.jpg` | After "Surprise me": three lines to read aloud, the working in small print, "Use a different unit ▾", "Show on the big screen" |
| `converter-host-other-unit.jpg` | "Use a different unit ▴" open: every unit of the kind, the one shown in gold |
| `converter-host-common.jpg` | Measuring in a common unit: Weight, kg, 70 |
| `converter-host-volume.jpg` | Volume (2026-10-17): the five kinds three and two, the volume units (ml L tsp tbsp fl oz cup pt qt gal), 2 cups as a fraction of a minute of shower |
| `converter-host-on-screen.jpg` | The result on the big screen: the toggle on, 📏 glowing in the header |
| `task-unit-edit.jpg` | ✎ on a task: "📏 Measured in" filled in as dice, one is 16 mm, "Stacked up (height)", the line repeating it back |
| `task-unit-empty.jpg` | ✎ on a task with no unit: the name field and "🎲 Dice (16 mm)" |
| `host-game-task-song.jpg` | A game's page on the remote (Photos: best costume) with its task's song strip under the heading |
| `run-of-show-host-playing.jpg` | The run of show during a game: "Now playing: Photos: best costume · Open →" |
| `run-of-show-host-play-a-game.jpg` | "Play a game": the picker for a game that's not on the run of show |
| `run-of-show-host-add-game.jpg` | "+ App game" on the run of show: Noisemaster and Headshot greyed out as "on the list", Photos still offered |
| `secret-tasks-host-who-has-what.jpg` | Secret tasks on the host app (✉): "Who has what" with Sam's task tapped open ("Tap again to hide it."), the pile folded below |
| `secret-tasks-host-pile-open.jpg` | The same page with "▾ The pile (5)" opened |
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
| `run-of-show-host-haul-remote.jpg` | The run of show on the iPad after the last update: gold "🎁 Show the prize haul · Priya", "Lower the curtain" as a link, the tiebreaker task's row disabled |
| `prize-host-adding.jpg` | Prize task on the iPad: the host adding photos to Jo's prize, one sent (★, since Jo had none) and one still sending (rendered from the component with stand-in photos) |
| `run-of-show-host-prizes-in.jpg` | The run of show mid-party: the Prize task's row reads "🎁 2 of 3 prizes in · waiting on Mei" |
| `prize-player-presented.jpg` | Prize task on a guest's phone once the host has started presenting their prize: the receipt with "🔒 Your prize has been presented." in place of "Change my photos" |
| `prize-player-after.jpg` | The same guest later in the party: the prize card shrunk to one line, "🎁 🔒 Your prize has been presented." |
| `run-of-show-host-haul-up.jpg` | The run of show with the haul on the big screen: gold "Lower the curtain", "Back to the scoreboard" as a link |
| `run-of-show-host-haul-waiting.jpg` | The run of show with the scoreboard up and a task still without points: "The prize haul comes once every task has points. Still none for Prize task." over gold "Lower the curtain" |
| `main-prize-haul-winner-only.jpg` | The prize haul when no prize has photos: "Prize Haul" and the winner's headshot alone, "Priya is the winner!" |
| `run-of-show-host-declare.jpg` | The run of show mid-party with a task still unscored: "🏆 Declare the winner" in the task list, under the Tiebreaker task |
| `run-of-show-host-declare-update.jpg` | After "Declare the winner": the scoreboard is up, gold "Update the scores · 1 new task" for one last update, and "Declaring the winner with Prize task unscored. Not yet" |
| `run-of-show-host-declare-haul.jpg` | After that last update: gold "🎁 Show the prize haul · Priya", the winner decided on the points so far |
| `run-of-show-host-declared.jpg` | Back at the curtain after the haul: the declare row reads "Declared · tap to bring the scoreboard and the haul back up" |

Tiebreaker task (taken on 2026-10-13, from the real components with a made-up party):

| File | What it shows |
|---|---|
| `run-of-show-host-tiebreaker.jpg` | The run of show before the party: "Tiebreaker task · only if there's a tie" last in the task list, with its note, no number or ≡, disabled until there's a tie |
| `run-of-show-host-tiebreaker-edit.jpg` | ✎ on the tiebreaker task: its name and note, Save and Cancel, no "Remove this task" |
| `run-of-show-host-haul-remote-tie.jpg` | The run of show after the last update with Sam and Priya tied at the top: gold "Play the tiebreaker task · Sam and Priya", "Lower the curtain" as a link, the tiebreaker row enabled |
| `tiebreaker-host-playing.jpg` | The tiebreaker task's page, with the curtain down: "Tiebreaker task: Sam and Priya", the note to read out, "Tap who won.", nobody tapped |
| `tiebreaker-host-won.jpg` | The same page with Sam tapped as "won the tiebreaker": gold "🎁 Show the prize haul · Sam" from the curtain |

Host pin (taken on 2026-10-13, from the real components with a made-up party):

| File | What it shows |
|---|---|
| `host-pin-connect.jpg` | A new phone connecting to a pinned party: "Connecting to Halloween party ABCD", the pin with 👁, gold "Connect" |
| `host-party-settings-pin-add.jpg` | Party settings with no pin yet: "Host pin" under the party name, a new pin typed in digits, Save |
| `host-party-settings-pin-set.jpg` | Party settings with a pin set: the pin as dots with 👁, "Remove the pin", "Type a new one to change it" |
| `main-pin-open.jpg` | The big screen opening a pinned party: the same pin step at TV size, gold "Open the party", "📺 Show it here too" needing no pin |
| `main-hidden-menu-pin.jpg` | The ☰ Menu with "🔑 Host pin on: a new phone needs it to connect. Remove the pin" |

Video limits (taken on 2026-10-14, from the real `PlayerView` with a made-up party and a 2½-minute test video):

| File | What it shows |
|---|---|
| `before-after-player-too-long.jpg` | Before & After on a guest's phone: the hint now says "up to 2 minutes", and the error after choosing a longer video ("That video is 2:30 long… Trim it in your phone's Photos app, then choose it again."). A file over 300 MB gets the same kind of error before it's even read |
