# The light: what the camera can detect

A reference for choosing and adding triggers for the light (`/light`). Everything here comes from the MediaPipe models the app already ships (`src/assets/light/`), running in the light computer's browser.

- Triggers, modes and colours: [`src/light/triggers.ts`](../src/light/triggers.ts)
- Camera, tracking and the head close-ups: [`src/light/Camera.tsx`](../src/light/Camera.tsx)
- Timing (2 s delay, 1 s flash, at most one change per 0.5 s): [`src/light/data.ts`](../src/light/data.ts)

## How a trigger works

Each frame (about 10 a second), every person in view gets a **score** for the trigger. They count as **in** once the score rises above `on`, and **out** once it falls below `off`; the gap between the two stops flickering. A change has to last 0.3 s to count. The trigger **fires** when someone goes in (`fires: "in"`, e.g. starts smiling) or out (`fires: "out"`, e.g. stops smiling). The light then goes on 2 s later.

A score can be anything that grows with the action: a single face reading (0–1), an average of two (left and right), or a measurement from body points (e.g. how far a wrist is above its shoulder, in shoulder widths).

## Face readings (52)

The face model gives each face 52 readings from 0 (not at all) to 1 (fully), named after Apple's ARKit expressions ("Left"/"Right" are the person's own). Faces across the room are read from a close-up of each head, which the body detector finds first.

**Example** is what a big, toothy grin scored (a real photo), to show what "high" looks like. **Trigger?** is how well it works on its own: ✓ good, ~ possible with care, ✗ noisy or too subtle from across a room.

| Reading | What it is | Example | Trigger? |
|---|---|---|---|
| `_neutral` | Overall "no expression" | 0.00 | ✗ |
| **Brows** | | | |
| `browDownLeft` / `Right` | Frowning, brows pulled down | 0.84 / 0.82 | ~ (a big grin raises it too) |
| `browInnerUp` | Inner brows raised (worried, surprised) | 0.00 | ✓ used by *Raises eyebrows* |
| `browOuterUpLeft` / `Right` | Outer brows raised | 0.00 | ✓ used by *Raises eyebrows* |
| **Eyes** | | | |
| `eyeBlinkLeft` / `Right` | Eye closed | 0.27 / 0.26 | ✗ for blinks (everyone blinks constantly); ~ for "closes their eyes" held a while |
| `eyeSquintLeft` / `Right` | Eyes narrowed | 0.74 / 0.66 | ~ (smiles squint too) |
| `eyeWideLeft` / `Right` | Eyes wide open | 0.00 | ~ |
| `eyeLookUp/Down/In/Out` + `Left`/`Right` | Where each eye looks | 0.03–0.18 | ✗ (too small to read across a room) |
| **Cheeks and nose** | | | |
| `cheekPuff` | Cheeks blown out | 0.00 | ✓ distinctive, rarely done by accident |
| `cheekSquintLeft` / `Right` | Cheeks pushed up | 0.00 | ~ |
| `noseSneerLeft` / `Right` | Nose wrinkled | 0.00 | ~ |
| **Jaw** | | | |
| `jawOpen` | Mouth open (jaw dropped) | 0.12 | ✓ for a wide-open mouth (set `on` high, ~0.6, or talking sets it off) |
| `jawForward` / `jawLeft` / `jawRight` | Jaw pushed forward or sideways | 0.00 | ~ |
| **Mouth** | | | |
| `mouthSmileLeft` / `Right` | Smiling | 0.96 / 0.93 | ✓ used by the smile triggers |
| `mouthFrownLeft` / `Right` | Mouth corners down | 0.00 | ~ |
| `mouthPucker` | Kissy / fish lips | 0.00 | ✓ (whistling or "oo" can set it off) |
| `mouthFunnel` | Lips pushed out in an "O" | 0.01 | ~ |
| `mouthClose` | Lips closed while the jaw is open | 0.03 | ✗ |
| `mouthLeft` / `mouthRight` | Whole mouth pulled sideways | 0.00 | ~ |
| `mouthDimpleLeft` / `Right` | Corners pulled back | 0.01 | ✗ |
| `mouthStretchLeft` / `Right` | Mouth stretched wide | 0.15 / 0.16 | ~ |
| `mouthRollLower` / `Upper` | Lips rolled in | 0.01 / 0.06 | ✗ |
| `mouthShrugLower` / `Upper` | Lips pushed up | 0.01 / 0.00 | ✗ |
| `mouthPressLeft` / `Right` | Lips pressed together | 0.16 / 0.10 | ~ |
| `mouthLowerDownLeft` / `Right` | Lower lip pulled down | 0.03 / 0.08 | ✗ |
| `mouthUpperUpLeft` / `Right` | Upper lip raised (teeth showing) | 0.76 / 0.76 | ~ (high in a grin too) |

