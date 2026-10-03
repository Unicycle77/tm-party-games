---
name: new-game
description: Add a new party game to TM Party Games (this repo). Use when the user wants to create, add or scaffold a game that shows on the game picker alongside Photos, Before & After and [BLANK] in a Box, including its stage, player phone view, host remote controls, session data, and Firebase rules.
model: sonnet
---

# Adding a new game

A session is shared by several games. Players, the lobby, the jukebox and download-all are shared; each
game plugs into the shared screens through the `Game` interface in `src/games/index.ts`. Read that file
first. It is the contract.

## 0. Pin down the game before coding

If the user hasn't said, ask (one AskUserQuestion, up to 4 questions) only about what changes the build:

- **Kind**:
  - *Submission game* (like **Photos** / **Before & After**): each player sends something from their phone. The game has `status`, per-player `media` and `unlocked` data, and the lock/unlock flow.
  - *Host-run game* (like **[BLANK] in a Box**): the host sets up rounds and players act only when asked. There is no `status`, and the lobby lists players by name only.
- What the **stage** (TV), the **player phone** and the **host remote** each show and do.
- Any **secret** that some players must not see. The whole session is world-readable, so a secret goes outside it (see `boxSecrets`).

Choose a camelCase `id` (for example `quiz`), a display `name`, and a one-line `blurb` that says what players do, in the copy voice of `docs/style-guide.md` §7.

## 1. Copy the closest existing game

Use `src/games/photos/` for a submission game and `src/games/box/` for a host-run game. Create
`src/games/<id>/` with the same files:

| File | Holds |
|---|---|
| `index.ts` | The `Game` object: id, name, blurb, `heading(session)`, `firstStep`, `status?`, `photoUrls`, `files`, plus the components |
| `data.ts` | Selectors (`xOf(session, …)`), writes to `sessions/{code}/games/<id>/…`, and hooks. Components never build DB paths themselves |
| `Stage.tsx` | Main screen for every step except `"list"`. It honours `viewOnly` (no controls, never writes). Stage controls use `useStageBarVisible` plus keyboard shortcuts, as in photos |
| `PlayerView.tsx` | The player's phone, below their name |
| `HostControls.tsx` | `HostLobby` (above the player list) and `HostPlayer` (while one player is on screen; `() => null` if the game never does that) |

Match the surrounding style: short JSDoc on every export describing what it is *for*, sparse inline
comments, and no new abstractions when an existing helper fits (`Framed`, `SafeImg`, `Review`,
`submitMedia`, `setDisplay`, `patchDisplay`, `isLocked`, `setUnlocked`).

## 2. Register it: every shared place to touch

1. **`src/types.ts`**
   - Add the id to `GAME_IDS`.
   - Add any new display steps to `Step`, and document them in the `Display` doc comment.
   - Add the game's data type, with doc comments. RTDB drops empty objects, so make fields optional.
   - Add it to `Session["games"]`. For submission games use `GameData<YourMedia>`.
2. **`src/games/index.ts`**: import the game and add it to `GAMES`. The order there is the picker order.
3. **`database.rules.json`**
   - Add a `games/<id>` block beside the others, ending with `"$other": { ".validate": false }`. The `games/$other` catch-all rejects anything unlisted, so the game **will not save** until this block exists.
   - Add the id to the `game` `.validate` list.
   - Submission games: copy the `photos` `media`/`unlocked` rules and change the file field names.
   - Host-run games: host/controller write the round, and players get narrow per-field writes (see `box/round/decision`).
   - Secrets go in a top-level sibling of `sessions` with a tight `.read` (see `boxSecrets`).
4. **`storage.rules`** (only if players upload files): add the new file `kind` names to the `file.matches(...)` regex, with content type and size limits.
5. **`src/session.ts`**: for a submission game, add the id to `SUBMISSION_GAMES` so that removing or rejoining a player clears their data.
6. **Shared screens**: `Screen.tsx` and `HostRemote.tsx` already branch on `game.status` (submission vs host-run). Change them only if the game really needs something new. If you do, keep the change generic (a new optional `Game` field with a doc comment) rather than `if (game.id === …)`.
7. **`src/styles.css`**: add game-specific styles in a commented section. Follow `docs/style-guide.md` §8 and reuse tokens and components (stamp, framed media, buttons) rather than inventing new ones.
8. **Assets**: put them in `src/assets/<id>/`. Preload the stage's images through `photoUrls` so reveals appear instantly.
9. **`README.md`**: add a bullet for the game to the list at the top, in the same voice. Mention anything a host must do (for example, how to add content).

## 3. Verify

- Run `npm run typecheck`. `Record<GameId, Game>` makes a missing registration a type error.
- Run it with the `run` skill or `npm run dev`. Check the full loop with the main screen (`/`), one or two phones (`/play`) and the host remote (`/host`): pick the game, play a round, go back to "← Games", switch games and come back (nothing should be lost), remove a player, and check `/screen` (view-only, with no writes).
- Rules changes only take effect once deployed (`firebase deploy --only database,storage`). Tell the user this, and don't deploy without asking.

## 4. Commit

If the user asks for a commit, follow the log's style: `<Game name>: <what it does, comma/semicolon separated>`.
