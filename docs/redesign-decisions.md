# Taskmaster redesign: decisions

Oct 2, 2026 · Jeffrey Martin · Live copy: [Taskmaster redesign: decisions](https://claude.ai/code/artifact/8cf66ae5-aad6-4258-8968-6e60b12b4312)

All three interfaces are designed and agreed: the player phone, the main stage and the host phone. The phone gets the guest in and collects their entry, the main stage carries the show, and the host phone runs it.

## Overview

We worked in pair design, one moment at a time: Claude proposed and Jeffrey shaped. The player persona is a party guest holding a drink, half watching the big screen, who has never seen the app. Guests get the task text before the party, so they arrive with their entry ready.

Player phone scenarios, in the agreed order:

1. Joining the party
2. Doing a task
3. Waiting and watching
4. Getting a special role ([BLANK] in a Box)
5. Recovering

Rules that apply to every screen:

- **Gold means the one thing to press.** A screen gets a gold button only when there is one clear next action. When two choices are equally valid, both are plain paper buttons. (On the host phone, gold also marks what the big screen is showing now, as before.)
- **A red-ink stamp means done.** It always carries a check and words ("✓ You're in", "✓ Submitted"). This replaces the gold stamp everywhere, including the big screen's tiles, and needs a new colour token.
- **Errors never look like a stamp.** They are plain text with no border, tilt or check, so red-for-done and red-for-problem never share a shape.
- **The phone steps back during the show.** It never repeats or announces what the big screen shows. The host's voice is the real alert; the phone only has to be correct when glanced at.
- **Guests call it "the big screen".** "Main stage" is the host's term, and guests won't know it on arrival.
- **One card per moment, and the main action stays in the same spot** near the thumb as the card changes state.

## 1. Joining the party

The guest scans the QR, types a first name, taps Join, and looks up to find their name on the big screen. That tile is the confirmation that really lands.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Join form | The code from the QR shows as a fixed "Joining party ABCD" line, not a field. "Wrong party? Enter a different code" at the bottom reveals the field. | An editable code box with a scan button: the QR already filled it in, so checking it is noise. |
| Join form | One field, "Your first name", with the hint "e.g. Alex". Players use their real first name. | "Your name" with the hint "Nickname": it pushed people toward joke names. |
| Join form | Under the field: "This is how you'll appear on the big screen." | "…on the main stage": the host's preferred term, but guests won't know it on arrival. "…on the TV": wrong if there's a projector. |
| Join form | Join is the gold button. | A plain paper Join button: the style guide asks for one primary action per screen. |
| You're in | A paper card with a red "✓ You're in" stamp, "Welcome, Alex!", "Look for your name on the big screen." and "When the host picks a game, it'll show up here." | Promising a buzz or sound: a web page can't reliably alert a phone that's asleep in a pocket. |
| You're in | "Leave session" becomes "Not Alex? Switch player" (see Recovering). | |
| Same name | The guest stays on the form and the field keeps "Sam " with the cursor ready. Plain text says "There's already a Sam here. Is that you on another phone?" A different Sam adds a last initial; Join stays disabled until the name differs. The match ignores capitals and spaces, and the first Sam keeps the name. | Asking the first Sam to rename: they're already on the big screen. |

Duplicate first names are rare at Jeffrey's parties, so this flow is low priority to build. The "That's me" path is covered under Recovering.

## 2. Doing a task

Before & After is the reference case. Guests film their video before the party and submit it there, on one card that changes state while the main button stays in the same spot. The phone never shows the task text.

| Step | Decision | Rejected, and why |
| --- | --- | --- |
| 1. Choose | Heading "Submit your video". Empty Before and After frames, then one hint: "Pick the video you made for the task. We'll take your Before and After from its first and last frame." Gold "Choose your video", with a quiet "Didn't make one? Record it now" link. | "Your Before & After video": it repeats the game name. "Hand in your video": "Submit" keeps one word family (submit, submitting, submitted). Record as an equal button: recording on the spot isn't in the spirit of the game. |
| 2. Check | The frames fill in. Tapping them plays the video full screen, with "▶ Watch your video" underneath. "Not submitted yet. Is this the right one?" Gold Submit takes the same spot. "Choose a different video" is the quiet way back. | The full video player in the card: it pushes Submit off the screen. |
| 3. Upload | The Submit button becomes a burgundy progress bar, "Submitting… 42%". "Keep this screen open until it's done. Big videos can take a minute." The page asks the phone not to dim. Cancel takes the link's spot. | No guidance while waiting: a phone locked mid-upload can stall it. |
| 4. Failed | Back to the check state with the clip still loaded. Plain burgundy text: "Your video didn't finish sending. Nothing was submitted. Check your Wi-Fi and try again." Gold "Try again". | Today's pale salmon error text: hard to read on paper. |
| 5. Submitted | The red "✓ Submitted" stamp replaces the heading. The frames stay as a still receipt that can't be tapped. "🔒 Your video is locked in. If you need to change it, ask the host." plus a pointer to the stamped tile on the big screen. No gold button. | Playing the video after submitting: the video is only viewable while deciding. A small ✓ next to the heading: too easy to miss. |

**Photos** reuses all five steps, with "photo" in place of "video" and a single photo instead of the frames (no Watch link, no "big videos" line). Photos is the general-purpose game for many kinds of task, so taking and choosing a photo weigh the same: two equal paper buttons, "📷 Take a photo" and "Choose a photo", and no gold until a photo is picked. One "Add your photo" button was rejected because recent Android pickers often skip the camera.

On iPhone the picker also offers Take Video, so the record link partly repeats it there. This is from browser documentation and still needs checking on real phones.

## 3. Waiting and watching

The phone steps back completely. During reveals each phone keeps showing its own card, and the big screen and the host's voice carry everything else.

- **During reveals:** no change on the phone, not even when it's the guest's own entry. Rejected: an "it's you on the big screen!" cue, because it pulls eyes down.
- **While others submit:** the phone doesn't show who's still missing. The stamped tiles on the big screen already do. Rejected: a waiting list on the phone, for the same reason.
- **Between games:** the "You're in" card without the stamp, saying "Waiting for the next game." and "it'll show up here". Only the first wait gets "Welcome, Alex!".

## 4. Getting a special role

In [BLANK] in a Box, the peeker holds to peek and the decider says their choice out loud, then locks it in on the phone. Nothing is revealed until the host taps reveal. Everyone else sees "Sam and Alex are playing" and steps back.

| Who | Decision | Rejected, and why |
| --- | --- | --- |
| Peeker | "You're the peeker. Only you can look. Alex decides whether to swap." Gold "👀 Hold to peek": the box opens while the thumb is down and shuts on release, with "Let go and the lid closes." to teach it. They can peek as often as they like until the lock-in. | A tap to open and tap to close (today): a forgotten open box leaks to anyone looking over their shoulder. A box that closes itself after a few seconds: holding fits the lid metaphor better. |
| Decider | Swap boxes and Keep my box as two equal paper buttons. Tapping one shows the pick in big letters ("SWAP"), then "Say it out loud, then lock it in. You can't change it after this.", a gold "🔒 Lock in: swap" and a "Change my mind" link. | The browser's confirm pop-up: it looks like a system warning at the game's most dramatic moment. |
| Both, after lock-in | "🔒 Alex swapped. Watch the big screen!" This isn't a spoiler, because the room just heard it. | |
| Both, after reveal | The phones step back and don't repeat the box contents. | Showing the contents again (today): it duplicates the big screen. |

## 5. Recovering

Recovery is mostly copy. The one real design is moving a guest to a new phone, which needs the host's OK.

| Situation | Decision | Rejected, and why |
| --- | --- | --- |
| Phone slept or page refreshed | No change. The phone already remembers the party and the guest. | |
| Switched browser or phone | On the same-name message, "That's me, move me here" (paper button) asks the host. The guest sees "Asked the host to move you here. Waiting for their OK…" with Cancel. If approved, they're moved with their entries and the old phone shows "You've moved to another phone." If declined: "The host said no. If that's a mistake, have a word with them." | Moving directly without approval: guests are trusted, but it could descend into people stealing spots. |
| Host unlocks a resubmit | A line on the card: "🔓 The host has let you submit again." | Buttons silently reappearing (today). |
| Leaving the app | Only the host can remove a player. Leaving the app isn't leaving the party, so the player's tile and entries stay. The bottom link becomes "Not Alex? Switch player", which only disconnects this phone. | "Leave party" removing the player and deleting their entries (today). A confirm before deleting: players shouldn't be able to delete at all. |
| Removed, or party ended | The join form opens with "You were removed from the party." or "That party has ended." | A silent drop to the join form (today). |

## Main stage

The main stage carries the show: it welcomes guests, shows the task while entries arrive, then reveals each entry with nothing else on the curtain but the party's portrait. Guests call it "the big screen"; scoring stays verbal and never appears on it.

Scenarios, in the agreed order: welcoming guests, collecting entries, reveals, [BLANK] in a Box, and setup. "Picking a game" was dropped, because the host always picks on their phone.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Welcome | Two halves. Left: "Taskmaster", one QR captioned "Scan to join", the web address, and the huge code. Right: "Contestants (7)" as tilted index-card tiles. A new tile drops in with a gold glow. | The game list on the stage: the host always picks the game. A host QR on the welcome screen: guests couldn't tell which was theirs. It moves to the setup gate. "Players": "Contestants" fits the show. |
| Welcome | Host-only setup (music, extra screen, remote status, End session) appears only while the mouse moves. | Small print in front of every guest (today). |
| Between games | Once the first game has started, "no game" shows this party's Taskmaster portrait (uploaded in the host phone's Party settings) in the gold frame, centred, half the screen's height, with the code small in the corner. No portrait: the empty curtain, never an empty frame. Every other moment the big screen would show a bare curtain (between contestants, [BLANK] in a Box and Noisemaster setup, between rounds) shows this same portrait view. | The welcome again: it reads as the start of the night. |
| Collecting | The task card is the main element and doubles as the game's opening: aged torn paper, typewriter, red TM wax seal. Before & After's text is built in, without the deadline line. Tiles shrink to a right-hand column reading "waiting", "sending…" or a red "✓ Submitted" stamp, with "5 of 7 submitted" above. The join code shrinks to a corner. Photos has no task card: its stage shows the title "Photos" with the tiles large, as on the welcome screen. | The task text entered by the host: Before & After's never changes, and Photos won't have one. |
| All in | A large red "✓ ALL SUBMITTED" stamp lands across the task card, then the screen holds until the host picks the first contestant. No stamp if the host starts early. | |
| Reveals | Before, After, side by side and video stay as today, framed in gold with "before · Alex" labels. Names show from the first frame, because the host announces them anyway. | Hiding the name until later: no surprise is needed. A join code during reveals: nobody joins once reveals start. Points on screen: scoring is verbal. |
| Between contestants | The curtain with the portrait (the empty curtain if there is none), so attention is on the host and the next Before hangs onto a bare stage. | A running order with shown contestants dimmed: the host tracks the order. Holding the last frame. Dropping back to the tiles (today). |
| [BLANK] in a Box | The curtain with the portrait during setup and between rounds. A round opens with the title and both boxes dropping in. Names under the boxes become paper labels, and the peeker's adds "looked inside". The swap announcement, the crossing boxes and the one-at-a-time opening stay as today. | A tiny 👀 marking the peeker: unreadable from across the room. |
| Setup | After start, resume or any refresh, a closed-curtain gate with one gold "Raise the curtain" button that turns on sound, goes full screen and reconnects the music. A checklist names what it does, with the music folder and its song count. The host QR ("Host scans here") sits on the gate until the host's phone connects, and in the mouse-move controls as a backup. Resume and the recent list stay on the start page. | Three separate one-click chores, one of which surfaces mid-reveal as "🔇 Click anywhere…" (today). |

