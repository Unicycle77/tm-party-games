# Showcase

A one-page tour of the app to send to friends: [Taskmaster Party](https://claude.ai/artifact/TF9ZgmRwfdVeoHSJn7awjz) (a Claude artifact, private until shared from its Share menu).

| File | What it is |
|---|---|
| `index.html` | The page. It has no `<html>`/`<head>`/`<body>`: the artifact host adds them when it's published. |
| `tasks.html` | The list of every app task, for a host picking the mix for their next party: grouped by how the room plays them (On the spot, Everyone at once, All night, in the background), each task the brochure's index card under its TV picture, two to a row, linking to its page. |
| `noisemaster.html`, `box.html`, `photos.html`, `before-after.html`, `flipchart.html`, `headshot.html`, `prize.html`, `secret-tasks.html`, `light.html` | A page per task, pitched to a host choosing tasks. The brochure's column, frames and labels, telling one task in its own order: the opening with an At a glance card (who plays, how long, your prep, to bring, winner), then the task, the TV and the host's phone, and a sign-off linking to the list and the next task in the list's order. Phones sit two side by side at any width instead of the swipe strip. The "How long" lines are estimates. |
| `task-pages.css` | The task pages' and the list's styles: the brochure's own (copied from `index.html`), then what they add. |
| `img/` | Its images, cropped from `docs/screens` and the project's screenshots, plus the curtain, gold frame and typewriter font from `src/assets`. |
| `share/` | The page as eight phone-sized pictures (780px wide), one per moment and one per task, to send together in a text. |
| `export.cjs`, `export.css` | Re-render `share/` after changing the page: `NODE_PATH=$(npm root -g) node docs/showcase/export.cjs`. Which part of the page goes in which picture is the `SHOTS` list at its top. |

The story runs in party order: the opening (the TV mid-reveal), 1 · Walk in (the welcome TV, then name tags and envelopes on a phone), 2 · The tasks (Noisemaster, Secret Tasks and the Prize task, each with its TV, guest and host screens), 3 · Run the show (the host's phone), 4 · The scoreboard, 5 · The Prize Haul, and "Your time starts now."

To update it, edit `index.html` (it follows [the style guide](../style-guide.md)), republish it to the same artifact link with its `img/` files, and re-run the export. The screenshots use made-up sessions, so the scoreboard's headshots are camera stand-ins.

One party: every picture on the page shows the same one (code ABCD, Alex, Greg, Mei, Priya and Tom already in, Sam checking in last), so a TV, a guest's phone and the host's phone agree. Alex and Greg are always two of the guests, as a nod to the show. Re-shoot a screen from that party instead of reusing an older one.
