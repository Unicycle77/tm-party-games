import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_internal.js?url";
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_internal.wasm?url";
import { useEffect, useRef } from "react";
import faceModel from "../assets/light/face_landmarker.task?url";
import poseModel from "../assets/light/pose_landmarker_full.task?url";
import type { LightState } from "../types";
import { type Person, type Trigger, facePeople, posePeople } from "./triggers";

type Status = NonNullable<LightState["camera"]>;

/** Up to this many people in view are watched. */
const MAX_PEOPLE = 8;
/** How often a frame is checked. */
const FRAME_MS = 100;
/** A change (in or out) has to last this long to count, so a flicker doesn't set the light off. */
const HOLD_MS = 300;
/** Someone who moves less than this (a share of the picture's width) between frames is the same person. */
const SAME_PERSON = 0.15;
/** Someone who's out of view for longer than this is forgotten. */
const FORGET_MS = 1000;

interface Track { x: number; y: number; in: boolean; changingSince?: number; seenAt: number }

/**
 * Watches the room through this computer's camera (the picture is never shown or sent anywhere) for
 * every trigger in `triggers` at once, and calls `onTrigger` with its id each time someone does one
 * (e.g. stops smiling). `onStatus` hears how many people it sees and, per trigger, how many are "in"
 * (e.g. smiling), or what went wrong.
 */
export function Camera({ triggers, onTrigger, onStatus }: {
  triggers: Trigger[]; onTrigger: (id: string) => void; onStatus: (status: Status) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const latest = useRef({ triggers, onTrigger, onStatus });
  latest.current = { triggers, onTrigger, onStatus };
  // Which detectors the triggers need; the camera starts again with them when that changes.
  const models = [...new Set(triggers.map((t) => t.model))].sort().join("+");

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    // Whichever the triggers need (or both).
    let face: FaceLandmarker | undefined;
    let pose: PoseLandmarker | undefined;
    let timer: number | undefined;
    // Who's "in" for each trigger, tracked separately (a trigger that's dropped is forgotten).
    let tracks: Record<string, Track[]> = {};
    let reported = "";
    let reportedAt = 0;
    const report = (status: Status) => {
      const key = JSON.stringify(status);
      const now = Date.now();
      // Only changes, and at most twice a second.
      if (key === reported || (!status.error && now - reportedAt < 500)) return;
      reported = key;
      reportedAt = now;
      latest.current.onStatus(status);
    };

    async function start() {
      report({ starting: true });
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      } catch (e) {
        const blocked = e instanceof DOMException && e.name === "NotAllowedError";
        report({ error: blocked ? "Camera blocked. Allow it in the /light page's address bar, then reload." : "No camera found on the light computer." });
        return;
      }
      const v = video.current;
      if (stopped || !v) return;
      v.srcObject = stream;
      await v.play().catch(() => {});

      try {
        const { FaceLandmarker, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const files = { wasmLoaderPath, wasmBinaryPath };
        // The graphics card if it can, otherwise the processor.
        const either = async <T,>(create: (delegate: "GPU" | "CPU") => Promise<T>) => create("GPU").catch(() => create("CPU"));
        if (models.includes("pose")) {
          pose = await either((delegate) => PoseLandmarker.createFromOptions(files, {
            baseOptions: { modelAssetPath: poseModel, delegate }, runningMode: "VIDEO", numPoses: MAX_PEOPLE,
          }));
        }
        if (models.includes("face")) {
          face = await either((delegate) => FaceLandmarker.createFromOptions(files, {
            baseOptions: { modelAssetPath: faceModel, delegate }, runningMode: "VIDEO", numFaces: MAX_PEOPLE, outputFaceBlendshapes: true,
          }));
        }
      } catch {
        report({ error: "Couldn't load the detection. Reload the /light page to try again." });
        return;
      }
      if (stopped) { face?.close(); pose?.close(); return; }

      const step = () => {
        if (stopped) return;
        if (v.readyState >= 2) {
          const { triggers: ts, onTrigger: fire } = latest.current;
          const now = performance.now();
          const faces = face?.detectForVideo(v, now);
          const poses = pose?.detectForVideo(v, now);
          const next: Record<string, Track[]> = {};
          const each: Record<string, number> = {};
          let seen = 0;
          for (const t of ts) {
            const result = t.model === "face" ? faces : poses;
            if (!result) continue;
            const people = t.model === "face" ? facePeople(faces!, t) : posePeople(poses!, t);
            seen = Math.max(seen, people.length);
            next[t.id] = follow(tracks[t.id] ?? [], people, t, now, () => fire(t.id));
            each[t.id] = next[t.id]!.filter((k) => k.seenAt === now && k.in).length;
          }
          tracks = next;
          report({ people: seen, each });
        }
        timer = window.setTimeout(step, FRAME_MS);
      };
      step();
    }

    // Chrome slows down a page it isn't showing (a background tab, a minimised or fully covered
    // window), so the camera would miss things: tell the host, and report afresh once it's back.
    const onVisibility = () => {
      reported = "";
      if (document.hidden) report({ error: "The /light page is hidden (another tab, minimised or covered), so it's missing things. Bring it back to the front." });
    };
    document.addEventListener("visibilitychange", onVisibility);

    void start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      face?.close();
      pose?.close();
    };
  }, [models]);

  return <video ref={video} className="light-camera" muted playsInline aria-hidden />;
}

/**
 * Matches this frame's people to the ones seen before (nearest first), updates who's "in", and calls
 * `fire` for each person who has just gone in or out (whichever the trigger wants). Someone new starts
 * as they are (no light).
 */
function follow(tracks: Track[], people: Person[], trigger: Trigger, now: number, fire: () => void): Track[] {
  const free = [...tracks];
  const next: Track[] = [];
  for (const person of people) {
    let best = -1;
    let bestDist = SAME_PERSON;
    free.forEach((t, i) => {
      const d = Math.hypot(t.x - person.x, t.y - person.y);
      if (d < bestDist) { best = i; bestDist = d; }
    });
    const [track] = best >= 0 ? free.splice(best, 1) : [];
    if (!track) {
      next.push({ x: person.x, y: person.y, in: person.score > trigger.on, seenAt: now });
      continue;
    }
    const isIn = person.score > trigger.on ? true : person.score < trigger.off ? false : track.in;
    let changingSince = isIn === track.in ? undefined : track.changingSince ?? now;
    let settled = track.in;
    if (changingSince !== undefined && now - changingSince >= HOLD_MS) {
      if (isIn !== track.in && (trigger.fires === "in") === isIn) fire();
      settled = isIn;
      changingSince = undefined;
    }
    next.push({ x: person.x, y: person.y, in: settled, changingSince, seenAt: now });
  }
  // People out of view for a moment (turned away, walked past someone) are kept for a little while.
  return [...next, ...free.filter((t) => now - t.seenAt < FORGET_MS)];
}
