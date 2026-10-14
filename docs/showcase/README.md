# Showcase

A one-page tour of the app to send to friends: [Taskmaster Party](https://claude.ai/artifact/TF9ZgmRwfdVeoHSJn7awjz) (a Claude artifact, private until shared from its Share menu).

| File | What it is |
|---|---|
| `index.html` | The page. It has no `<html>`/`<head>`/`<body>`: the artifact host adds them when it's published. |
| `img/` | Its images, cropped from `docs/screens` and the project's screenshots, plus the curtain, gold frame and typewriter font from `src/assets`. |
| `share/` | The page as eight phone-sized pictures (780px wide), one per moment and one per task, to send together in a text. |
| `export.cjs`, `export.css` | Re-render `share/` after changing the page: `NODE_PATH=$(npm root -g) node docs/showcase/export.cjs`. Which part of the page goes in which picture is the `SHOTS` list at its top. |

The story runs in party order: the opening (the TV mid-reveal), 1 · Walk in (check-in on a phone), 2 · The tasks (Noisemaster, Secret Tasks, Prize task), 3 · Run the show (the host's phone), 4 · The scoreboard, 5 · The Prize Haul, and "Your time starts now."

To update it, edit `index.html` (it follows [the style guide](../style-guide.md)), republish it to the same artifact link with its `img/` files, and re-run the export. The screenshots use made-up sessions, so the scoreboard's headshots are camera stand-ins.