Whether one click can do all three in Chrome is unverified. If not, the music becomes a second click on the gate's checklist.

## Host phone

The host phone is a remote for running the show without looking down for long. Every screen opens with one line saying what the big screen shows, and the next action is one gold tap.

Scenarios, in the agreed order: running the reveals, starting a game and collecting, running a Box round, managing people, music, and connecting and settings.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Every screen | Header "🎮 Host · ABCD" with a 🎵 icon. The game is one line with a quiet "Change game". A status line reads "On the big screen: …". | The game section folded open at the top during the show. The 📺 Screen / 🎵 Jukebox tabs. |
| Collecting | One contestant list in join order, using the guests' states (red "✓ Submitted" stamp, "sending…", "waiting") with "5 of 7 submitted". 🔒/🔓 sit in a fixed column on submitted rows only, and "🔓 may resubmit" shows on the row. Gold "First up: Alex →" is available the whole time. | "Start the reveals: Alex →": it wrapped onto two lines. Waiting for everyone before starting. |
| Running order | Between contestants: "The curtain is down. 2 of 7 shown.", gold "Next: Priya →", and the list with shown contestants dimmed and the next one outlined. Tapping any name shows that contestant, for picking by the room's mood or revisiting a funny one, and doesn't change "next". | Two taps and a hunt through the list per contestant (today). Lock and remove beside the names mid-show. |
| Contestant controls | "On the big screen: Priya's After", "Priya, 3 of 7". Before and After (gold = showing now), Side by side, ▶ Play the video, and ⏸ Pause / ↺ Restart, disabled until the video plays. "Lower the curtain" goes back to the running order. | "← Back to players": it didn't say what the room would see. |
| Box setup | Three questions: what's in the box (pictures), pick two contestants ("played" tags and "🎲 Pick two at random", which prefers people who haven't played), who peeks. Then gold "Start Carrot in a Box". The object always goes in a random box. | "Whose box is the carrot in?": the host must not know. |
| Box round | "Waiting for Mei to swap or keep…", then "Open …'s box" for each box. "Lower the curtain" when done. The host's phone never shows where the object is. | "Only you can see this: the carrot is in Sam's box" (today). Hiding it behind a hold: only the peeker should know. "Show the players on the main screen": replaced by the curtain. |
| Move request | A paper card with a burgundy edge at the top of any screen: "Sam wants to move to a new phone. Allow it if Sam asked you. Their entries move with them." Allow and Decline are equal paper buttons. It doesn't block anything and makes no sound. | |
| Remove | Behind "Manage contestants", with the existing confirm: "Remove Sam and everything they submitted? They can then rejoin fresh." | |
| Music | The 🎵 icon (with ▶ while a song plays) opens today's jukebox, with "← Back to the show". Songs still never advance on their own, and music pauses during videos. | |
| Connecting and settings | Scan the host QR on the setup gate, type the code, or tap the party in the recent list. A quiet "Party settings" link holds "Show download button on the big screen" and Disconnect. | "Hide game descriptions": the game cards are gone from the big screen. |

