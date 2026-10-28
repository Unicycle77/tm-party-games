---
name: add-app-task
description: Use when building a new app task (game) for the Taskmaster party app, or checking one is wired everywhere: TV, guest phone, host remote, database rules, setup file, reset, players, the completed-party lock, zip, docs.
---

# Add an app task

An app task is a game in `src/games/<id>/` that the host starts from Run of show and that plays across the three screens. The model to copy is Flipchart's first commit (`git show --stat 69f18ca`): it touched every place listed here in one change. The completed-party lock came later (`git show --stat 51a778c`).

Design comes first. Use the pair-design-feature skill to frame the task, rank its scenarios and agree on each moment. Do not start this checklist until the moments are agreed.

## 0. Pick the nearest sibling

Read the closest existing game in full, and copy its shape rather than inventing a new one:

| Kind | Copy |
|---|---|
| Everyone submits a photo or video, revealed one by one | `photos`, `beforeAfter` |
| Everyone makes something on the phone against a clock | `flipchart` |
| The host runs it one player at a time, with nothing submitted | `noisemaster`, `box` |
| It lasts all night or runs in the background | `secretTasks`, `prize` |
| Scoreboard only, not on the picker | `headshots` |

## 1. The game itself: `src/games/<id>/`

- `index.ts` exports a `Game` (the interface in `src/games/index.ts`; read its comments, which say when each field applies).
  - Write `name` and `blurb` in the style guide's copy voice. The `blurb` is one line on the picker.
  - Load `Stage`, `Player`, `HostLobby` and the other screen parts with `lazyPart(() => import(...))`, so each screen loads only its own part.
  - Set `firstStep`, `photoUrls` and `files` (use `[]` when there is nothing).
  - Add the optional fields only when the task needs them: `status`, `task`, `canShow`, `holdsScreen`, `Collecting`, `Round`, `onScreen`, `repeatable`, `scoreboardOnly`, `headInLobby`.
- `data.ts` holds the reads and writes, under `sessions/{code}/games/<id>/`. Keep anything secret from guests outside the session, as `boxSecrets` and `noisemasterSecrets` do.
- Use the usual file names: `Stage.tsx` for the TV, `PlayerView.tsx` for the guest phone, `HostControls.tsx` for the host remote.
- Never give two files names that differ only in capitals. `scripts/check-names.mjs` fails the build if you do.

## 2. Register it

- `src/types.ts`: add the id to `GAME_IDS`, and add the game's data type to the session's `games`.
- `src/games/index.ts`: add it to `GAMES`, in the order the picker should show it.

## 3. Database rules (`database.rules.json`)

- Add the id to the `game` `.validate` list.
- Add a `games/<id>` block with `.write` and `.validate` for each path. Copy a sibling's host-only (`hostUid`) and host-or-controller patterns.
- Every write a guest's phone makes must refuse a locked party: `&& !root.child('sessions').child($code).child('scoreboard').child('locked').isNumber()`, as in `photos/media` and `flipchart/pages`.
- Run `node scripts/check-rules.mjs`. It fails when the id is missing; otherwise the database drops writes silently and the phone snaps back.
- Say in the PR that the rules need deploying with it.

## 4. Everything that walks a party's games

Search for an existing game id (`grep -rn "flipchart\|noisemaster" src`) and decide for each hit whether the new game belongs there:

- **Players.** In `src/session.ts`, a player's data must move with them when they merge or rename (`carry`), and be removed by `removePlayer`. A submission game joins `SUBMISSION_GAMES`.
- **Reset scores.** In `src/reset.ts`, clear rounds and who has played. Keep the task's setup.
- **Setup file.** `src/setupFile.ts` exports the task's own settings and `src/setupImport.ts` reads them back, with limits and a warning line for anything it can't use.
- **Adding the task.** `addTask` in `src/scoreboard/data.ts` sets the defaults. If the game keeps results from before it was added, use `addKeptGame`, as Noisemaster does.
- **Task pages.** `TaskEditPage.tsx` holds the task's ✎ settings and `TaskPage.tsx` holds its start and run controls.
- **Scoring.** If the scoring is measured, add the game to `src/scoreboard/measured.ts` with highest or lowest wins.
- **Clock and TV.** If the game owns the clock or holds the TV, look at `src/clock/data.ts` and `Screen.tsx`.
- **Download zip.** A game's `files()` puts each player's work into the download-all zip (`DownloadZip.tsx`, `download.ts`). Render anything that isn't a file, like Flipchart's portrait.
- **The completed-party lock.** On a locked party (`scoreboard/locked`, read with `lockedAt`), the night stays as it was:
  - The game's host controls that change points, entries or rounds read `useTaskLock()` from `src/scoreboard/partyLock.tsx`. While `locked`, a tap changes nothing and shows `<LockedLine what="…" />` with "Unlock <task>" in reach, and status lines end with `<LockState />`. Unlocking covers this task on this page only.
  - Starting the game fresh (a wipe, a restart) is refused while locked, as `TaskPage.tsx` does for Start.
  - The guest phone says the party is completed rather than failing silently when a rule refuses a write (see `Play.tsx`). Photos are the exception: they still change, after a confirm.

## 5. Docs and screens (same change)

- `docs/style-guide.md`, and `docs/style-sheet/sheet.tsx` with the re-rendered `docs/screens/style-sheet.jpg`, for any new component, token or pattern.
- Screens from the ABCD party (see the abcd-screenshots skill): the guest phone, the TV at 1600x900, and the host remote, including the task's locked page. Add shots to `docs/guest-shots/shots.tsx` and `shoot.mjs`, and render them to `docs/screens/<id>-{guest,main,host}-*.jpg`, with a row for each in `docs/screens/README.md`.
- `docs/redesign-decisions.md`: a `## <Task>` section with the agreed decisions and what was rejected.
- The showcase: a task page in `docs/showcase/<id>.html`, an entry in `tasks.html`, and the sign-off links. See `docs/showcase/README.md`.

## 6. Check before the PR

- `npm run build`. It runs check-rules, check-names, `tsc` and vite.
- Play the game once in the shots party, from the picker to the reveal and points. Then check Reset scores, export and import of the setup file, removing a player, and the zip.
- Lock the party and try to change the game's points and entries from the host remote and a guest phone. Unlock the task on its page, change it, and leave the page to lock it again.
- Merge with `git merge --no-ff`.
