import { useEffect, useRef, useState } from "react";
import { store } from "../session";
import type { HeadBox } from "./Camera";

/** This computer's camera choices for the light (kept in this browser, like the Hue lamp). */
export interface CameraSettings {
  /** The camera to use; the computer's default when absent. */
  deviceId?: string;
  /** "cpu": run the detection on the processor. Otherwise the graphics card, if it starts. */
  processor?: "cpu";
}

const KEY = "ba.lightCamera";

/*
 * Cameras that aren't really a webcam looking at the room: virtual cameras from streaming and
 * phone-as-webcam apps, and the infrared camera Windows Hello uses. When nobody has chosen a camera,
 * the light skips these (a PC often lists one of them first).
 */
const NOT_A_WEBCAM = /virtual|\bobs\b|droidcam|snap camera|manycam|xsplit|splitcam|\bndi\b|streamlabs|mmhmm|\bcamo\b|epoccam|iriun|ivcam|e2esoft|nvidia broadcast|\bir camera|infrared|windows hello/i;
export const isVirtualCamera = (label: string) => NOT_A_WEBCAM.test(label);

export function loadCameraSettings(): CameraSettings {
  try { return (JSON.parse(store.get(KEY)) as CameraSettings) || {}; } catch { return {}; }
}
const saveCameraSettings = (settings: CameraSettings) => store.set(KEY, JSON.stringify(settings));

/**
 * The /light page's camera settings: which camera, and graphics card or processor, with a live preview
 * and how many people the detection finds, so it's easy to see what works on this computer. The preview
 * only shows while this panel is open.
 */
export function CameraSetup({ settings, onChange, stream, runsOn, heads, people, onClose }: {
  settings: CameraSettings;
  onChange: (settings: CameraSettings) => void;
  stream: MediaStream | undefined;
  runsOn: "GPU" | "CPU" | undefined;
  /** The heads whose faces are being read (outlined on the preview). */
  heads: HeadBox[];
  people: number | undefined;
  onClose: () => void;
}) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    // Named once the page may use the camera (it already does).
    navigator.mediaDevices.enumerateDevices().then((all) => setCameras(all.filter((d) => d.kind === "videoinput")), () => {});
  }, [stream]);

  const preview = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (preview.current) preview.current.srcObject = stream ?? null;
  }, [stream]);

  const track = stream?.getVideoTracks()[0]?.getSettings();
  const current = track?.deviceId;
  // The preview takes the camera's shape, so the outlines land on the heads.
  const shape = track?.width && track.height ? `${track.width} / ${track.height}` : "16 / 9";
  const update = (next: CameraSettings) => { saveCameraSettings(next); onChange(next); };

  return (
    <div className="start-overlay" onClick={onClose}>
      <section className="slot hue-setup camera-setup" onClick={(e) => e.stopPropagation()}>
        <h2>Camera</h2>
        <div className="camera-preview" style={{ aspectRatio: shape }}>
          {stream ? <video ref={preview} autoPlay muted playsInline /> : <p className="slot-hint">Starting the camera…</p>}
          {stream && heads.map((b, i) => (
            <span key={i} className={b.read ? "camera-head read" : "camera-head"}
              style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} />
          ))}
          {stream && <span className="camera-count">{people === undefined ? "…" : `${people} ${people === 1 ? "person" : "people"} found`}</span>}
        </div>
        <p className="slot-hint">
          Everyone should be in the picture, and the count should match. Faces are read where there's a solid
          green square; a dashed one means a head was found but not its face (turned away, too dark, too far).
          Only this panel shows the picture.
        </p>

        <p className="slot-hint"><strong>Which camera</strong></p>
        <div className="steps">
          {cameras.map((c, i) => (
            <button key={c.deviceId} className={c.deviceId === current ? "step active" : "step"}
              onClick={() => update({ ...settings, deviceId: c.deviceId })}>
              {c.label || `Camera ${i + 1}`}{isVirtualCamera(c.label) ? " (virtual, skipped unless picked)" : ""}
            </button>
          ))}
        </div>

        <p className="slot-hint"><strong>Run the detection on</strong></p>
        <div className="steps two">
          <button className={settings.processor === "cpu" ? "step" : "step active"} onClick={() => update({ ...settings, processor: undefined })}>Graphics card</button>
          <button className={settings.processor === "cpu" ? "step active" : "step"} onClick={() => update({ ...settings, processor: "cpu" })}>Processor</button>
        </div>
        <p className="slot-hint">
          {runsOn === "CPU" && settings.processor !== "cpu" ? "The graphics card didn't start, so it's using the processor. " : ""}
          If the picture is fine but nobody is found, try Processor: some graphics cards (often on Windows) run the detection but find nothing.
        </p>
        <div className="row">
          <button onClick={onClose}>Done</button>
        </div>
      </section>
    </div>
  );
}