## The light

The light runs quietly all evening on its own computer with a webcam, and drives a Hue lamp. It goes on 2 seconds after anyone does the secret action, and guests try to work out what sets it off. Only the host knows the secret. When someone guesses it, the host awards points out loud and turns the light off. Nothing on screen marks the win.

Scenarios, in the agreed order: guests watching the light, the host running it during the evening, and setting up the light computer.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Off | While the host has it off, the light computer shows only the curtain, and the camera is fully off (not just ignoring people). The Hue lamp is left as it is. | A bulb that sits on screen looking ready while the camera ignores everyone (today): guests can't tell the game hasn't started. |
| On | The bulb fades in, so starting is a small moment. Switching on shows "Camera starting…" on the host phone for a few seconds. | |
| Host phone | A 💡 icon in the header, next to 🎵, lit while the light is on. It opens a single "Light: on / off" switch and one camera line ("Camera sees 7 people"). | A separate tab: the host phone has no tabs any more. A "Camera watching" switch: off now means fully off. |
| Host phone, while on | The main button is "Light it in 2 s", for someone the camera missed. In "All at once" it's one button per colour. | "Light it now" beside it during the game: one slip flashes the light for nothing and throws off everyone's guesses. |
| Host phone, the secret | One line, "Secret: stops smiling", with a quiet "Change" that holds the mode and the list of secrets. They're set before switching on. | All seven secrets and the modes on screen all evening (today). |
| Host phone, while off | "Test the light" is safe while guests aren't watching. "Reset the light computer" moves into Party settings. | |
| Light computer setup | After connecting, a checklist on the curtain: the camera with a small live preview and Change; the Hue lamp with Test and Change, or "Skip, no lamp tonight"; and a gold "Go full screen", which also keeps the window in front for the camera. It then settles on the bare curtain with "Ready. Turn it on from the host phone." Afterwards its controls appear only when the mouse moves. | The bulb straight after the code, with camera and lamp setup in a bar that only shows on mouse move (today): easy to miss a broken camera before guests arrive. |

