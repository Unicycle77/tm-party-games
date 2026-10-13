# Showcase

A one-page tour of the app to send to friends: [Taskmaster Party](https://claude.ai/artifact/TF9ZgmRwfdVeoHSJn7awjz) (a Claude artifact, private until shared from its Share menu).

| File | What it is |
|---|---|
| `index.html` | The page. It has no `<html>`/`<head>`/`<body>`: the artifact host adds them when it's published. |
| `img/` | Its images, cropped from `docs/screens` and the project's screenshots, plus the curtain, gold frame and typewriter font from `src/assets`. |
| `taskmaster-party-showcase.jpg` | The page as one tall image at phone width (780px), for sharing as a picture. |
| `export.cjs`, `export.css` | Re-render that image after changing the page: `NODE_PATH=$(npm root -g) node docs/showcase/export.cjs`. |

The story runs in party order: the opening (the TV mid-reveal), 1 · Walk in (check-in on a phone), 2 · The tasks (Noisemaster, Secret Tasks, Prize task). Still to come: running the show from the host's phone, the scoreboard, and the Prize Haul.

To update it, edit `index.html` (it follows [the style guide](../style-guide.md)), republish it to the same artifact link with its `img/` files, and re-run the export.
