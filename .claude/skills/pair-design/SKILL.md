---
name: pair-design
description: Use when designing a feature, flow or change together with a person, step by step, in Pair Design (Noessel & Anderson): one gen, one synth, frame and rank scenarios, then one moment per turn.
---

# Pair design

Work the way a generator (gen) and synthesizer (synth) work together in Noessel & Anderson's Pair Design. We solve the problem together, one step at a time. Never hand over a finished wireframe set, comp dump or multi-screen deliverable in one turn: that skips the thinking we need to do together.

The goal: at the end, the person understands, agrees with and can defend every decision. Ship less, slower, and be able to explain it to the wider team.

## Roles

By default Claude is the gen (proposes) and the person is the synth (shapes).

Roles can swap. When the person says "I want to try something", they become the gen and Claude becomes the synth. They may hand the pen back later. Honor each swap out loud. Exactly one of us is the gen at any moment, never two.

**Gen agreements (whoever is gen)**
- **Show before tell.** Materialize the idea fast, even half-baked, so the synth has something concrete to react to. This is not a licence to show several screens at once.
- **Vocalize rationale.** Say why, not just what. If the person is gen and forgets, remind them.
- **Don't erase discarded ideas.** Keep the trail (see below).

**Synth agreements (whoever is synth)**
- **Be specific.** Name the problem. If it's only a "spidey-sense", say so, park it and keep moving; come back when it's articulable.
- **Build, don't block.** Don't say "this isn't right" and wait for a better draft. Explain the problem and help grow a solution.
- **No dueling whiteboards.** A new idea from the synth waits until the current one has been fully considered.

## The notes file

Keep one notes file per feature, wherever the project keeps design notes (ask if there's no obvious place). Update it in the same turn something is proposed, agreed or dropped. The next session starts from this file, not from the chat.

## Step 1: Frame (no visuals)

Write the top of the notes file:

```
# <Feature in plain words>: framing

Status: <where we are, dated>. Nothing drawn yet.

## The ask (<Person>, <date>)
<Their words, or close to them.>

## What exists today
<What the product does now, checked rather than guessed (read the code or
 the current design). Say whether this is a bug or a design gap, and note
 anything already decided or parked elsewhere.>

## Scenarios (proposed ranking, for <Person> to re-rank)
1. **<Short name>.** <Who, where, what they're trying to do.>
2. ...
<The last one is usually edge cases.>
```

Post a short summary of the ranking and **stop**. Ask the person to agree, edit or re-rank. When they answer, change the heading to "Scenarios, ranked (agreed <date>)".

## Step 2: See-think-do for the top scenario (no visuals)

Add `## Scenario 1, <name>: see-think-do`. Name a persona in one line: who they are, where they are, what's in their hands, what they've seen so far.

Then write 3 to 5 numbered beats, each one *sees … thinks … does*. Say why for any ordering choice.

At a real fork, list the options as A, B, C with one line each and mark one as recommended. **Stop** and discuss.

## Step 3: One moment at a time

Pick the first moment in the agreed walk. Add `## Step 1: <moment> (proposed)`.

- **Reuse first.** Start from a settled pattern: the project's design system, a sibling screen, or a decision made earlier in this feature. Propose something new only for a stated reason.
- **Show before tell.** Make one concrete thing for this one moment: a sketch, a mock, a snippet of copy, an API shape, whatever fits the medium. No variants or polish nobody asked for.
- **Say why** in the notes: why this spot, this wording, this behaviour.
- Quote any copy exactly.
- Check the stress cases quickly (long text, small screens, empty and error states) and note what happens.

Post it with its rationale, then **stop**. Flip `proposed` to `agreed` only when the person agrees. Then move to the next moment. When a scenario is finished, write `**Scenario N done.**` and go back to Step 2 for the next one. When a new scenario hits a pattern already settled, default to it.

## Keep the trail

Never delete a rejected idea. Keep a `## Rejected, and why` section, one line each: the idea, then why it lost, crediting whoever decided. When an idea comes back, answer from this list.

Mark which decisions are the person's and which are Claude's proposals that nobody objected to ("proposed, not objected to").

Park side issues under `## Set aside`. Don't solve them here.

## End every turn with a check-in

End each turn with one specific question or a clear "next I'll …" so the person can redirect. Every few rounds, ask "is this still working for you?" Don't let bad dynamics set in.

**Tie-breaker.** If we're stuck on one point for about 15 minutes, call it: pull in a third voice, or make an explicit call, note it, and move on.

## Red flags: stop and ask first

- About to show more than one screen or artifact in a turn.
- About to commit to a visual style before the scenarios are agreed.
- About to add tweaks, variants or polish nobody asked for.
- About to write production code before the moment is agreed. A throwaway draft used only to render a sketch is fine; label it as a draft.

## When the design is agreed

1. Fold the agreed decisions into wherever the project records design decisions: a short intro, then a `| Moment | Decision | Rejected, and why |` table or a tight list.
2. Build it following the project's own rules (its CLAUDE.md, contributing guide, design system and review process).
3. Note in the notes file where it shipped (PR, date) and any follow-ups.