## Body points (33)

The body detector finds up to 8 people and gives each 33 points, as a position in the picture plus a **visibility** from 0 to 1 (below about 0.5 the point is guessed, e.g. hidden behind a table). "Left" is the person's own left, which is on the right of the camera's picture. It works to about 4 m.

| # | Point | # | Point | # | Point |
|---|---|---|---|---|---|
| 0 | nose | 11 | left shoulder | 23 | left hip |
| 1, 2, 3 | left eye (inner, centre, outer) | 12 | right shoulder | 24 | right hip |
| 4, 5, 6 | right eye (inner, centre, outer) | 13 / 14 | left / right elbow | 25 / 26 | left / right knee |
| 7 / 8 | left / right ear | 15 / 16 | left / right wrist | 27 / 28 | left / right ankle |
| 9 / 10 | mouth (left / right corner) | 17 / 18 | left / right pinky knuckle | 29 / 30 | left / right heel |
| | | 19 / 20 | left / right index knuckle | 31 / 32 | left / right foot tip |
| | | 21 / 22 | left / right thumb | | |

Measure things in **shoulder widths** (the distance between points 11 and 12), so they work at any distance. Ideas, with how they'd be scored:

| Action | Score | Notes |
|---|---|---|
| Raises / lowers an arm | wrist above its shoulder | ✓ in use |
| Touches their face | shoulder width ÷ nearest hand-to-nose distance | ✓ in use |
| Hands on head | both wrists near or above the ears | ✓ |
| Crosses arms | each wrist near the opposite elbow | ~ (arms overlap, so wrists are often hidden) |
| Claps / hands together | wrists close to each other, in front of the chest | ✓ |
| Leans left / right | nose sideways from the shoulders' midpoint | ✓ |
| Turns their head away | ears and eyes lose visibility; nose moves toward one ear | ~ |
| Stands up / sits down | hips vs knees height | ~ (needs hips and knees in view; sofas hide them) |

## What the camera can't detect

- **Tongue out**: no face reading for it (MediaPipe left out ARKit's `tongueOut`).
- **Emotions as such** (happy, angry): only the muscle movements above.
- **Who someone is**: people are told apart only by where they are in the picture, frame to frame.
- **Talking**: `jawOpen` moves with speech, which is why mouth triggers need a high threshold.
- **Eye direction from across a room**: the `eyeLook…` readings are too small at a distance.

## Other detectors in the same library (not added yet)

These come with `@mediapipe/tasks-vision` but would each need their model file added to `src/assets/light/` (a few MB each):

- **Hand landmarker**: 21 points per hand (every finger joint). For fingers held up, pointing, pinching.
- **Gesture recognizer**: named gestures: `Closed_Fist`, `Open_Palm`, `Pointing_Up`, `Thumb_Up`, `Thumb_Down`, `Victory`, `ILoveYou`.

Both need hands fairly close to the camera and clearly in view, so they're less reliable across a room than faces (read close up) and body points.

## Adding a trigger

1. Add it to `TRIGGERS` in `src/light/triggers.ts`: an `id`, the host's `label`, the `secret` wording, `model` (`"face"` or `"pose"`), `on` / `off` thresholds, `fires` (`"in"` or `"out"`), the readout's `state` word, and a `colour` / `colourName` for "All at once".
2. Score it: face triggers in `faceScore`, body triggers in `posePeople`.
3. Add it to a mode's `bulbs` in `MODES` if it should have its own bulb there.
4. To tune `on` / `off`, watch the host phone's readout ("… 1 smiling") while doing the action at the distance people will sit.
