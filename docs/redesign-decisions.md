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
| Arrivals | The ✉ icon shows a small burgundy dot while any guest has no secret task yet; whether they've read theirs doesn't count. The ✉ page then opens with "Haven't looked yet: Priya, Sam / Tell them to open their envelope." and "Waiting for an envelope: Mei, Jo / The pile is empty. Add 2 more." Each line goes as it's resolved. "Deal at random to anyone who hasn't picked" is a quiet link. Latecomers just pick from the pile. Needs a new record of whether each guest has opened their envelope. | The gold glow: on 🎵 and 💡 it means running, not "needs you". Nothing at all (today): the host finds out when a guest asks. Dealing at random as the main fix: telling them to pick is better, and a dealt guest still hasn't looked. |
| Checking one task | "Who has what" on the ✉ page, above the pile: guests in join order with their state ("✉ looked", "✉ hasn't looked", "waiting for an envelope"). Tap a name to show their task in the row, with "Tap again to hide it." A ✎ at the end of each row opens the task for editing in place (showing it, deliberately), with Save and Cancel; the guest keeps the corrected task. | Every task listed at once: anyone beside the host can read them. Hold to see (the first version): too awkward in real gameplay. |
| The pile on the ✉ page | Last on the page, below "Who has what", folded: "▸ The pile (5)" opens it, and this device remembers whether it was open. | Above "Who has what", always open: a long pile pushes the guests off the screen. |
| Sending a task back | Very rare, so it sits only behind a guest's ✎ in "Who has what": a quiet "Send it back to the pile" under Save and Cancel, with a confirm ("Put Sam's task back on the pile? Sam picks a new envelope."). The task goes back on the pile as an envelope, the guest's phone goes back to picking, and they show as "hasn't picked" again. | A button on every row: it's for the odd mistake, not the evening's flow. |

## Secret Tasks: player phone and big screen

