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

The main stage carries the show: it welcomes guests, shows the task while entries arrive, then reveals each entry on an otherwise empty curtain. Guests call it "the big screen"; scoring stays verbal and never appears on it.

Scenarios, in the agreed order: welcoming guests, collecting entries, reveals, [BLANK] in a Box, and setup. "Picking a game" was dropped, because the host always picks on their phone.

| Moment | Decision | Rejected, and why |
| --- | --- | --- |
| Welcome | Two halves. Left: "Taskmaster", one QR captioned "Scan to join", the web address, and the huge code. Right: "Contestants (7)" as tilted index-card tiles. A new tile drops in with a gold glow. | The game list on the stage: the host always picks the game. A host QR on the welcome screen: guests couldn't tell which was theirs. It moves to the setup gate. "Players": "Contestants" fits the show. |
| Welcome | Host-only setup (music, extra screen, remote status, End session) appears only while the mouse moves. | Small print in front of every guest (today). |
| Collecting | The task card is the main element and doubles as the game's opening: aged torn paper, typewriter, red TM wax seal. Before & After's text is built in, without the deadline line. Tiles shrink to a right-hand column reading "waiting", "sending…" or a red "✓ Submitted" stamp, with "5 of 7 submitted" above. The join code shrinks to a corner. Photos has no task card: its stage shows the title "Photos" with the tiles large, as on the welcome screen. | The task text entered by the host: Before & After's never changes, and Photos won't have one. |
| All in | A large red "✓ ALL SUBMITTED" stamp lands across the task card, then the screen holds until the host picks the first contestant. No stamp if the host starts early. | |
| Reveals | Before, After, side by side and video stay as today, framed in gold with "before · Alex" labels. Names show from the first frame, because the host announces them anyway. | Hiding the name until later: no surprise is needed. A join code during reveals: nobody joins once reveals start. Points on screen: scoring is verbal. |
| Between contestants | The empty curtain, so attention is on the host and the next Before hangs onto a bare stage. | A running order with shown contestants dimmed: the host tracks the order. Holding the last frame. Dropping back to the tiles (today). |
| [BLANK] in a Box | The empty curtain during setup and between rounds. A round opens with the title and both boxes dropping in. Names under the boxes become paper labels, and the peeker's adds "looked inside". The swap announcement, the crossing boxes and the one-at-a-time opening stay as today. | A tiny 👀 marking the peeker: unreadable from across the room. |
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

## Notes for building

- **Box:** the host's phone opens the boxes but must never show where the object is.
- **Style guide:** add the red stamp colour token, and the rule that errors never look like a stamp.
- **Check on real phones:** what the iPhone and Android pickers offer for "Choose your video" and "Choose a photo", and keeping the screen awake during uploads.
- **Check in Chrome:** whether one "Raise the curtain" click can unlock sound, go full screen and reconnect the music folder.
- **Build priority:** the same-name and "That's me" flows come last, since duplicate first names are rare at Jeffrey's parties.
