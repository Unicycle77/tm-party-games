---
name: party-data-field
description: Use when adding or changing anything stored on a Taskmaster party (a task setting, party setting or per-guest data), so it reaches the database rules, setup file, reset, guest moves and the completed-party lock.
---

# Add a field to a party

A party is `sessions/{code}` in the database, plus a few trees outside it (`secretTasks/{code}`, `pins/{code}`, `boxSecrets`, `noisemasterSecrets`). Anything new that it stores has to travel to several places nobody sees until they break: an import drops it, a reset wipes it, a guest's move loses it, or a locked party still lets it change.

## 0. Decide what kind of data it is

Write this down in the feature's notes before coding. It decides every step below.

- **Setup** is what the host plans before the night (a task's words, a time limit, a unit, the arrival switch, the rules). It goes in the setup file, survives Reset scores, and is open to the host on a locked party.
- **Night** is what happened (points, results, DQs, rounds, who played, entries). It stays out of the setup file, is cleared by Reset scores, and is frozen by the lock.
- **Per guest** is keyed by a uid or contestant id. It moves with the guest and goes when they're removed.
- **Secret from guests**? Then keep it outside the session, since guests can read the session.

## 1. Type and rules

- Add it to `src/types.ts`, with a doc comment saying what it is and who writes it.
- In `database.rules.json`:
  - Add a `.validate` with a type and a length cap, like its neighbours.
  - Add a `.write` that names the writers: host only (`hostUid`), host or controller (`controllerUid`), or the guest themselves (`auth.uid === $uid`).
  - **Any guest write must refuse a locked party:** `&& !root.child('sessions').child($code).child('scoreboard').child('locked').isNumber()`. A guest already in may still move phones. Copy the `players/$uid` rule for that case.
  - The database refuses writes silently, so test the write on the shots party.
  - Say in the PR that the rules need deploying with the change.
- For a new game, also run `node scripts/check-rules.mjs`. The add-app-task skill covers games.

## 2. Setup file (setup data only)

- `src/setupFile.ts`:
  - Add it to `SetupTask` or `Setup`, with a comment.
  - Write it in `taskOf` or the party export, only when it's set: `...(t.x && { x: t.x })`.
  - Never export night data.
- `src/setupImport.ts`:
  - Read it defensively: check the type, cap strings with `str(v, max)`, and range-check numbers.
  - Add a plain warning line for anything it can't use ("<Task>'s unit isn't one the app knows, so it's left out.").
  - Enforce "one per party" rules the way `checkin` does.
- Bump `SETUP_VERSION` only if an older app couldn't read the new file. Adding an optional key doesn't need a bump.
- Check that a setup file exported before this change still imports.

## 3. Reset scores (`src/reset.ts`)

- Clear night data in the reset patch. Keep setup data.
- If the reset has the "Also remove guests" option, decide whether the field belongs to the guests.
- Reset is only offered on an unlocked party, and it clears `scoreboard/locked`. Leave that as it is.

## 4. Guests (per-guest data)

In `src/session.ts`:

- `carry` it when a guest moves to another phone or uid.
- Remove it in `removePlayer`.
- If the field is a submission, check `clearSubmissions` and `SUBMISSION_GAMES`.

Data outside the session needs its own write, as the secret task does.

## 5. The completed-party lock (night data)

A locked party (`scoreboard/locked` holds a time, read with `lockedAt`) keeps the night as it was.

- **Host controls on a task's page** read `useTaskLock()` from `src/scoreboard/partyLock.tsx`.
  - While `locked`, a tap changes nothing and shows `<LockedLine what="Sam stays on 2" />` under the row, with "Unlock <task>" in reach.
  - Status lines end with `<LockState />`.
  - Unlocking covers only this task and only this page. Leaving the page locks it again.
- **Party-wide controls** (adding or removing guests, Reset) need the whole party unlocked from Run of show. Hide them or explain why while it's locked.
- **Photos** are the exception: they still change on a locked party, after a confirm.
- **Guest phones** are covered by the rule in step 1. The guest UI should also say so rather than fail silently: see `Play.tsx` and the prize task's add-only flow.

## 6. Show and record it

- If a host or guest can see or set the field, follow CLAUDE.md: the style guide and style sheet, plus screens from the ABCD party (see the abcd-screenshots skill), including the field's locked state.
- Add the field to the feature's section in `docs/redesign-decisions.md`.

## 7. Check

Run `npm run build`. Then, on the shots party:

- set the field, export it, import it into a fresh party, and check it arrived;
- run Reset scores and check it's kept or cleared as decided;
- move a guest to another phone and remove a guest;
- lock the party and try to change the field from both the host remote and a guest phone.
