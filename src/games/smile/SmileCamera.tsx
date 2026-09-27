import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_internal.js?url";
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_internal.wasm?url";
import { useEffect, useRef } from "react";
import modelAssetPath from "../../assets/smile/face_landmarker.task?url";
import type { SmileGame } from "../../types";

type Status = NonNullable<SmileGame["camera"]>;

/** Up to this many people in view are watched. */
const MAX_FACES = 8;
/** How often a frame is checked. */
const FRAME_MS = 100;
/*
 * A face counts as smiling once its smile score (0–1) rises above SMILE_ON, and stops once it drops
 * below SMILE_OFF; the gap keeps a half-smile from flickering. A change has to last HOLD_MS to count.
 */
const SMILE_ON = 0.45;
const SMILE_OFF = 0.2;
const HOLD_MS = 300;
/** A face that moves less than this (a share of the picture's width) between frames is the same person. */
const SAME_FACE = 0.15;
/** A face that's out of view for longer than this is forgotten. */
const FORGET_MS = 1000;

interface Face { x: number; y: number; score: number }
interface Track { x: number; y: number; smiling: boolean; changingSince?: number; seenAt: number }

/**
 * Watches the room through this computer's camera (the picture is never shown or sent anywhere) and
 * calls `onStopSmiling` each time someone who was smiling stops. `onStatus` hears how many faces it
 * sees and how many are smiling, or what went wrong.
 */
export function SmileCamera({ onStopSmiling, onStatus }: { onStopSmiling: () => void; onStatus: (status: Status) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onStopSmiling, onStatus });
  callbacks.current = { onStopSmiling, onStatus };

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let landmarker: FaceLandmarker | undefined;
    let timer: number | undefined;
    let tracks: Track[] = [];
    let reported = "";
    let reportedAt = 0;
    const report = (status: Status) => {
      const key = JSON.stringify(status);
      const now = Date.now();
      // Only changes, and at most twice a second.
      if (key === reported || (!status.error && now - reportedAt < 500)) return;
      reported = key;
      reportedAt = now;
      callbacks.current.onStatus(status);
    };

    async function start() {
      report({ starting: true });
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      } catch (e) {
        const blocked = e instanceof DOMException && e.name === "NotAllowedError";
        report({ error: blocked ? "Camera blocked. Allow it in the main screen's address bar, then reload." : "No camera found on the main screen." });
        return;
      }
      const v = video.current;
      if (stopped || !v) return;
      v.srcObject = stream;
      await v.play().catch(() => {});

      try {
        const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const create = (delegate: "GPU" | "CPU") => FaceLandmarker.createFromOptions({ wasmLoaderPath, wasmBinaryPath }, {
          baseOptions: { modelAssetPath, delegate }, runningMode: "VIDEO", numFaces: MAX_FACES, outputFaceBlendshapes: true,
        });
        landmarker = await create("GPU").catch(() => create("CPU"));
      } catch {
        report({ error: "Couldn't load the face detection. Reload the main screen to try again." });
        return;
      }
      if (stopped) { landmarker.close(); return; }

      const step = () => {
        if (stopped || !landmarker) return;
        if (v.readyState >= 2) {
          const now = performance.now();
          const faces = facesIn(landmarker.detectForVideo(v, now));
          tracks = follow(tracks, faces, now, () => callbacks.current.onStopSmiling());
          report({ faces: faces.length, smiling: tracks.filter((t) => t.seenAt === now && t.smiling).length });
        }
        timer = window.setTimeout(step, FRAME_MS);
      };
      step();
    }

    void start();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  return <video ref={video} className="smile-camera" muted playsInline aria-hidden />;
}

/** Where each face is (its nose) and how much it's smiling (both corners of the mouth). */
function facesIn(result: FaceLandmarkerResult): Face[] {
  return result.faceLandmarks.map((points, i) => {
    const shapes = result.faceBlendshapes[i]?.categories ?? [];
    const shape = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
    const nose = points[1] ?? points[0] ?? { x: 0, y: 0 };
    return { x: nose.x, y: nose.y, score: (shape("mouthSmileLeft") + shape("mouthSmileRight")) / 2 };
  });
}

/**
 * Matches this frame's faces to the people seen before (nearest first), updates who's smiling, and
 * calls `onStop` for each person whose smile has just ended. Someone new starts as they are (no buzz).
 */
function follow(tracks: Track[], faces: Face[], now: number, onStop: () => void): Track[] {
  const free = [...tracks];
  const next: Track[] = [];
  for (const face of faces) {
    let best = -1;
    let bestDist = SAME_FACE;
    free.forEach((t, i) => {
      const d = Math.hypot(t.x - face.x, t.y - face.y);
      if (d < bestDist) { best = i; bestDist = d; }
    });
    const [track] = best >= 0 ? free.splice(best, 1) : [];
    if (!track) {
      next.push({ x: face.x, y: face.y, smiling: face.score > SMILE_ON, seenAt: now });
      continue;
    }
    const smiling = face.score > SMILE_ON ? true : face.score < SMILE_OFF ? false : track.smiling;
    let changingSince = smiling === track.smiling ? undefined : track.changingSince ?? now;
    let settled = track.smiling;
    if (changingSince !== undefined && now - changingSince >= HOLD_MS) {
      if (track.smiling && !smiling) onStop();
      settled = smiling;
      changingSince = undefined;
    }
    next.push({ x: face.x, y: face.y, smiling: settled, changingSince, seenAt: now });
  }
  // People out of view for a moment (turned away, walked past someone) are kept for a little while.
  return [...next, ...free.filter((t) => now - t.seenAt < FORGET_MS)];
}
