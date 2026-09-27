import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_internal.js?url";
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_internal.wasm?url";
import { useEffect, useRef } from "react";
import faceModel from "../assets/light/face_landmarker.task?url";
import poseModel from "../assets/light/pose_landmarker_full.task?url";
import type { LightState } from "../types";
import { type CameraSettings, isVirtualCamera } from "./CameraSetup";
import { type FaceReading, type Person, type Trigger, facePeople, faceReadings, heads, posePeople } from "./triggers";

type Status = NonNullable<LightState["camera"]>;

/** Up to this many people in view are watched. */
const MAX_PEOPLE = 8;
/** How often a frame is checked. */
const FRAME_MS = 100;
/** Each head is cut out of the picture at this size (pixels) for the face reading. */
const CLOSE_UP = 256;

/** A head the camera is reading, for the settings panel's preview: a square (0–1 of the picture), and whether a face was read in it. */
export interface HeadBox { x: number; y: number; w: number; h: number; read: boolean }
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
export function Camera({ triggers, settings, onTrigger, onStatus, onStream, onHeads }: {
  triggers: Trigger[];
  /** Which camera, and whether the detection may use the graphics card (see CameraSetup). */
  settings: CameraSettings;
  onTrigger: (id: string) => void;
  onStatus: (status: Status) => void;
  /** The camera's picture and what the detection runs on, for the settings panel's preview. */
  onStream?: (stream: MediaStream | undefined, runsOn: "GPU" | "CPU" | undefined) => void;
  /** Every frame, the heads being read (only while something shows them). */
  onHeads?: (heads: HeadBox[]) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const latest = useRef({ triggers, onTrigger, onStatus, onStream, onHeads });
  latest.current = { triggers, onTrigger, onStatus, onStream, onHeads };
  const { deviceId, processor } = settings;
  // Which detectors the triggers need; the camera starts again with them when that changes. Face triggers
  // need the body detector too: it finds people much further away, and their heads are then read close up.
  const needs = new Set(triggers.map((t) => t.model));
  if (needs.has("face")) needs.add("pose");
  const models = [...needs].sort().join("+");

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
      // As sharp as the camera goes (up to 1080p), for close-ups of faces across the room.
      const size = { width: { ideal: 1920 }, height: { ideal: 1080 } };
      const open = (id?: string) => navigator.mediaDevices.getUserMedia({ video: id ? { ...size, deviceId: { exact: id } } : size, audio: false });
      try {
        // The chosen camera; if none is chosen, or it's gone (unplugged), the computer's default one.
        let chosen = !!deviceId;
        stream = await open(deviceId).catch((e: unknown) => {
          if (deviceId && e instanceof DOMException && (e.name === "OverconstrainedError" || e.name === "NotFoundError")) {
            chosen = false;
            return open();
          }
          throw e;
        });
        // A default that's a virtual camera (DroidCam, OBS…) doesn't see the room: use a real one instead.
        // (Cameras only have names once the page may use one, hence after opening the default.)
        if (!chosen && isVirtualCamera(stream.getVideoTracks()[0]?.label ?? "")) {
          const real = (await navigator.mediaDevices.enumerateDevices())
            .find((d) => d.kind === "videoinput" && d.label && !isVirtualCamera(d.label));
          if (real) {
            stream.getTracks().forEach((t) => t.stop());
            stream = await open(real.deviceId);
          }
        }
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        report({ error: name === "NotAllowedError" ? "Camera blocked. Allow it in the /light page's address bar, then reload."
          : name === "NotReadableError" ? "The camera is in use by another app (Teams, Zoom, the Camera app…). Close it, then reload /light."
          : "No camera found on the light computer." });
        return;
      }
      const v = video.current;
      if (stopped || !v) return;
      v.srcObject = stream;
      await v.play().catch(() => {});

      try {
        const { FaceLandmarker, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const files = { wasmLoaderPath, wasmBinaryPath };
        // The graphics card if allowed and it starts, otherwise the processor. (Some graphics cards start but
        // then find nobody, which is why the host can choose the processor in the camera settings.)
        let runsOn: "GPU" | "CPU" = processor === "cpu" ? "CPU" : "GPU";
        const either = async <T,>(create: (delegate: "GPU" | "CPU") => Promise<T>) =>
          runsOn === "CPU" ? create("CPU") : create("GPU").catch(() => { runsOn = "CPU"; return create("CPU"); });
        if (models.includes("pose")) {
          pose = await either((delegate) => PoseLandmarker.createFromOptions(files, {
            baseOptions: { modelAssetPath: poseModel, delegate }, runningMode: "VIDEO", numPoses: MAX_PEOPLE,
          }));
        }
        if (models.includes("face")) {
          // One picture at a time: a close-up of each head in turn (or the whole picture), not a video.
          face = await either((delegate) => FaceLandmarker.createFromOptions(files, {
            baseOptions: { modelAssetPath: faceModel, delegate }, runningMode: "IMAGE", numFaces: MAX_PEOPLE, outputFaceBlendshapes: true,
          }));
        }
        if (!stopped) latest.current.onStream?.(stream, runsOn);
      } catch {
        report({ error: "Couldn't load the detection. Reload the /light page to try again." });
        return;
      }
      if (stopped) { face?.close(); pose?.close(); return; }
      const closeUp = document.createElement("canvas");
      closeUp.width = closeUp.height = CLOSE_UP;
      const closeUpCtx = closeUp.getContext("2d")!;

      /**
       * The face detector only finds faces that fill a good part of the picture, so each head the body
       * detector found is cut out and read on its own. If it found nobody, the whole picture is read
       * (someone sitting right in front of the camera).
       */
      const readFaces = (detector: FaceLandmarker, boxes: ReturnType<typeof heads>): { faces: FaceReading[]; shown: HeadBox[] } => {
        const w = v.videoWidth, h = v.videoHeight;
        if (!boxes.length) return { faces: faceReadings(detector.detect(v)), shown: [] };
        const faces: FaceReading[] = [];
        const shown: HeadBox[] = [];
        for (const b of boxes) {
          const side = Math.min(b.side, w, h);
          const sx = Math.min(Math.max(b.cx - side / 2, 0), w - side), sy = Math.min(Math.max(b.cy - side / 2, 0), h - side);
          closeUpCtx.drawImage(v, sx, sy, side, side, 0, 0, CLOSE_UP, CLOSE_UP);
          // The face nearest the middle of the close-up is this person's.
          const found = faceReadings(detector.detect(closeUp), (x, y) => ({ x: (sx + x * side) / w, y: (sy + y * side) / h }))
            .sort((a, c) => Math.hypot(a.x * w - b.cx, a.y * h - b.cy) - Math.hypot(c.x * w - b.cx, c.y * h - b.cy))[0];
          if (found) faces.push(found);
          shown.push({ x: sx / w, y: sy / h, w: side / w, h: side / h, read: !!found });
        }
        return { faces, shown };
      };

      const step = () => {
        if (stopped) return;
        if (v.readyState >= 2) {
          const { triggers: ts, onTrigger: fire } = latest.current;
          const now = performance.now();
          const poses = pose?.detectForVideo(v, now);
          const read = face ? readFaces(face, poses ? heads(poses, v.videoWidth, v.videoHeight) : []) : undefined;
          latest.current.onHeads?.(read?.shown ?? []);
          const next: Record<string, Track[]> = {};
          const each: Record<string, number> = {};
          const seen = Math.max(poses?.landmarks.length ?? 0, read?.faces.length ?? 0);
          for (const t of ts) {
            if (t.model === "face" ? !read : !poses) continue;
            const people = t.model === "face" ? facePeople(read!.faces, t) : posePeople(poses!, t);
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
      latest.current.onStream?.(undefined, undefined);
    };
  }, [models, deviceId, processor]);

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