## Secret Tasks: host phone

Each guest picks a sealed envelope on arrival and tries to do their task unnoticed all evening. At the end, the room guesses each task before the host unseals it. Points: 1 for doing your task, 1 to each guest who guessed it (not its owner), and 1 bonus if you did it and nobody guessed.

Host scenarios, in the agreed order: running the reveal, loading the pile, keeping everyone covered during arrivals, checking one guest's task mid-evening, and fixing mistakes.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Scoring | The host phone keeps score for this game only; every other game stays verbal. The big screen shows the points only on the finish screen, as tally marks next to the names. | Verbal scoring: three rules per reveal is too much to hold while the room shouts. Scores on the big screen during the reveal. |
| Starting | The usual show order: game line, "On the big screen: the curtain", "7 of 8 have a secret. Priya sits this one out.", gold "Start the reveal →", then contestants in join order, each "✉ sealed" or "no task". A guest with no task sits out. | "What was everyone's secret? (7)" as the button: that question belongs on the big screen. Nudging the host to deal a late task: there's no time left to do it. Task text in the list: the phone must be safe to glance at. |
| Sealed | "On the big screen: What was Sam's secret?", "Sam, 1 of 7", gold "Unseal Sam's envelope". The scoring rows are shown but disabled. Tapping a name in the running order makes them the one up, only while sealed. | A prompt for guesses: the host calls for them out loud. Removing the scoring rows until unsealed: controls keep their place. Seeing the task before unsealing. |
| Unsealed | The gold slot becomes "Next: Priya →" (or "That's everyone →"). The task shows in the status line. "Did Sam do it?" Yes/No and "Who guessed it?" (everyone but Sam) are paper chips. The bonus is applied automatically. Tally marks sit beside the names in the running order. Scoring a turn is optional and never blocks Next. | Entering guesses before the unseal. A "This turn: Sam +1, Priya +1" line: the tally marks are enough. A separate Scores panel: it duplicates the list. |
| Finish | "On the big screen: That's everyone!", "Most points: Priya, 5" (ties name both), gold "Lower the curtain", the list sorted by points. Tapping a name reopens their turn to fix it; the big screen's tallies follow. | Fixing a turn mid-reveal: one tap would mean two things in the running order. A card on the big screen for a guest with no task who scored by guessing: rare, so their tallies stay on the host phone. |
| Loading | The ✉ page is just for loading: one line on the pile ("The pile is empty.", "16 envelopes in the pile, ready to pick."), new tasks one per line with gold "Add to the pile" once typed, then the pile in typed order with ✕. "Added 12." is plain text that fades, with "2 were already in the pile." when needed. | A stamp for "Added": stamps mean a guest is done. "Who has what" and dealing at random on this page: they belong to arrivals and checking. "3 waiting for someone, 5 dealt": sums for the host. |
| Leftovers | Envelopes nobody picked roll forward to the next party until added or forgotten: "Left over from your last party (4)", listed in full, paper "Add all 4 to the pile" and a quiet "Forget these". Unsealed tasks never carry over. | Adding them automatically: the host writes a fresh list each time. A saved favourites list: never reused. |
| Typos | Tap a task to edit it in place. A guest already dealt it keeps the same task, corrected. | Remove and retype: a dealt guest would lose their task. |
| Arrivals | The ✉ icon shows a small burgundy dot when someone is waiting for an envelope and the pile is empty, or has a task they haven't looked at yet. The ✉ page then opens with "Haven't looked yet: Priya, Sam / Tell them to open their envelope." and "Waiting for an envelope: Mei, Jo / The pile is empty. Add 2 more." Each line goes as it's resolved. "Deal at random to anyone who hasn't picked" is a quiet link. Latecomers just pick from the pile. Needs a new record of whether each guest has opened their envelope. | The gold glow: on 🎵 and 💡 it means running, not "needs you". Nothing at all (today): the host finds out when a guest asks. Dealing at random as the main fix: telling them to pick is better, and a dealt guest still hasn't looked. |
| Checking one task | "Who has what" at the bottom of the ✉ page: guests in join order with their state ("✉ looked", "✉ hasn't looked", "waiting for an envelope"). Hold a name to see their task in the row, with "Let go and it hides." A ✎ at the end of each row opens the task for editing in place (showing it, deliberately), with Save and Cancel; the guest keeps the corrected task. | Every task listed at once (today): anyone beside the host can read them. Tap to open and tap to close: a task left open leaks. A ✎ only while holding: it needs a second finger. |

