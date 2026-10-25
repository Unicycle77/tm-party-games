# Screens

Reference screenshots of the app, taken on 2026-10-02. They show the UI at that date and go stale as it changes. The host remote's pages were redrawn on 2026-10-18 (see "The host remote, less crowded" in [redesign-decisions](../redesign-decisions.md)); the ones dated then are current, and an older host screenshot may still show the previous layout around a part that hasn't changed (the points rows, for instance).

Style sheet (taken on 2026-10-17, from `src/styles.css` and the real `Toggle`, `TaskCard`, `PinField`, `SongStrip`, `GotIt` and `Mosaic` components; re-render it with [docs/style-sheet](../style-sheet/README.md)):

| File | What it shows |
|---|---|
| `style-sheet.jpg` | Every piece of [the style guide](../style-guide.md) on one page: the six materials, the colour tokens, type, buttons, toggles and inputs, the host header's icon states, row states, cards, aged paper, framed media, QR codes, help and the icons |

Guest phone (`/play`, 390px wide), redrawn on 2026-10-18 in the host remote's layout (rendered from the real components over an in-memory party with `docs/guest-shots`: `npx vite --config docs/guest-shots/vite.config.ts`, then `node docs/guest-shots/shoot.mjs`). These replace the older `checkin-phone-*`, `player-*`, `secret-tasks-player-*`, `prize-player-*` and `before-after-player-*` screenshots below wherever they show the same screen:

| File | What it shows |
|---|---|
| `guest-checkin-list.jpg` | Tap your name: "HELLO my name is" tags scattered on the curtain, everyone but Sam faded with "✓ here", status line "Find your name tag and tap it" |
| `guest-checkin-confirm.jpg` | "You're Sam?" on the card: the host's headshot in a gold frame, the Headshot task's words under it, gold "That's me", "Checking in · step 1 of 3" (2026-10-24: the rules step counts) |
| `guest-checkin-headshot.jpg` | No headshot on file: "To do now · Add your headshot", the same frame, the Headshot task's words, two paper buttons |
| `guest-checkin-house-rules.jpg` | The Taskmaster rules at check-in, "Checking in · step 2 of 3": the rules card (numbered rules, the last paragraph, TASKMASTER with the seal under it) and gold "Got it →" (2026-10-24, ABCD party) |
| `guest-checkin-rules.jpg` | Secret Tasks at check-in, moment one: the whole rules card and gold "Got it: pick an envelope →" |
| `guest-checkin-envelopes.jpg` | Moment two: "Pick an envelope ?" over the pile on the curtain |
| `guest-home-todo.jpg` | Home with something to do: "1 thing left to do", the "To do now" card for the secret envelope, "Your to-do list" below |
| `guest-home-prize-ask.jpg` | The prize question: the prize task's words in quotes, gold "Yes, add photos →", paper "Not now" |
| `guest-home-waiting.jpg` | Nothing left to do: Sam's own name tag, "Put your phone away. People are starting to stare.", the to-do list with "✓ Taskmaster rules · agreed" first and the prize "optional" (2026-10-24) |
| `guest-task-photos.jpg` | A task on: "Task 2 of 8 · Photos", the task's words, the photo controls inside the card, "It's task time. Send your photo." |
| `guest-task-photos-sent.jpg` | The receipt after sending: "✓ Submitted", the photo, the 🔒 line, "Photo sent. Put your phone away…" |
| `guest-prize-photos.jpg` | "Your prize photos": the prize words, thumbnails with ≡ ✕ ★, the ★ line, gold "Submit 3 photos" |
| `guest-join-code.jpg` | Joining without the QR: "Party code" with 📷 and "It's on the big screen.", Next waiting for 4 letters |
| `flipchart-guest-front.jpg` | Flipchart before the host starts the clock: the task's words and the front page with the show's pattern (3, 9, 10, 16 upside down), flipping locked (2026-10-21) |
| `flipchart-guest-drawing.jpg` | Flipchart mid-task: one page, markers, Undo, ← and →, "It's task time." (no time left on any guest phone) and no page number (2026-10-21) |
| `flipchart-guest-send.jpg` | The last page asks "Send your portrait? You can't change it after." (send is only ever on page 16) (2026-10-21) |
| `flipchart-guest-sent.jpg` | Sent: the front page closed, "✓ Submitted" and the locked line (2026-10-21) |
| `flipchart-main-clock.jpg` | The big screen while they draw: the show's clock as the one focus, the tally beside it (2026-10-21) |
| `flipchart-main-portrait.jpg` | Sam's finished portrait in the gold frame, pages in the show's pattern; he drew as if the pages ran in reading order, so his face lands scrambled (re-shot 2026-10-21) |
| `flipchart-main-everyone.jpg` | Everyone's portraits at once, mostly in pieces as at a real party: only Greg followed the front page (a clean face), Mei forgot to turn the upside-down pages, Alex and Sam drew in reading order, Priya down the columns and Tom starting from 16 (re-shot 2026-10-21) |
| `flipchart-host-start.jpg` | Host task page before the start: the clock at its limit and gold "Your time starts now" (2026-10-21) |
| `flipchart-host-live.jpg` | Host task page while it runs: the clock, "+5 minutes", "End now: send everyone's" (2026-10-21) |
| `flipchart-host-edit.jpg` | The task's ✎ page: what they draw and the time limit (10, 15, 20 or 30 minutes) (2026-10-21) |
| `clock-host-set.jpg` | ⏱ The clock, set from a task: Dice tower's time limits read from its words (3 min for part 1, which is on the big screen, 2 min for part 2), quick times, "Your own", "+ Song to end on", gold ▶ Start (2026-10-21) |
| `clock-host-song.jpg` | The same with a song that ends on 0:00: "♪ Ends on: Think music · 0:32" and the line saying when it starts (2026-10-21) |
| `clock-host-running.jpg` | While it counts: the times locked and dimmed, pressed-in "⏸ Stop", quiet "+1 minute" and "Reset" (2026-10-21) |
| `clock-host-task.jpg` | The task page while the clock counts: the clock strip under "On the big screen", and the ⏸ beside it (2026-10-21) |
| `clock-host-turns.jpg` | Started from the task page, one player at a time: Hum a theme tune, "1 minute" each; Alex's turn over ("time's up" and ✕ to take the clock down beside the strip), gold "▶ Start Greg's turn · 1 min", "Who's next · tap to change" with Alex dimmed and ✓, Greg gold, and "Not taking turns" (2026-10-25) |
| `clock-main-turn.jpg` | The big screen during Greg's turn: the clock, with the stage's paper label "GREG's turn" under it (2026-10-25) |
| `clock-host-untimed.jpg` | Five socks, whose words give no time: only a quiet "⏱ Time this task" under the card, into ⏱ (2026-10-25) |
| `clock-host-done.jpg` | ⏱ at 0:00: the times unlocked (3 min still picked), gold "▶ Start again · 3 min" and "Time's up. Pick a time, or start the same again." (2026-10-25) |
| `time-limit-host-edit.jpg` | Dice tower's ✎ with Task text open: "Time limit (optional)" under each part, 4 min set on part 1 ("⏱ offers 4 min for part 1."), part 2 empty with its words' 2 min greyed ("Empty, so ⏱ reads it from the words…") (2026-10-24) |
| `time-limit-host-summary.jpg` | The same ✎ with Task text closed: "Task text · 2 parts · INDIVIDUAL, TEAM · ⏱ 4 min, 2 min" (2026-10-24) |
| `time-limit-host-clock.jpg` | ⏱ set from it: "4 min · part 1" (set in ✎, no quote) and "2 min · part 2, “You have 2 minutes.”" from the words (2026-10-24) |
| `clock-host-stopwatch.jpg` | The stopwatch: contestant chips (Alex timed, Greg going), "Times go into task 7, Five socks · lowest wins", the face with tenths (2026-10-21) |
| `clock-host-flipchart.jpg` | ⏱ while Flipchart's clock runs: the one clock in the party, read-only, "Run it from the task" (2026-10-21) |
| `clock-main-countdown.jpg` | The big screen with the clock shown: the show's clock alone, over whatever was up (2026-10-21) |
| `clock-main-stopwatch.jpg` | The big screen with a stopwatch: counting up, a small tenths digit (2026-10-21) |
| `guest-noisemaster-up.jpg` | "You're up!": the phrase and the board in the card |
| `main-noisemaster.jpg` | Noisemaster on the big screen mid-go: the words said so far as gold tiles, the red board with the last button lit green, the player's name, the clock, "2 of 4 words" and "1 restart" (2026-10-18) |
| `main-noisemaster-done.jpg` | Noisemaster on the big screen when the go is finished: all four words as gold tiles, the clock stopped at 0:41.3, "4 of 4 words", "2 restarts" and the ✓ Done stamp (2026-10-21) |
| `main-sting.jpg` | The big screen just after Start on Dice tower: the task's transition picture edge to edge on black, shown whole, no frame or corner code, while its music plays (2026-10-22) |
| `main-gate-transitions.jpg` | The gate after a refresh: under "✓ Music: Party (42 songs)", a smaller line for each transition folder, "✓ Transition music: 3", "✓ Transition pictures: 3", and "○ Transition videos: none found (add a folder named "Transition videos")" for a folder that's missing or empty (muted), then "○ The light: not started. Start it from 💡 on the host phone." (2026-10-24) |
| `main-gate-light.jpg` | The same gate with the light started from the host phone: "✓ The light: running here, out of sight · Logitech C920 · Hue lamp: Living room" (2026-10-24) |
| `noisemaster-host-round.jpg` | The host phone's Noisemaster page mid-go, whole page: "Sam at the soundboard", the clock, the board with its words, Restart and Next round, Points below (2026-10-21) |
| `noisemaster-host-setup.jpg` | The host phone's Noisemaster page before a go, whole page: Sam picked, "I am the Noisemaster" typed as the phrase, twelve decoys, "16 different words." and the gold Start Noisemaster (no sound files, so the main screen says the words) (2026-10-21) |
| `run-of-show-host.jpg` | Host phone: the Run of show, "Show QR" by the code, "Show scores" and "Show rules" under the big-screen line, the "Up next" card with the gold Start button and "app task" on the card, and all eight tasks (party ABCD, 2026-10-19) |
| `points-host-given.jpg` | Host phone on the Prize task: Sam's prize on the big screen and the Points rows, four guests already scored (taken 2026-10-18 from the ABCD party) |
| `scores-main-before.jpg` | Main screen: the scoreboard before the host updates it, six wax seals showing the totals so far (taken 2026-10-18 from the ABCD party, silhouette headshots) |
| `scores-main-after.jpg` | Main screen: the same scoreboard after the update with the Prize task's points, seals ticked up and everyone in their new order, the leader's frame enlarged (taken 2026-10-18 from the ABCD party) |
| `haul-main-winner.jpg` | Main screen: the Prize Haul with Alex in the centre as "Alex is the winner!" and the four prize photos hung around him with "from" placards (taken 2026-10-18 from the ABCD party, silhouette headshot) |
| `haul-host-up.jpg` | Host phone with the haul on the big screen: "On the big screen: the prize haul", gold "Lower the curtain", "Back to the scoreboard" as a link (taken 2026-10-18 from the ABCD party) |
| `main-secret-tasks.jpg` | Secret Tasks on the big screen: "What was Sam's secret?" over the opened envelope, the task on its paper (2026-10-18) |
| `main-secret-sealed.jpg` | Main screen during the Secret Tasks reveal before the envelope opens: "What was Sam's secret?" over the sealed envelope with the red TM wax seal (taken 2026-10-18 from the ABCD party) |
| `guest-secret-open.jpg` | Sam's opened envelope on the guest phone: the task on its paper, "Seal it again", the to-do list with the secret envelope "picked" (2026-10-18) |
| `secret-reveal-host-title.jpg` | Secret Tasks as the last task (8 of 8), the reveal's title card up: a paper "Show the task" (Part 2), no task card, gold "First up: Sam →", and Points as only "0 of 6 scored · from the reveal, when you lower the curtain", no chips (2026-10-20, ABCD party) |
| `secret-reveal-main-part2.jpg` | The big screen with Secret Tasks' Part 2 up: "SECRET TASKS · Divulge each other's secrets." on the task card (2026-10-20, ABCD party) |
| `secret-tasks-edit-parts.jpg` | Secret Tasks' ✎ page, Task text open: Part 1 (the rules, SECRET TASK) and Part 2 (the reveal, SECRET TASKS), the built-in words a new party starts with (2026-10-20, ABCD party) |
| `guest-noisemaster-watch.jpg` | Watching a Noisemaster turn: no card, "Alex is at the soundboard. Watch the big screen." |

