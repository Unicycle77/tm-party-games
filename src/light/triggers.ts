import type { FaceLandmarkerResult, NormalizedLandmark, PoseLandmarkerResult } from "@mediapipe/tasks-vision";

/** One person the camera sees this frame: where they are (to tell people apart) and their score. */
export interface Person { x: number; y: number; score: number }

/**
 * A secret trigger. The camera gives every person a score each frame. They count as "in" once it rises
 * above `on`, and "out" once it falls below `off` (the gap stops flickering). The light goes on (after the
 * delay) when someone goes in (`fires: "in"`) or out (`fires: "out"`).
 */
export interface Trigger {
  id: string;
  /** The host's button, and the secret: "the light goes on 2 seconds after anyone …". */
  label: string;
  secret: string;
  /** Which detector it needs. */
  model: "face" | "pose";
  on: number;
  off: number;
  fires: "in" | "out";
  /** For the host's readout: "3 people, 1 smiling". */
  state: string;
}

export const TRIGGERS: Trigger[] = [
  { id: "stop-smiling", label: "Stops smiling", secret: "stops smiling", model: "face", on: 0.45, off: 0.2, fires: "out", state: "smiling" },
  { id: "start-smiling", label: "Starts smiling", secret: "starts smiling", model: "face", on: 0.45, off: 0.2, fires: "in", state: "smiling" },
  { id: "eyebrows", label: "Raises eyebrows", secret: "raises their eyebrows", model: "face", on: 0.5, off: 0.25, fires: "in", state: "with eyebrows up" },
  { id: "arm-up", label: "Raises an arm", secret: "raises an arm above their shoulder", model: "pose", on: 0.3, off: 0, fires: "in", state: "with an arm up" },
  { id: "arm-down", label: "Lowers an arm", secret: "lowers a raised arm", model: "pose", on: 0.3, off: 0, fires: "out", state: "with an arm up" },
  { id: "touch-face", label: "Touches their face", secret: "touches their face", model: "pose", on: 2.2, off: 1.4, fires: "in", state: "touching their face" },
];

export const DEFAULT_TRIGGER = TRIGGERS[0]!;
export const findTrigger = (id: string | undefined): Trigger => TRIGGERS.find((t) => t.id === id) ?? DEFAULT_TRIGGER;

/** Face triggers: scores from the face's expression readings (0–1). */
export function facePeople(result: FaceLandmarkerResult, trigger: Trigger): Person[] {
  return result.faceLandmarks.map((points, i) => {
    const shapes = result.faceBlendshapes[i]?.categories ?? [];
    const shape = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
    const nose = points[1] ?? points[0] ?? { x: 0, y: 0 };
    const score = trigger.id === "eyebrows"
      ? (shape("browInnerUp") + (shape("browOuterUpLeft") + shape("browOuterUpRight")) / 2) / 2
      : (shape("mouthSmileLeft") + shape("mouthSmileRight")) / 2;
    return { x: nose.x, y: nose.y, score };
  });
}

// Body points (see MediaPipe's pose landmark map).
const NOSE = 0, L_SHOULDER = 11, R_SHOULDER = 12, L_WRIST = 15, R_WRIST = 16, L_INDEX = 19, R_INDEX = 20;
/** A point counts only if the detector is fairly sure it's in view (not guessed behind something). */
const SEEN = 0.5;

/** Pose triggers: scores from where the arms are, measured in shoulder widths so distance doesn't matter. */
export function posePeople(result: PoseLandmarkerResult, trigger: Trigger): Person[] {
  const people: Person[] = [];
  for (const p of result.landmarks) {
    const at = (i: number): NormalizedLandmark | undefined => (p[i] && p[i]!.visibility >= SEEN ? p[i] : undefined);
    const nose = p[NOSE], ls = at(L_SHOULDER), rs = at(R_SHOULDER);
    if (!nose || !ls || !rs) continue;
    const width = Math.max(Math.hypot(ls.x - rs.x, ls.y - rs.y), 0.01);
    let score = 0;
    if (trigger.id === "touch-face") {
      // How close a hand gets to the nose: shoulder widths / distance, so bigger = closer (touching ≈ 2+).
      const hands = [at(L_INDEX), at(R_INDEX), at(L_WRIST), at(R_WRIST)].filter((h): h is NormalizedLandmark => !!h);
      const nearest = Math.min(...hands.map((h) => Math.hypot(h.x - nose.x, h.y - nose.y)), Infinity);
      score = hands.length ? width / Math.max(nearest, 0.001) : 0;
    } else {
      // How far the higher wrist is above its shoulder (in shoulder widths; below the shoulder is negative).
      const lift = [[at(L_WRIST), ls], [at(R_WRIST), rs]] as const;
      score = Math.max(...lift.map(([w, s]) => (w ? (s.y - w.y) / width : -1)));
    }
    people.push({ x: nose.x, y: nose.y, score });
  }
  return people;
}