Guests join and pick their envelope at the door, before they can see the big screen. Scenarios, in the agreed order: picking an envelope on arrival, the reveal on the big screen, peeking at your task mid-evening, waiting for an envelope when the pile is empty, and the phone during the reveal.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Arrival | "✓ You're in" and "Welcome, Alex!", then the rules on the big screen's task card (torn paper, typewriter, red TM wax seal), then "Pick an envelope" and the pile. The rules, word for word: "Secretly complete your secret task." (the label) / "Select a secret task and read it silently to yourself. You must complete your secret task before the TASKMASTER says, "can everyone keep a secret?"" / "You must complete your task secretly, but also perceptibly." / "You must not reveal your secret task to anyone else." / "Your time starts now." | The pile replacing the "You're in" card (today). "Look for your name on the big screen": they can't see it yet. "One secret task each. Choose carefully. Tell no one.": the card says it all. |
| Picking from the pile | "Move them around if you like, then tap one." Guests can drag envelopes around the pile before picking, so none stays hidden under another: a dragged envelope lifts with a deeper shadow and lands on top. The moves stay on that phone. A tap picks; a press that travels more than a few pixels is a drag and never picks. Swiping on the empty pile still scrolls the page. | Tap only: envelopes under others can't be reached. Sharing the moves with every phone: one guest's tidying would shuffle the pile under another's thumb. |
| Your envelope | Picking opens it straight away. Sealed: "Tap the seal to open it. Tell no one." and a circled ? beside "Your secret task" that unfolds the rules card right under the heading (filled while it's open; tap again to fold it). Open: the task gets the whole screen (the card and the ? hide) and "Seal it again". | The rules card always above the envelope: bulk every time they check. A "Read the task again" link under the envelope (the first version): it sat far from where the card appears, so the page jumped away from the thumb. |
| Reveal opening | "Start the reveal →" puts up a title card: "Can everyone keep a secret?" (the rules' deadline) over a scattered pile of sealed envelopes, one per guest with a task, hanging in. The host phone reads "On the big screen: Can everyone keep a secret?" with gold "First up: Sam →" in the same spot. | Jumping straight to the first envelope (today): the room misses the deadline. A card that leaves on a timer: it could cut the host off mid-line. |
| Peeking later | Tap the seal to open the envelope and "Seal it again" to close it, every time. It also seals itself when the phone locks or the guest leaves the page, so a phone put down open doesn't stay open. After the first reading the task shows at once instead of typing out. | Hold to peek (the first version): too awkward in real gameplay. |
| Empty pile | The stamp and rules card stay, then "No envelopes left yet. The host knows. More will appear here." The pile appears by itself when tasks are added. Rare: the host always has extras. | "Check back soon, or ask the host." (today): it hands the guest a job. A buzz when envelopes arrive: the phone stays quiet everywhere else. |

## Scoreboard

The Taskmaster Scoreboard (Jeffrey's fork of VodBox's tm-scoreboard, with iPad controls) joins this app. It is its own surface, not a game in the picker: games come and go between parties, but the scoreboard is used at every one. This work lives on a branch until Jeffrey decides to keep it.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Combine or not | Combine: the scoreboard becomes part of this app, sharing the party's code, its contestants and the big screen. The fork is rebuilt here; its iPad controls carry over as design, not code. | Two separate apps: the scores and the games take turns on one TV, so the host would switch tabs in front of the room, guests would see two codes, and contestants would be typed in twice. |
| Scope | One scoreboard per party. Guests who come to several parties start fresh at each. | A running series across parties. |
| Scenarios | In the agreed order: scoring tasks and revealing the standings, setting up before the party (the task list and the contestants), fixing a mistake, the end of the night, and the end of the night. Players never see the standings on their own phones: the scoreboard is a host and big-screen surface only. | A guest checking the standings on their phone: cut, since it would spoil every update. "Scores from different sources": dropped once the scoreboard was kept apart from the games, so every point is typed by the host. |
| Games | The scoreboard is never attached to a game automatically. Its task list is planned before the party, and each entry is either a live task with a typed name or an app game picked from the games. An app game in the list can be started from its spot, as a shortcut; the host still types every point, including Secret Tasks', and can still pick a game that isn't in the list. | Naming a task after whatever game is being played, or Secret Tasks' points flowing in: games come and go, the scoreboard stays. |
| Contestants | The host adds them to the scoreboard before the party, as in the fork, and that list is also the guest list: an arriving guest joins by tapping their name. Someone not on the list (very rare) types their own name through a quiet "Not on the list?" link which adds them to the scoreboard too. The host adds photos before the party; anyone checking in without one, on the list or not, is prompted for their headshot. Tapping a name that's already taken becomes the existing "move me to this phone" request. | Guests who join appearing on the scoreboard with no list made ahead. A list only the host can add to: walk-ins would have to find the host first. |
| Checking in | The guest's phone opens on "Joining Halloween party" (the party's name), "Tap your name" and the list as paper chips sorted A to Z, then the quiet "Not on the list? Type your name" and "Wrong party? Enter a different code". Tapping a name asks first: "You're Alex?" with their headshot if one is on file, gold "That's me" and a quiet "Not me" back to the list. A name already taken sends the host the "move me to this phone" request. | Going straight in on the tap, fixed afterwards with "Not Alex? Switch player". The typed first name as the main way in. |
| Typing a name that's on the list | Checks the guest in as that name, exactly as tapping it would. | "Jeffrey is on the list. Go back and tap your name.": the phone may have opened straight on the code and name, with nothing to go back to. |
| Joining without the QR | The phone asks for the code alone ("Game code", 📷, gold "Next"), then shows the party's list to tap a name, as the QR does. A party with no list asks for the name next. A wrong code says so under the field. | The code and the name on one form: the name belongs to the next step, picked from the list. |
| Headshot on check-in | After "That's me", a guest with no photo on file must add one to finish checking in: "Welcome, Sam!", "Add your headshot", "It goes in your frame on the scoreboard.", and Photos' two equal paper buttons "📷 Take a photo" and "Choose a photo", then Photos' check, upload and failed states. It ends on the usual "✓ You're in" card. Guests with a photo on file go straight to the stamp. The frame fills on the big screen when the upload finishes. No task wording, since descriptions are the host's notes. | A "Later" link to skip it. |
| Making the party | The host can create the party from the host remote alone, days ahead, with no big screen. The big screen connects to it on the night. Starting asks for a name for the party, and Recent sessions lists parties by that name and code. | Starting every party from the big screen (today): setup would wait until the TV is on. Dating the party ("Oct 24, 2026"): a name is more flexible. |
| Renaming the party | "Party name" at the top of Party settings: the name in a field with a paper "Save", enabled once it's changed. A party started on the big screen, with no name, can be named here too. The new name shows on the remote, the guests' join screen and the recent lists: the host remote's, and the big screen's and extra screens' "Recent sessions" chips. Every start page reads each chip's name live from its party, so older chips saved without a name show it too. | Tapping the name in the header to edit it: the header is for reading, not editing. |
| Run of show | The host remote opens on the run of show, titled "Run of show": what's on the big screen and the scoreboard's buttons, a paper "Give points: 3 Photos: best costume →" for the task up next, the task list, then the contestants, each "checked in" or "not yet". Anyone who joined before there was a guest list is listed below as "Here, but not on the scoreboard" with "+ Add". ✕ on a contestant also removes their phone from the party if they've checked in. 🏆 in the header always comes back here; during a game, a "Now playing: … · Open →" line leads back to the game, whose "← Run of show" ends it. The game picker became "Play a game", behind a quiet "Play a game that's not on the list" at the bottom. Closing 🎵, ✉ or 💡 goes back to the game in progress, else the run of show. | Choosing a game as the home screen: the night is run from the task list. Removing 🏆: the host wanted a one-tap way home. |
| Each game once | "+ App game" greys out a game already on the run of show, with "on the list". Photos is the exception (a general tool, one entry per photo task). | Any game any number of times: a second Noisemaster entry has nothing different to run. |
| Secret Tasks only when planned | Guests' phones offer "✉ Pick your secret envelope" only once Secret Tasks is on the run of show (or being played). Until then the host's ✉ shows no "needs you" dot, though the pile can still be loaded. | Envelopes at every party: guests at a party without the game were asked to pick one. |
| Points stay put | The points page shows the task it was opened on until the host taps "Next task →" or "← All tasks", even once everyone has points. | Moving on to the next task by itself once everyone is scored. |
| Task list | On the 🏆 page under the contestants, in running order: "≡ 1 Headshot · scored", "≡ 2 Before & After · app game · ▶ Start", "≡ 3 Build the tallest tower ← next". Two equal paper buttons, "+ Live task" (a name and an optional description) and "+ App game" (picked from the games as chips). ≡ drags to reorder. Tapping a task opens its points (the frequent action during the party); ✎ fixes its name or note, or removes it. "← next" is the task after the last one with any points. "scored" is muted text and "← next" marks the task the points page opens on. ▶ Start only on app games, doing exactly what picking that game does. | A stamp for "scored": stamps mean a guest is done. |
| Several photo tasks | A party can have several photo tasks, each with its own photos. ✎ on an app game takes an optional name, shown as "Photos: best costume" in the list, on the points page and on the host remote while that set is on. ▶ Start on a photo task puts its own photos on and puts the last task's away, so an earlier task's photos can be shown again later in the night. Photos started from the game picker stay with whatever set is on; a set taken without a task goes to the first photo task started. | Clearing the photos when a new photo task starts: an earlier task's photos would be lost for good. |
| Headshot task | "Headshot" is an app game that lives only on the scoreboard's "+ App game" chips, never the game picker. ▶ Start runs it like Photos: the remote's gold "First up: Priya →" running order, "shown" and "no headshot" in muted text, "◫ Show everyone", and "Lower the curtain" while one is up; the big screen hangs each headshot in the gold frame labelled "headshot · Sam", or everyone's in the Photos grid. Its photos are the headshots in the scoreboard's frames, checked in or not, in the scoreboard's order, so nobody submits anything and phones just say "Everyone's headshot is going up on the big screen." | Collecting the headshots again as a Photos task: guests already gave one at check-in. |
| Headshot task on the remote | The whole task runs from one list. Tapping any name puts their headshot up, and tapping another switches straight to theirs; the one up is pressed in and reads "on the big screen". The gold "Next: Mei →", "◫ Show everyone" and "Lower the curtain" stay on the same screen. | A separate screen per headshot, as Photos has: there's nothing to do on it but lower the curtain. |
| Noisemaster on a landscape host screen | On a wide landscape screen the round sits in two columns: the controls on the left, the board on the right, sized to the screen's height so the whole board shows without scrolling. Portrait and phones keep one column. | Shrinking everything to fit one column: the buttons get too small to read. |
| No-sound-files warning | The main screen never shows it: players should never see warnings. The host app says it instead, on the Noisemaster setup: click the main screen once so its voice isn't silent, and where recordings go. | A banner on the main screen. |
| New party's list | Every new party starts with "Headshot" and "Prize task" (a live task) at the top of its task list, whether it's made on the remote or the big screen. Both can be reordered, renamed or removed like any task. | An empty list to fill each time: both happen at every party. |
| Task descriptions | A task can carry its description, like the headshot task: "Take the most unjustifiably confident headshot of yourself. Most unjustifiably confident headshot wins." It is a note for the host on the remote only, shown as a short first line under the task. During a live task the big screen shows the curtain with the party's portrait, as usual. | The description on the big screen as the torn-paper task card. |
| Opening it | The host remote, usually an iPad, sometimes an iPhone. A 🏆 icon in the header beside 🎵 and 💡 opens the scoreboard page, with "← Back to the show". | A tab: the host remote has no tabs any more. |
| Giving points | Scores are revealed only when the host decides, not after every task, so giving points and showing the scores are separate. The page opens on the next planned task, "Task 3 of 6: Before & After", with a quiet "Change task" for scoring one out of order (Jeffrey enters all the task names before the party). Each contestant in join order has chips 0 to 5 and "…" for any other number, and a muted "now 17". Points save as they're tapped. A picked chip stays pressed in like Secret Tasks' marks and never turns gold. An unscored guest gets nothing for the task. The big screen stays on the curtain while points go in. | Gold for the picked chip: seven gold chips drown out the one next action. A typed number per contestant (the fork): slow while talking. Naming the task after the game on the spot: the tasks are planned ahead. "Show the scores" as the gold next step after every task: the host reveals only now and then. |
| Headshots | The headshot is a task like any other, with its own description, and scored like one. A headshot appears in its frame on the scoreboard as soon as it's uploaded. | A dedicated headshot reveal. |
| Showing the scores | Two steps, both from the host remote. "Show the scoreboard" (paper; the points page has no gold) puts the scoreboard on the big screen at the totals last shown, so it looks as it did before the current task. Once it's up, gold "Update the scores · 2 new tasks" runs the fork's tick-up and re-sort, sweeping in every task scored since the last update. | The curtain lifting straight into the tick-up after a beat: the host wants the old totals up first, and to choose when they change. |
| After the reveal | "On the big screen: the scores" with gold "Lower the curtain", which goes back to the portrait. The next game is picked from there as usual. | Gold "Pick the next game": Jeffrey lowers the curtain from the scores first. |
| Fixing a mistake | Everything is edited in place from the 🏆 page: tap a scored task to reopen its points page and retap a chip; tap a name or photo to change it; points under the wrong task are cleared there and entered on the right one. A fix to a score already shown waits for the next update, which the host may run right away or later; the button counts it ("Update the scores · 1 changed task"), and a total that goes down ticks down. | A fix correcting itself on the big screen straight away. |
| End of the night | Nothing new: the host shows the scoreboard and runs the last update, and the fork's enlarged leader is the winner moment. The party stays in Recent sessions under its name with its scores. | |
| Big screen | Ported exactly from the fork: its background, frames, seals, typewriter font, lowest-to-highest order with the leader enlarged, and the hold, tick-up and re-sort animation. Only the host remote is reworked to fit this app. Editing moves to the host remote, so the TV's own add, remove, photo, Play and Remote buttons don't come across. | Restyling it with this app's wax seal, gold frames and a paper title label: the fork's big screen is already exactly how Jeffrey wants it. |
| Credit | Keep VodBox's MIT notice in a third-party notices file and a visible credit. Check the Veteran Typewriter font and the images, which have no stated licence, before shipping. | |

## Prize task

Each contestant brings a prize; the winner takes the whole haul. Today the Prize task is only a live task on the run of show. This work makes it a task guests submit to, and adds the haul to the end of the night. Designed one step at a time with Jeffrey.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Moments, in order | 1. A guest submits their prize. 2. The haul on the big screen when the winner is declared. 3. Presenting each prize during the task. 4. The host checks who's in. 5. Fixing a prize. | |
| What a prize is | One or more photos. | One video instead of photos (agreed at first, then dropped by Jeffrey: photos only). Photos and a video mixed. |
| When guests submit | From check-in onward. | Only once the host opens the task: prizes are made ahead, so guests can get it done on arrival. |
| Changing it | The guest can change it until the host starts presenting their prize. After that only the host can add photos to it. | Locked on submit, as in Photos: nothing is judged before it's presented, so a lock buys nothing. |
| The haul's photo | The haul shows one photo per prize: always the guest's first photo. | |
| Presenting | The host sees previews of every photo and video in that guest's prize, and picks which one goes on the big screen. Nothing goes up until the host taps one. | Showing the first one automatically. |
| Choosing (phone) | A "🎁 Your prize" card under the "✓ You're in" card: a "Your prize" placeholder, "Not submitted yet. Add one or more photos of your prize.", one full-width paper "Add photos" button (several at once), then "Only the host sees them until your prize is presented. You can change them until then." No gold until something is picked. | "Choose photos" and "Choose a video" side by side (the first version, while videos were in). One "Choose photos or a video" button: the either/or rule would only show up as an error after picking. Photos' two equal buttons, "📷 Take a photo" and "Choose photos": on iPhone the second already offers Take Photo in its own menu, so the first only saved a tap. |
| Checking the picks (phone) | The picked photos replace the placeholder as whole thumbnails on a dark mat, three to a row. Each has the run of show's ≡ in one top corner and a small paper ✕ in the other. ≡ drags the photo to a new place (it goes faint while dragged, like a dragged task), and the host's previews follow that order. The first photo is the prize's one photo in the winner's haul, marked with a small gold ★ in its bottom-right corner, which moves with whichever photo is first. The last tile is a dashed "+ Add more", where the next photo will land. Then "4 photos, not submitted yet. Are these the right ones? Drag ≡ to change the order.", the gold Submit, and the same who-sees-it line. Removing the last photo goes back to the empty card. *Proposed.* | Cropped square thumbnails: the style guide never crops media, and a crop could hide the prize. "Add more" as a separate button under the grid: the tile shows where the new photo will go. No reordering (the first proposal, since the host picks what to show): Jeffrey wants guests to set the order. Dragging the whole photo: a thumb landing on a photo would grab it instead of scrolling the page. Tapping a thumbnail to see it big: the phone's own picker already shows each photo large. "The first one stands for your prize at the end of the night." in the hint: too wordy. A bigger first tile: the grid would jump around while dragging into first place. |
| Sending (phone) | Photos' sending state as is: the progress bar takes Submit's place, "Submitting… 40%", "Keep this screen open until it's done.", Cancel; a failed send says nothing was submitted, with "Try again". All the photos go as one submission. | |
| Submitted (phone) | A still receipt with no gold: the "✓ Submitted" stamp, "🎁 Your prize", the photos in their order with the ★ and nothing to press on them, "4 photos. Only the host sees them until your prize is presented. You can change them until then.", and a quiet "Change my photos" link back to the check screen with these photos on it. *Proposed.* | Photos' 🔒 "ask the host" receipt: Sam can change them until the prize is presented. |

## Notes for building

- **Box:** the host's phone opens the boxes but must never show where the object is.
- **Style guide:** add the red stamp colour token, and the rule that errors never look like a stamp.
- **Check on real phones:** what the iPhone and Android pickers offer for "Choose your video" and "Choose a photo", and keeping the screen awake during uploads.
- **Check in Chrome:** whether one "Raise the curtain" click can unlock sound, go full screen and reconnect the music folder.
- **Build priority:** the same-name and "That's me" flows come last, since duplicate first names are rare at Jeffrey's parties.
