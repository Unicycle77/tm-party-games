---
name: pair-design-feature
description: Use when a new feature, change or post-party problem needs designing for the Taskmaster party app (TV, guest phone, host remote): frame, rank scenarios, then design one moment at a time.
---

# Pair-design a feature

We design in Pair Design: by default Claude is the gen (proposes) and the person is the synth (shapes). One problem per turn. Never hand over a finished screen set.

If the person says "I want to try something", they become the gen and Claude becomes the synth: critique specifically, build on the idea, don't counter-draw. Only one gen at a time.

## The notes file

Each feature gets one folder in the project's shared files (`/mnt/project-files/<feature-slug>/` in a Claude project), with one notes file in it:

- `framing.md` while the scenarios are still open.
- `decisions.md` once a list of agreed decisions is the main content. Either name is fine; keep one file per feature.

Sketches go in `/mnt/project-files/screens/<feature-slug>/<moment>-sketch.jpg`.

Update the notes in the same turn that something is proposed, agreed or dropped. The next thread starts from this file, not from the chat.

## Step 1: Frame (no screens)

Write the top of the notes file:

```
# <Feature in plain words>: framing

Status: <where we are, dated>. No screens yet.

## The ask (<Person>, <date>)
<Their words, or close to them. Note when the ask comes from a real party.>

## What exists today (checked in the repo)
<What the code does now, with file paths (src/...). Read the code; don't guess.
 Say whether this is a bug or a design gap. Check docs/redesign-decisions.md
 and docs/backlog.md for anything already decided or parked.>

## Scenarios (proposed ranking, for <Person> to re-rank)
1. **<Short name>.** <Who, where, what they're trying to do.>
2. ...
<The last one is usually edge cases.>
```

Post a short summary of the ranking and **stop**. Ask the person to agree, edit or re-rank. When they answer, change the heading to "Scenarios, ranked (agreed <date>)".

## Step 2: See-think-do for the top scenario (no screens)

Add `## Scenario 1, <name>: see-think-do`. Name a persona in one line: who they are, where they're standing, what's in their hands, and what they've seen so far. For example: "a guest outside the door, coat on, phone out, who hasn't seen the big screen yet" or "the host at the door with the remote".

Then write 3 to 5 numbered beats, each one *sees … thinks … does*. Say why for any ordering choice ("Why last: …").

When there is a real fork, list the options as A, B, C with one line each and mark one as recommended. Stop and discuss.

## Step 3: One moment at a time

Pick the first moment in the agreed walk. Add `## Step 1: <moment> (sketch: screens/<slug>/<moment>-sketch.jpg, proposed)`.

- **Reuse first.** Start from a settled pattern: the style guide's materials and components, a sibling screen ("the same pattern as the rules step"), or earlier decisions. Only propose something new for a stated reason.
- **Show before tell.** Render one sketch from the real components over the ABCD party (Alex and Greg are always guests; see the abcd-screenshots skill). A draft component is fine. Draw only the one moment, with no variants or polish nobody asked for.
- **Say why** in the notes: why this spot, why this copy, why this colour. Gold is the one thing to press; red-ink stamps mean done.
- Write copy in the style guide's voice, and quote it exactly.
- Check stress cases quickly (long text, a 390×844 phone) and note what happens.

Post the sketch and its rationale, then **stop**. Flip `proposed` to `agreed` only when the person agrees. Then move to the next moment. When a scenario is finished, write `**Scenario N done.**` and go back to Step 2 for the next one.

## Keep the trail

Never delete a rejected idea. Keep a `## Rejected, and why` (or `## Tried and dropped`) section, one line each: the idea, then why it lost, crediting whoever decided ("Jeffrey wanted …"). When an idea comes back, answer from this list.

Mark which decisions are the person's ("(Jeffrey)") and which are Claude's proposals that nobody objected to ("proposed, not objected to").

Park side issues under `Aside (not this thread)` or `## Set aside`. Don't solve them here.

## End every turn with a check-in

End each turn with one specific question or a clear "next I'll …". Every few rounds, ask "is this still working for you?"

## Red flags: stop and ask first

- About to show more than one screen or sketch in a turn.
- About to pick a visual style before the scenarios are agreed.
- About to add tweaks, variants or polish nobody asked for.
- About to write production code before the moment is agreed. A throwaway draft used to render a sketch is fine; label its commit "Draft: …".

## When the design is agreed

1. Fold the agreed decisions into `docs/redesign-decisions.md` as a new `## <Feature>` section. Use its usual shape: a short intro, then a `| Moment | Decision | Rejected, and why |` table, or a tight list.
2. Tick or add the item in `docs/backlog.md` if it came from there.
3. Build it, following CLAUDE.md: style guide and style sheet, screens and README rows from the ABCD party, and a merge with `--no-ff`. For a new game, use the add-app-task skill; for new stored data, the party-data-field skill.
4. Add `## Shipped as PR #<n> (<date>)` to the notes file, plus any follow-ups (for example, "deploy rules with it").