Host phone (`/host`, 390px wide):

| File | What it shows |
|---|---|
| `host-choose-game.jpg` | "Play a task" for a task that's not on the run of show: the picker under the task page's top, "Not on the run of show, so it isn't scored" (2026-10-19, from the ABCD party) |
| `host-collecting-entries.jpg` | An app game's task page while entries come in (Photos: best costume): "Task 2 of 8 · app game", the status line, gold "First up: Sam →", stamps and 🔒, "◫ Show everyone", and Points open below (2026-10-18; taken before "app game" became "app task", see `task-page-host-app-game.jpg`) |
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
| `host-party-settings.jpg` | Party settings, at the bottom of Run of show: only the night-of switches, the download button and "Disconnect this phone" (the name, portrait and pin moved to Plan the party) (2026-10-18). "Reset scores…" now sits under the download switch: see `host-reset-scores.jpg` |
| `host-reset-scores.jpg` | Party settings with "Reset scores…" opened in place: what it clears and keeps, "the app tasks' rounds", "Also remove guests (6 joined)" switched on with what goes, and the paper "Reset and remove guests" button with Cancel (2026-10-19, from the ABCD party) |

Main screen (`/`, 1600×900):

| File | What it shows |
|---|---|
| `rules-main.jpg` | The Taskmaster rules on the big screen (Run of show's "Show rules"): the task card on the curtain, TASKMASTER RULES centred, the five rules numbered, the last paragraph, TASKMASTER with the red TM seal under it (2026-10-24, ABCD party) |
| `main-welcome.jpg` | The welcome: join QR, code ABCD, contestants (the five who are in, Sam still to come), the same party as the check-in phones below (2026-10-18) |
| `main-collecting-entries.jpg` | Before & After task card while entries come in |
| `converter-main-whole.jpg` | A useless conversion on the big screen (2026-10-15): "39 dice tall is / 65 LEGO bricks / a 2×4 brick, without its studs" on a paper card |
| `converter-main-loudness.jpg` | A sound on the big screen: "94.2 dB is / about 26 garbage disposals at once / at the sink" (2026-10-17) |
| `converter-main-fraction.jpg` | The same with a fraction: "exactly 1/300 the height of Big Ben" |
| `converter-main-jimothy.jpg` | Started from a thing (2026-10-21): "The Eiffel Tower is / about 2,165 Jimothys / the Ballard raccoon, at the shoulder", the thing named and its 330 m left out |
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
| `host-start-convert.jpg` | The same page from the ABCD party (2026-10-22): Halloween party ABCD in the recent list, and under it the quiet "📏 Useless conversions, no party needed" link to `/convert` |
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
| `task-edit-scoring.jpg` | A task's ✎ page, on the live task "Hum a theme tune": its own page with "← Plan the party", the name, the note and "Scoring" always there, then "+ Task text", "+ Song", "+ Transition" and "+ 📏 Unit" for what's not set yet, gold Save, Cancel, "Remove this task" (2026-10-22, from the ABCD party) |
| `task-edit-db-meter.jpg` | "+ 📏 Unit" opened on a task with none: 🔊 dB meter beside 🎲 Dice under "Measured in", one open at a time with Done (2026-10-18) |
| `task-edit-db-meter-on.jpg` | A dB task's ✎ page with its unit section open: 🔊 dB meter pressed, "🔇 DQ if louder than" set to 90 dB, Done and "✕ Remove unit"; the song above it is one summary line (2026-10-18) |
| `scoreboard-host-points-db-dq.jpg` | A dB task, highest wins without going over 100: Priya's 101.2 struck through with "over 100" under her 0, the others moved up, "over 100 dB is a DQ" in the status line, gold "Done: back to Run of show →" (2026-10-18) |
| `scoreboard-host-points-db-lo.jpg` | A quietest-wins dB task: the LO chip under Mei's box while it's typed in, and Jo's LO in 1st (2026-10-17) |
| `scoreboard-host-tasks-contestants.jpg` | Plan the party on a wide iPad: the party line across the top, tasks on the left and contestants on the right, each task "· app task" or live (Dice tower, Five socks, Hum a theme tune), "+ Live task" and "+ App task" (2026-10-22, from the ABCD party) |
| `headshot-crop-choice.jpg` | Plan the party, Contestants: headshots as tall thumbnails the shape of the scoreboard's window; Greg's (a wide group shot) tapped, opening "Greg's headshot" with Crop, Replace and Cancel in his row (sketch, 2026-10-19, from the ABCD party) |
| `headshot-crop-page.jpg` | Crop opened on Greg's headshot: "← Plan the party", his whole group shot with the gold window (a dot on each corner to resize it) dragged onto him and the rest dimmed, the scoreboard's gold frame beside it showing the crop, "Back to the middle", gold Save and quiet Cancel (2026-10-22, from the ABCD party) |
| `headshot-crop-saved.jpg` | Back on Plan the party after Save: Greg's tall thumbnail now shows the part of his group shot he cropped to, the others still centred (sketch, 2026-10-19, from the ABCD party) |
| `headshot-crop-scoreboard.jpg` | Main screen: the scoreboard after the Prize task's update, Greg (9) framed on just him from his wide group shot by his saved crop, everyone else centred as before (sketch, 2026-10-19, from the ABCD party) |
| `pixelate-host-plan.jpg` | Plan the party, Contestants mid-arrival: "Pixelate until checked in" switched on under the heading with its muted line, Alex, Greg and Priya "checked in", Mei, Sam and Tom (no headshot yet) "not yet" (2026-10-20, from the ABCD party) |
| `pixelate-main-arriving.jpg` | Main screen: the scoreboard as guests arrive, before any points. Alex, Greg and Priya's faces; Mei and Sam, not checked in, as 3 by 4 mosaics of their crops; Tom's camera placeholder (2026-10-20, from the ABCD party) |
| `pixelate-main-reveal.jpg` | Sam's frame as he checks in, left to right: the 3 by 4 mosaic, then 6×8, 12×16, 24×32, 48×64 and his face, 400ms a step (drawn with `node docs/guest-shots/reveal.mjs`, 2026-10-20, from the ABCD party) |
| `headshot-crop-arrivals.jpg` | Run of show before the first task, "Here so far · 5 of 6": tall thumbnails in the scoreboard window's shape, Greg's showing his crop, Sam "not yet", Tom "checked in · no headshot yet" (sketch, 2026-10-19, from the ABCD party) |
| `scoreboard-host-update.jpg` | 🏆 with the scoreboard up: gold "Update the scores · N new tasks" |
| `scoreboard-host-remote-scoreboard-up.jpg` | The remote's main view while the scoreboard is on the big screen |
| `scoreboard-host-name-photo-task.jpg` | ✎ on a Photos task: "Photos: name it (optional)", no Scoring, the three "+" chips (2026-10-18) |
| `scoreboard-host-photos-named.jpg` | A named photo task running: "Photos: best costume" |
| `checkin-phone-list.jpg` | Guest's phone: "Joining Halloween party", tap your name |
| `player-join-code-first.jpg` | Guest's phone without the QR: the code alone with "Next", then the list to tap a name, and "Not on the list? Type your name" (taken when the field said "Game code"; it's "Party code" now, see `guest-join-code.jpg`) |
| `checkin-phone-confirm.jpg` | "You're Sam?" with gold "That's me" |
| `checkin-phone-not-on-list.jpg` | Not on the list: typing a name, "Back to the list" |
| `checkin-phone-headshot.jpg` | No headshot on file: "Add your headshot" |
| `player-not-right-party.jpg` | A guest's phone after check-in with the quiet "Not Jeffrey? Not the right party?" at the bottom, and where it lands: the party's list to tap a name, with "Wrong party? Enter a different code" |
| `headshot-task-host.jpg` | Headshot task on the remote: running order, "no headshot", Show everyone |
| `headshot-task-host-up.jpg` | A headshot on the big screen: still the one list, Sam pressed in as "on the big screen", Next, Lower the curtain |
| `headshot-task-main.jpg` | Main screen: one headshot in the gold frame |
| `headshot-task-main-everyone.jpg` | Main screen: everyone's headshots |
| `host-party-settings-name.jpg` | Plan the party with the party line opened by "Change": renaming the party, with the portrait and the host pin under it (2026-10-18) |
| `run-of-show-host.jpg` | The remote's home: the party line "Halloween party · ABCD" with a small "Show QR" chip at its right, "On the big screen: the soundboard" with small "Show scores" and "Show rules" chips under it (2026-10-24), the "Up next" card with gold "▶ Start Headshot", the read-only task list with one state each, and "Play a task that's not on the list", "Plan the party", "Party settings" at the bottom (party ABCD, 2026-10-19) |
| `up-next-transition.jpg` | The Up next card for Dice tower, a live task with a transition: gold "Start task 6 →" with "♪ Task fanfare · 0:08 · 🖼 Dice tower" as its second line (party ABCD, tasks 1 to 5 scored, 2026-10-22) |
| `up-next-transition-missing.jpg` | The same card when the music has gone from Transition music: "♪ Fanfare (old)" struck through and greyed, "not found", the picture still there, Start still gold (2026-10-22) |
| `host-sting.jpg` | Dice tower's page two seconds after Start: "On the big screen: Dice tower's transition picture" and the "⏹ Task fanfare · 0:06 left" strip, one tap ends it; the task's song strip disabled, "after the transition" (2026-10-22) |
| `host-sting-held.jpg` | Dice tower's page after its transition video has ended: the "⏹ Spooky intro · last frame" strip (the last frame stays on the big screen), the replay strip back to ▶, and the task's song playable (2026-10-23) |
| `host-replay.jpg` | Dice tower's page after its transition has played: "On the big screen: the curtain", the replay strip "♪ Task fanfare · 0:08 · 🖼 Dice tower ▶" above the song strip (2026-10-22) |
| `task-edit-transition.jpg` | Dice tower's ✎ page with Transition open: "Plays on the big screen the moment you tap Start.", Music (♪ Task fanfare 0:08), Picture (🖼 Dice tower), "Or a video, on its own" (No video), "▶ Try it on the big screen" with "Plays what's picked now, before you save.", "The picture comes down when the music ends." (2026-10-22) |
| `task-edit-transition-try.jpg` | The same part while Try it plays: the button pressed in, "⏹ Stop" (2026-10-22) |
| `run-of-show-host-scrolled.jpg` | Run of show scrolled down to the task list (party ABCD, Halloween party): the four header icons stay at the top on their dark band, with the page sliding under them. Older host screenshots show the header without its band (2026-10-19) |
| `run-of-show-host-scores-up.jpg` | The scores up: the scoreboard's controls take the top slot, gold "Update the scores" with "On the big screen: the scores, before Hum a theme tune", "Lower the curtain" as a link, and the "Up next" card's button paper (2026-10-18) |
| `run-of-show-host-scores-updated.jpg` | After the update: gold "Lower the curtain" alone in the top slot, the pending note gone (2026-10-18) |
| `task-page-host-live.jpg` | A live task's page: "← Run of show", the task as the title, "Task 4 of 8 · live task", the BIG SCREEN and PHONES rows of radio buttons (Nothing / The task, Nothing pressed in), the song strip, the note, the task card, gold "▶ Start the clock · 5 min" with "Puts it on the big screen. One player at a time?" under it, then Points with a number box (2026-10-25) |
| `task-page-host-live-up.jpg` | The same with its words on the big screen: "On the big screen: the task", "The task" pressed in on the BIG SCREEN row (2026-10-18) |
| `task-parts-host.jpg` | A task with two parts: "Dice tower" with two rows of radio buttons, BIG SCREEN and PHONES, each Nothing · Part 1 · Part 2 with Nothing pressed in, then the Individual and Team cards to read from, each with its gold "▶ Start the clock" (3 min, 2 min) under it (2026-10-25) |
| `task-parts-host-up.jpg` | The same with part 2 on the big screen: "On the big screen: the task, part 2", BIG SCREEN set to Part 2 and PHONES still Nothing (2026-10-18) |
| `task-parts-main.jpg` | The big screen with part 2 up: only the TEAM TASK card, no word "part" (2026-10-18) |
| `task-parts-host-phones.jpg` | The same task with part 1 on the big screen and part 2 on the phones, each row set apart from the other (2026-10-18) |
| `guest-task-parts-phone.jpg` | A guest's phone with part 2 up: "Here's the task. Read it, then put your phone away.", then the same paper task card as the host's, TEAM TASK centred, no task name, no "part" (2026-10-18) |
| `task-parts-edit.jpg` | The ✎ page with "Task text" open on a two-part task: PART 1 and PART 2 each with their type and text, "✕ Remove this part", "+ Add a part" (2026-10-18) |
| `task-page-host-app-game.jpg` | An app task's page (Photos: best costume) with entries coming in: "Task 2 of 8 · app task", "Show the task" and the card, "First up: Alex →", Points at the bottom (2026-10-19, from the ABCD party) |
| `task-page-host-points-done.jpg` | Everyone shown and scored: "All 5 shown." with "◫ Show everyone", Points with Priya's +1, gold "Done: back to Run of show →" (2026-10-18) |
| `task-song-edit.jpg` | "Change" on the song summary line: "Song (optional)" opened with its picker and ✕, Done and "✕ Remove song", the other summary lines kept above and below (2026-10-18) |
| `task-song-edit-missing.jpg` | A task whose song left the folder: the title struck through, "Not in the music folder any more. Pick another, or ✕." (2026-10-18) |
| `converter-host-empty.jpg` | 📏 Useless conversions (2026-10-15; now with "← Back" and the status line on top): "How much?", the tasks' units first (the next to score chosen), then Height · Length · Weight · Time · Volume and the common units, dimmed while a task's unit is in use |
| `converter-host-result.jpg` | After "Surprise me": three lines to read aloud, the working in small print, "Use a different unit ▾", "Show on the big screen" |
| `converter-host-loudness.jpg` | The converter on a dB task's reading: Loudness among the kinds, "94.2 dB is / about 4.2 blenders at once / on high, at the counter" and "a blender is about 88 dB" (2026-10-17) |
| `converter-host-other-unit.jpg` | "Use a different unit ▴" open: every unit of the kind, the one shown in gold |
| `converter-host-common.jpg` | Measuring in a common unit: Weight, kg, 70 |
| `converter-host-volume.jpg` | Volume (2026-10-17): the five kinds three and two, the volume units (ml L tsp tbsp fl oz cup pt qt gal), 2 cups as a fraction of a minute of shower |
| `converter-host-imperial-first.jpg` | At an imperial party (2026-10-18): the units above "How much?", "in ft mm cm m", opening on ft with its two boxes, ft and in, even on a phone that last used cm |
| `converter-host-feet-inches.jpg` | 5 ft 11 in typed in the two boxes: "5 ft 11 in tall is / about 1.23 Danny DeVitos" and "5 ft 11 in · Danny DeVito is about 4 ft 9 ¾ in" (2026-10-18) |
| `converter-host-pounds-ounces.jpg` | 1 lb 8 oz: "1 lb 8 oz is / 1.82 pounds of gold" and the label-style "24 oz (1 lb 8 oz) · a pound of gold is 13 ¼ oz" (2026-10-18) |
| `converter-host-find-thing.jpg` | "a thing ▴" open under the units (2026-10-21): "Find a thing…" with "eif" typed, leaving Eiffel Tower · 330 m |
| `converter-host-thing.jpg` | The Eiffel Tower picked as the starting thing, "How much?" a count (1), and Jimothy picked from "Or pick one ▾": "The Eiffel Tower is / about 2,165 Jimothys" and "1 Eiffel Tower = 330 m · Jimothy is about 15.24 cm" (2026-10-21) |
| `converter-alone-open.jpg` | 📏 on its own at `/convert` (2026-10-22): no header and no party, opening on a US phone on Height, ft and its two boxes, "US units (ft, lb, cups)" switched on at the bottom |
| `converter-alone-result.jpg` | The same, a sandwich: Length, 1 ft 2 in, Jimothy picked: "1 ft 2 in long is / about 1 Jimothy / Seattle's famously round raccoon, nose to rump", the switch under the card |
| `converter-host-pick-one.jpg` | "Or pick one ▴" under "Surprise me", before any result (2026-10-21): the find box with "jim" typed, leaving Jimothy · about 15.24 cm |
| `converter-host-flipped.jpg` | After "⇄ Flip it" (2026-10-21): "Jimothy is / about 1/2,165 the height of the Eiffel Tower / with its antennas", "1 Jimothy = about 15.24 cm · the Eiffel Tower is 330 m", the chip now "Jimothy ▾" |
| `converter-host-dice-imperial.jpg` | A task's unit at an imperial party: "39 dice tall is / 5.11 soda cans" and "39 dice = 2 ft ½ in · a soda can is 4 ¾ in" (2026-10-18) |
| `host-party-units.jpg` | Plan the party's summary line open: "… · pin set · imperial", and "📏 Conversions in" with Metric and Imperial (2026-10-18) |
| `converter-host-on-screen.jpg` | The result on the big screen: the toggle on, 📏 glowing in the header |
| `task-unit-edit.jpg` | A task with a unit: "📏 Measured in · cm · one is 1 cm" as one summary line with Change, the song and the task text the same (2026-10-18) |
| `task-unit-empty.jpg` | The "+ 📏 Unit" section just opened: the name field and "🎲 Dice (16 mm)" (2026-10-18) |
| `host-game-task-song.jpg` | An app task's page with its task's song strip under the status line (2026-10-18) |
| `run-of-show-host-playing.jpg` | The run of show during a game: "Now playing: Photos: best costume · Open →" |
| `run-of-show-host-play-a-game.jpg` | "Play a task": a task that's not on the list, the same page with no number and no points (2026-10-19, from the ABCD party) |
| `run-of-show-host-add-game.jpg` | "+ App task" on Plan the party, "Which task?": Noisemaster, Secret Tasks, Headshot and Prize task greyed out as "on the list", Photos still offered; the live tasks named Dice tower, Five socks and Hum a theme tune (2026-10-22, from the ABCD party) |
| `host-setup-file.jpg` | The "Setup file" row at the bottom of Plan the party: Import and Export links on the right and "Tasks, tiebreaker, secret tasks, the light and the Taskmaster rules. Not guests or points." under it (2026-10-24, ABCD party) |
| `plan-host-rules.jpg` | Plan the party's "Taskmaster rules · 5 rules" opened: the Rules box (a rule a line), the Last paragraph ("The standard words.") and the Sign-off (2026-10-24, ABCD party) |
| `plan-host-print.jpg` | Plan the party's Print group: "Print" with Download PDF, then the Check-in sign, Taskmaster rules ("5 rules"; hanging off it, "The sign and the rules print on" One page / Two pages, Two pages picked), Task pages ("All 5 with task text" · Change) and Secret tasks ("10 in the pile", 8 to cut picked) switches, all on, each switch's options on a gold rule under it (2026-10-24, from the ABCD party) |
| `plan-host-print-pick.jpg` | The same with Change open under Task pages: a chip per task with task text, Photos and Dice tower unticked, "3 of 5 with task text", Done (2026-10-24, from the ABCD party) |
| `rules-pdf.jpg` | The Taskmaster rules page of the print PDF: TASKMASTER RULES, the five standard rules numbered, the last paragraph, TASKMASTER on the right with room under it for a real seal (2026-10-24, ABCD party) |
| `rules-pdf-one-page.jpg` | "One page": a landscape sheet with the rules on the left and the check-in sign on the right, both centred down the page (2026-10-24, ABCD party) |
| `checkin-sign-pdf.jpg` | The check-in sign PDF from the ABCD Halloween party: HALLOWEEN PARTY, the join QR, "Contestants scan here", "Your time starts now." and the no-camera line (2026-10-23) |
| `task-cards-pdf-page.jpg` | The downloaded PDF's first page: a task's Individual part, heading centred in capitals, the paragraphs, the block centred down a white Letter page (2026-10-18) |
| `task-cards-pdf-secret-cut.jpg` | A secret sheet, "8 to cut": a 2 × 4 grid of SECRET TASK cards with faint cut lines (2026-10-18) |
| `task-cards-pdf-secret-fold.jpg` | A secret sheet, "4 to fold": a 2 × 2 grid, each card its own envelope-sized fold, no fold lines (2026-10-18) |
| `host-setup-import-check.jpg` | The import check under that row, from the real `ImportCheck` component: "Import \"Halloween party\"?", "Nothing changes until you tap Import.", the tasks as they'll be (unchanged, new, kept: has points), Removed, Tiebreaker, Secret tasks with who picks again, The light, songs not in the music folder, gold "Import 5 tasks" and Cancel (2026-10-18) |
| `secret-tasks-host-who-has-what.jpg` | The host's ✉ page: "Haven't looked yet: Tom", then "Who has what" with Sam's task opened, Tom's row "hasn't looked" (re-shot 2026-10-18 from the ABCD party) |
| `secret-tasks-host-pile-open.jpg` | "✉ Secret envelopes · 10 in the pile" opened with Change on Plan the party before the night: two more typed into "New tasks, one per line", Add to the pile, and the pile to fix or take out: the six the guests go on to pick (Sam's "Hum a tune only you know.") and four more (2026-10-22, from the ABCD party) |
| `secret-tasks-player-pile-drag.jpg` | A guest's phone picking an envelope: the pile, then an envelope being dragged off the others |
| `secret-tasks-player-envelope.jpg` | A guest's envelope: sealed ("Tap the seal to open it."), and open with "Seal it again" |
| `secret-tasks-player-rules.jpg` | A guest's envelope with the circled ? beside the heading, closed and then open on the rules card |
| `secret-tasks-host-send-back.jpg` | "Who has what" with Sam's ✎ open: Save, Cancel and "Send it back to the pile" |
| `prize-player-choose.jpg` | Prize task on a guest's phone after check-in: "🎁 Your prize" under "✓ You're in", one "Add photos" button |
| `prize-player-check.jpg` | Prize task: checking the picks before submitting, thumbnails with ≡ and ✕, the first photo starred ★ for the haul, "+ Add more", gold Submit (stand-in photos) |
| `prize-player-submitted.jpg` | Prize task: the receipt after submitting, "✓ Submitted", the photos in order with ★, "Change my photos" (stand-in photos) |
| `prize-host-picked.jpg` | Prize task on the iPad: the contestants in no set order beside Sam's prize, his photos as previews with ★, nothing on the big screen yet (stand-in photos) |
| `prize-host-up.jpg` | The host phone's Prize task page: who has photos in (Sam presenting), then Sam's three photos with the second on the big screen, Add photos, Lower the curtain, Points (re-shot 2026-10-18; the task has no words here, so no paper card) |
| `prize-main-photo.jpg` | Main screen: one prize photo hung in the gold frame like a headshot, with the small label "PRIZE · Sam" (re-shot 2026-10-18 from the ABCD party, Sam's sock puppet) |
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
| `run-of-show-host-arrivals.jpg` | Run of show before the first task: "Show QR" by the code and "Show scores" and "Show rules" under the big-screen line, then "Here so far · 5 of 6" in guest-list order with headshots and "checked in" or "not yet" (dimmed), then the Up next card with gold "▶ Start Headshot" (party ABCD, 2026-10-19) |
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
| `run-of-show-host-tiebreaker.jpg` | Plan the party: the tasks with ≡ and ✎ (no ▶ Start), "+ Live task" and "+ App game" (taken before it became "+ App task"), then "Tiebreaker task · only if there's a tie" as a summary line with ✎ under the list, then the contestants, "Add contestants, one per line" and "✉ Secret envelopes · 12 in the pile" with Change (2026-10-18) |
| `run-of-show-host-tiebreaker-edit.jpg` | ✎ on the tiebreaker task: its own page with "← Plan the party", name, note, "+ Task text" and "+ Song", no Scoring and no "Remove this task" (2026-10-18) |
| `run-of-show-host-haul-remote-tie.jpg` | The run of show after the last update with Sam and Priya tied at the top: gold "Play the tiebreaker task · Sam and Priya", "Lower the curtain" as a link (2026-10-18) |
| `tiebreaker-host-playing.jpg` | The tiebreaker's page, with the curtain down: "← Run of show", its name as the title, "Tiebreaker · Sam and Priya", the note to read out, "Tap who won.", nobody tapped (2026-10-18) |
| `tiebreaker-host-won.jpg` | The same page with Sam tapped as "won the tiebreaker": gold "🎁 Show the prize haul · Sam" under the status line (2026-10-18) |

Task text (taken on 2026-10-18, from the real components with a made-up party; the monster lines are stand-ins):

| File | What it shows |
|---|---|
| `run-of-show-host-task-text-edit.jpg` | "Change" on a live task's task text: "Task type (optional)" with the heading it makes, then "Task text (optional)" grown to fit the story, Done and "✕ Remove task text"; the song and unit stay as summary lines (2026-10-18) |
| `run-of-show-host-tiebreaker-text-edit.jpg` | The tiebreaker's task text opened with "Change": no type picked, so "Heads the task text: TIEBREAKER TASK." (2026-10-18) |
| `tiebreaker-host-text.jpg` | The tiebreaker's page with its text: gold "Show the task", the song, the note, the story on the task card (TIEBREAKER TASK centred), and "Tap who won." fixed to the bottom with Sam and Priya side by side (2026-10-18; older shot: the page now has the BIG SCREEN and PHONES radio rows in place of "Show the task") |
| `tiebreaker-host-text-mid.jpg` | The same page scrolled mid-story: the bar stays at the bottom |
| `tiebreaker-host-text-won.jpg` | Priya tapped as "won the tiebreaker": gold "🎁 Show the prize haul · Priya" with paper "Show the task" under it (2026-10-18; older shot: the page now has the BIG SCREEN and PHONES radio rows in place of "Show the task") |
| `tiebreaker-host-text-up.jpg` | The story on the big screen: "On the big screen: the task", the gold button pressed in (tap it again to lower the curtain) (2026-10-18; older shot: the page now has the BIG SCREEN and PHONES radio rows in place of "Show the task") |
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
| `host-pin-send-link.jpg` | Plan the party's party line opened, the pin set, and "📤 Send yourself the host link" under it: the way onto the remote from another of the host's phones with no big screen to scan (2026-10-24) |
| `host-taken-over.jpg` | The host remote's start page on the phone the remote was taken from: "Another phone took over Halloween party · ABCD." and gold "Take it back" above "Start a new party" (2026-10-24) |

Video limits (taken on 2026-10-14, from the real `PlayerView` with a made-up party and a 2½-minute test video):

| File | What it shows |
|---|---|
| `before-after-player-too-long.jpg` | Before & After on a guest's phone: the hint now says "up to 2 minutes", and the error after choosing a longer video ("That video is 2:30 long… Trim it in your phone's Photos app, then choose it again."). A file over 300 MB gets the same kind of error before it's even read |

The task pages (taken on 2026-10-21 from the ABCD party with `docs/guest-shots`, for the brochure's task pages in [docs/showcase](../showcase/README.md); the photos are emoji stand-ins and the headshots drawn faces):

| File | What it shows |
|---|---|
| `photos-main-photo.jpg` | Photos: best costume on the big screen, Mei's photo (a T-rex) in the gold frame with "Photo · Mei" |
| `photos-main-everyone.jpg` | Everyone's costume photos at once, six gold frames with name plates |
| `photos-host-up.jpg` | The host phone's Photos page with Mei's photo on the big screen: "Mei, 3 of 6", Lower the curtain, Points |
| `headshot-main-photo.jpg` | The Headshot task: Sam's headshot in the gold frame with "Headshot · Sam" |
| `headshot-main-everyone.jpg` | Everyone's headshots at once |
| `headshot-host-up.jpg` | The host phone's Headshot page with Sam up: gold "Next: Tom →", the running order with "shown" and "on the big screen" |
| `before-after-main-both.jpg` | Before & After on the big screen: Sam's before (a full plate of spaghetti) and after (an empty plate) side by side |
| `before-after-main-everyone.jpg` | Everyone's befores and afters at once (Alex, Greg, Priya, Sam) |
| `before-after-guest.jpg` | Before & After on Sam's phone before he's sent his: "Your video", empty Before and After frames, gold "Choose your video" |
| `before-after-host-up.jpg` | The host phone's Before & After page with Sam's up: Before, After, Side by side, Pause and Restart |
| `box-main-closed.jpg` | [BLANK] in a Box on the big screen: "Eggplant in a Box", Alex's and Greg's boxes closed, Greg's "looked inside" |
| `box-main-open.jpg` | The boxes opened after "Alex swapped!": the eggplant in Alex's frame, Greg's box empty |
| `box-guest-peek.jpg` | Greg's phone: "You're the peeker. Only you can look.", the box and gold "Hold to peek" |
| `box-guest-decide.jpg` | Alex's phone: "Swap boxes with Greg, or keep yours?", Swap boxes and Keep my box |
| `box-host.jpg` | The host phone's Box page mid-round: "Alex and Greg", "Greg can look inside", "Waiting for Alex to swap or keep…", Open Alex's box and Open Greg's box |
| `light-main-lit.jpg` | The light computer's page with the bulb lit (red, one secret) over the curtain |
| `light-main-all.jpg` | The light computer's page in "All at once": six bulbs in their own colours, red (stops smiling) and blue (raises an arm) just gone on |
| `light-host-change.jpg` | The host's 💡 page with Change open: One secret, Smiles or All at once, then the seven secrets with Stops smiling picked |
| `light-host-start.jpg` | The host's 💡 page before the light is started: "Not started. It runs on the big screen's computer, out of sight…", gold "Start the light", the `/light` line for another computer, the secret and Got it (2026-10-24) |
| `light-host-camera.jpg` | Just after Start: "✓ Camera: Logitech C920, sees 1 person", the head the camera finds drawn on an empty frame (never the picture), Which camera, "Run it on the processor" and gold "Next: the Hue lamp" (2026-10-24) |
| `light-host-lamp.jpg` | The lamp step: the bridge at 192.168.1.50, Living room picked of three lamps, gold "Flash the lamp", paper "Done: the light is ready" (2026-10-24) |
| `light-host-ready.jpg` | Ready: the "Light on" switch (off), "Off. The camera isn't watching.", "Ready on the big screen's computer: Logitech C920 · Hue lamp: Living room · Set up", the secret and Got it (2026-10-24) |
| `light-host-flash.jpg` | The host's header during a flash: 💡 filled and glowing red for the second the lamp is on (2026-10-24) |
| `light-host-left-over.jpg` | A /light page ran the light and was closed without Stop: "The /light page that was running the light has closed.", gold "Run it on the big screen instead", "Or open …/light on that computer again.", no switch or test (2026-10-24) |
| `light-host-trouble.jpg` | The lamp dropped mid-game, light on: 💡 with the alert dot, "The Hue lamp isn't responding: couldn't reach the bridge. Check the lamp is switched on at the wall, then fix it here.", Sam 1st and Priya 2nd still on Got it (2026-10-24) |
| `light-host-trouble-fix.jpg` | "fix it here" opened: the lamp step with "○ Hue lamp: Living room, not responding", "Switch the light off to test the lamp…" instead of Flash the lamp, and the bridge's error (2026-10-24) |
| `light-host-got-it.jpg` | The host's 💡 page with the light on: "Camera sees 6 people, 2 smiling.", "Light it in 2 s", the secret, and Got it: Sam 1st 5 pts, Priya 2nd 4 pts |