## Secret Tasks: player phone and big screen

Guests join and pick their envelope at the door, before they can see the big screen. Scenarios, in the agreed order: picking an envelope on arrival, the reveal on the big screen, peeking at your task mid-evening, waiting for an envelope when the pile is empty, and the phone during the reveal.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Arrival | "✓ You're in" and "Welcome, Alex!", then the rules on the big screen's task card (torn paper, typewriter, red TM wax seal), then "Pick an envelope" and the pile. The rules, word for word: "Secretly complete your secret task." (the label) / "Select a secret task and read it silently to yourself. You must complete your secret task before the TASKMASTER says, "can everyone keep a secret?"" / "You must complete your task secretly, but also perceptibly." / "You must not reveal your secret task to anyone else." / "Your time starts now." | The pile replacing the "You're in" card (today). "Look for your name on the big screen": they can't see it yet. "One secret task each. Choose carefully. Tell no one.": the card says it all. |
| Your envelope | Picking opens it straight away. Sealed: "Tap the seal to open it. Tell no one." and a quiet "Read the task again" link that unfolds the rules card above the envelope. Open: the task gets the whole screen (the card hides) and "Seal it again". | The rules card always above the envelope: bulk every time they check. |
| Reveal opening | "Start the reveal →" puts up a title card: "Can everyone keep a secret?" (the rules' deadline) over a scattered pile of sealed envelopes, one per guest with a task, hanging in. The host phone reads "On the big screen: Can everyone keep a secret?" with gold "First up: Sam →" in the same spot. | Jumping straight to the first envelope (today): the room misses the deadline. A card that leaves on a timer: it could cut the host off mid-line. |
| Peeking later | After the first reading, the envelope is hold-to-peek: hold the seal and the task shows, let go and it seals, with "Let go and it seals." The first open after picking stays tap-to-open with "Seal it again", for reading the task in full at the door. | Tap to open and tap to reseal all evening (today): a phone put down mid-peek leaves the task open for anyone to read. |
| Empty pile | The stamp and rules card stay, then "No envelopes left yet. The host knows. More will appear here." The pile appears by itself when tasks are added. Rare: the host always has extras. | "Check back soon, or ask the host." (today): it hands the guest a job. A buzz when envelopes arrive: the phone stays quiet everywhere else. |

## Scoreboard

The Taskmaster Scoreboard (Jeffrey's fork of VodBox's tm-scoreboard, with iPad controls) joins this app. It is its own surface, not a game in the picker: games come and go between parties, but the scoreboard is used at every one. This work lives on a branch until Jeffrey decides to keep it.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Combine or not | Combine: the scoreboard becomes part of this app, sharing the party's code, its contestants and the big screen. The fork is rebuilt here; its iPad controls carry over as design, not code. | Two separate apps: the scores and the games take turns on one TV, so the host would switch tabs in front of the room, guests would see two codes, and contestants would be typed in twice. |
| Scope | One scoreboard per party. Guests who come to several parties start fresh at each. | A running series across parties. |
| Scenarios | In the agreed order: scoring tasks and revealing the standings, setting up before the party (the task list and the contestants), fixing a mistake, the end of the night, and (probably cut) a guest checking the standings on their phone, since the phone steps back during the show. | "Scores from different sources": dropped once the scoreboard was kept apart from the games, so every point is typed by the host. |
| Games | The scoreboard is never attached to a game automatically. Its task list is planned before the party, and each entry is either a live task with a typed name or an app game picked from the games. An app game in the list can be started from its spot, as a shortcut; the host still types every point, including Secret Tasks', and can still pick a game that isn't in the list. | Naming a task after whatever game is being played, or Secret Tasks' points flowing in: games come and go, the scoreboard stays. |
| Contestants | The host adds them to the scoreboard before the party, as in the fork, and that list is also the guest list: an arriving guest joins by tapping their name. Someone not on the list (very rare) types their own name through a quiet "Not on the list?" link which adds them to the scoreboard too. The host adds photos before the party; anyone checking in without one, on the list or not, is prompted for their headshot. Tapping a name that's already taken becomes the existing "move me to this phone" request. | Guests who join appearing on the scoreboard with no list made ahead. A list only the host can add to: walk-ins would have to find the host first. |
| Making the party | The host can create the party from the host remote alone, days ahead, with no big screen. The big screen connects to it on the night. Starting asks for a name for the party, and Recent sessions lists parties by that name and code. | Starting every party from the big screen (today): setup would wait until the TV is on. Dating the party ("Oct 24, 2026"): a name is more flexible. |
| Task list | On the 🏆 page under the contestants, in running order: "≡ 1 Headshot · scored", "≡ 2 Before & After · app game · ▶ Start", "≡ 3 Build the tallest tower ← next". Two equal paper buttons, "+ Live task" (a name and an optional description) and "+ App game" (picked from the games as chips). ≡ drags to reorder; tapping a name edits it in place. "scored" is muted text and "← next" marks the task the points page opens on. ▶ Start only on app games, doing exactly what picking that game does. | A stamp for "scored": stamps mean a guest is done. |
| Task descriptions | A task can carry its description, like the headshot task: "Take the most unjustifiably confident headshot of yourself. Most unjustifiably confident headshot wins." It is a note for the host on the remote only, shown as a short first line under the task. During a live task the big screen shows the curtain with the party's portrait, as usual. | The description on the big screen as the torn-paper task card. |
| Opening it | The host remote, usually an iPad, sometimes an iPhone. A 🏆 icon in the header beside 🎵 and 💡 opens the scoreboard page, with "← Back to the show". | A tab: the host remote has no tabs any more. |
| Giving points | Scores are revealed only when the host decides, not after every task, so giving points and showing the scores are separate. The page opens on the next planned task, "Task 3 of 6: Before & After", with a quiet "Change task" for scoring one out of order (Jeffrey enters all the task names before the party). Each contestant in join order has chips 0 to 5 and "…" for any other number, and a muted "now 17". Points save as they're tapped. A picked chip stays pressed in like Secret Tasks' marks and never turns gold. An unscored guest gets nothing for the task. The big screen stays on the curtain while points go in. | Gold for the picked chip: seven gold chips drown out the one next action. A typed number per contestant (the fork): slow while talking. Naming the task after the game on the spot: the tasks are planned ahead. "Show the scores" as the gold next step after every task: the host reveals only now and then. |
| Headshots | The headshot is a task like any other, with its own description, and scored like one. A headshot appears in its frame on the scoreboard as soon as it's uploaded. | A dedicated headshot reveal. |
| Showing the scores | Two steps, both from the host remote. "Show the scoreboard" (paper; the points page has no gold) puts the scoreboard on the big screen at the totals last shown, so it looks as it did before the current task. Once it's up, gold "Update the scores · 2 new tasks" runs the fork's tick-up and re-sort, sweeping in every task scored since the last update. | The curtain lifting straight into the tick-up after a beat: the host wants the old totals up first, and to choose when they change. |
| After the reveal | "On the big screen: the scores" with gold "Lower the curtain", which goes back to the portrait. The next game is picked from there as usual. | Gold "Pick the next game": Jeffrey lowers the curtain from the scores first. |
| Big screen | Ported exactly from the fork: its background, frames, seals, typewriter font, lowest-to-highest order with the leader enlarged, and the hold, tick-up and re-sort animation. Only the host remote is reworked to fit this app. Editing moves to the host remote, so the TV's own add, remove, photo, Play and Remote buttons don't come across. | Restyling it with this app's wax seal, gold frames and a paper title label: the fork's big screen is already exactly how Jeffrey wants it. |
| Credit | Keep VodBox's MIT notice in a third-party notices file and a visible credit. Check the Veteran Typewriter font and the images, which have no stated licence, before shipping. | |

## Notes for building

- **Box:** the host's phone opens the boxes but must never show where the object is.
- **Style guide:** add the red stamp colour token, and the rule that errors never look like a stamp.
- **Check on real phones:** what the iPhone and Android pickers offer for "Choose your video" and "Choose a photo", and keeping the screen awake during uploads.
- **Check in Chrome:** whether one "Raise the curtain" click can unlock sound, go full screen and reconnect the music folder.
- **Build priority:** the same-name and "That's me" flows come last, since duplicate first names are rare at Jeffrey's parties.
