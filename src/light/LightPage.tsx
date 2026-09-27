import { onDisconnect, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import { useStageBarVisible } from "../stageBar";
import { RecentList, WATCHED_KEY, HOSTED_KEY, loadRecent, mergeRecent } from "../recent";
import { JoinError, store, useSession, useUid } from "../session";
import { Toggle } from "../Toggle";
import type { LightState, Session } from "../types";
import { Bulb } from "./Bulb";
import {
  claimLight, isArmed, lightAllNow, lightLater, lightNow, lightOf, lightOneLater, modeOf, ONE, releaseLight, SPIN_STEP_MS, setArmed, setCamera, useFlash, watchedTriggers,
} from "./data";
import { RED, type HueConfig, loadHue } from "./hue";
import { CameraSetup, type CameraSettings, loadCameraSettings } from "./CameraSetup";
import { HueSetup, useHueLamps } from "./HueSetup";
import { Camera, type HeadBox } from "./Camera";

const KEY = "ba.lightCode";

/**
 * The light (`/light`): runs all evening on a computer with a webcam, whatever game is on. It watches
 * the room, turns the light on 2 seconds after anyone does the secret trigger, and drives a real Hue
 * lamp. The host phone picks the trigger, and can pause it or turn it on by hand. Players may see this
 * screen, so it never says what the trigger is.
 */
export function LightPage() {
  const uid = useUid();
  const [code, setCode] = useState(() => store.get(KEY));
  const session = useSession(code || undefined);

  useEffect(() => { document.title = "Taskmaster - The Light"; }, []);

  const disconnect = () => { store.set(KEY, ""); setCode(""); };
  // Session gone, or the host reset the light → back to code entry.
  useEffect(() => {
    if (!uid || session === undefined) return;
    if (session === null || session.lightUid !== uid) disconnect();
  }, [uid, session]);

  if (!code) return <Connect onConnected={(c) => { store.set(KEY, c); setCode(c); }} />;
  if (!session || session.lightUid !== uid) return <main className="center"><p>Connecting…</p></main>;
  return <Running code={code} session={session} onStop={() => { void releaseLight(code); disconnect(); }} />;
}

function Running({ code, session, onStop }: { code: string; session: Session; onStop: () => void }) {
  const light = lightOf(session);
  const armed = isArmed(light);
  const mode = modeOf(light);
  // One secret: the red bulb. All at once: a bulb per trigger, in its colour.
  // One flash at a time, each for its full second (see useFlash).
  const flash = useFlash(light);
  // A rainbow spin: which bulb is lit, and the lamp's colour, step with the time since it started.
  const spinning = !!mode?.spins?.some((t) => t.id === flash);
  const spun = useSpinTime(spinning);
  const [hue, setHue] = useState<HueConfig | undefined>(loadHue);
  const [settingUp, setSettingUp] = useState<"hue" | "camera">();
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(loadCameraSettings);
  // The camera's picture and what the detection runs on, for the camera panel's preview.
  const [feed, setFeed] = useState<{ stream?: MediaStream; runsOn?: "GPU" | "CPU" }>({});
  // The heads being read, only while the camera panel shows them.
  const [heads, setHeads] = useState<HeadBox[]>([]);
  // The Hue lamp flashes with it, in the same colour.
  const spinBulb = spinning && mode ? spinOrder(mode.bulbs.length)[Math.floor(spun / SPIN_STEP_MS) % mode.bulbs.length] : undefined;
  // The Hue lamp shows the lit bulb's colour (in a spin, following it round as fast as the bridge can).
  const lampColour = flash === ONE ? RED
    : spinBulb !== undefined ? mode?.bulbs[spinBulb]?.colour
    : mode?.bulbs.find((b) => b.trigger.id === flash)?.colour;
  const hueError = useHueLamps(hue, lampColour);

  // Each time someone does a trigger, its light goes on a little later (unless paused).
  const armedNow = useRef(armed);
  armedNow.current = armed;
  const timers = useRef<number[]>([]);
  useEffect(() => {
    // If this page closes, the host phone stops showing what the camera saw.
    const camera = ref(db(), `sessions/${code}/light/camera`);
    void onDisconnect(camera).remove();
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      void onDisconnect(camera).cancel();
      // Refused if the slot is already gone (Stop the light, or the host's reset), which cleared it anyway.
      setCamera(code, null).catch(() => {});
    };
  }, [code]);

  useKeepAwake();

  // Players may see this screen, so it shows just the bulbs (never what they mean). What it's doing, and its buttons, only
  // appear while the mouse moves (like the main screen's backup controls).
  const barVisible = useStageBarVisible();
  const tab = barVisible ? 0 : -1;
  return (
    <main className="stage light-stage">
      {mode ? (
        // Up to three across; a mode with few bulbs gets bigger ones in a single row.
        <div className={mode.bulbs.length > 3 ? "light-bulbs" : "light-bulbs few"}
          style={{ gridTemplateColumns: `repeat(${Math.min(3, mode.bulbs.length)}, auto)` }}>
          {mode.bulbs.map((b, i) => <Bulb key={b.trigger.id} lit={spinning ? spinBulb === i : flash === b.trigger.id} colour={b.colour} />)}
        </div>
      ) : <Bulb lit={flash === ONE} />}
      <div className={barVisible || settingUp ? "stage-controls light-bar show" : "stage-controls light-bar"} aria-hidden={!barVisible}>
        <p className="light-bar-status">
          💡 {code} · {cameraStatus(light)} · {!hue?.lights.length ? "No Hue lamp" : `Hue lamp: ${hueError ?? hue.lights.map((l) => l.name).join(", ")}`}
        </p>
        <button onClick={() => setSettingUp("camera")} tabIndex={tab}>Camera</button>
        <button onClick={() => setSettingUp("hue")} tabIndex={tab}>💡 Hue lamp</button>
        <button onClick={() => mode ? lightAllNow(code, mode) : void lightNow(code)} tabIndex={tab}>{mode ? "Light them all now" : "Light it now"}</button>
        <Toggle label="Camera watching" on={armed} onChange={(on) => void setArmed(code, on)} tabIndex={tab} />
        <button onClick={onStop} tabIndex={tab}>Stop the light</button>
        <p className="light-bar-status small">Keep this window in front all evening (not a background tab, minimised or covered). The host phone shows what the camera sees.</p>
      </div>
      <Camera triggers={watchedTriggers(light)} settings={cameraSettings}
        onStream={(stream, runsOn) => setFeed({ stream, runsOn })}
        onHeads={settingUp === "camera" ? setHeads : undefined}
        onTrigger={(id) => { if (armedNow.current) timers.current.push(mode ? lightOneLater(code, id) : lightLater(code)); }}
        onStatus={(status) => void setCamera(code, status)} />
      {settingUp === "hue" && <HueSetup config={hue} onChange={setHue} onClose={() => setSettingUp(undefined)} />}
      {settingUp === "camera" && (
        <CameraSetup settings={cameraSettings} onChange={setCameraSettings} stream={feed.stream} runsOn={feed.runsOn} heads={heads}
          people={light.camera?.people} onClose={() => setSettingUp(undefined)} />
      )}
    </main>
  );
}

/** What the camera is doing, without any counts (players may glimpse this). */
function cameraStatus(light: LightState): string {
  const camera = light.camera;
  if (camera?.error) return `Camera: ${camera.error}`;
  if (!camera || camera.starting) return "Camera starting…";
  return isArmed(light) ? "Camera on" : "Camera paused";
}

/** Milliseconds since `on` became true (0 while it's false), updated often enough to animate. */
function useSpinTime(on: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!on) return;
    const start = Date.now();
    const tick = window.setInterval(() => setElapsed(Date.now() - start), 40);
    return () => window.clearInterval(tick);
  }, [on]);
  return elapsed;
}

/** The order the spin lights the bulbs in: round the grid (three across), clockwise. */
function spinOrder(count: number): number[] {
  if (count !== 6) return [...Array(count).keys()];
  return [0, 1, 2, 5, 4, 3];
}

/** Stops the computer's screen going to sleep while the light runs (asked again whenever the page comes back). */
function useKeepAwake() {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    const request = () => {
      if (document.visibilityState === "visible") navigator.wakeLock?.request("screen").then((l) => { lock = l; }, () => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => { document.removeEventListener("visibilitychange", request); void lock?.release(); };
  }, []);
}

function Connect({ onConnected }: { onConnected: (code: string) => void }) {
  const [code, setCode] = useState(() => (new URLSearchParams(location.search).get("code") ?? "").toUpperCase().slice(0, 4));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // Sessions this computer has shown or hosted.
  const [recent] = useState(() => mergeRecent(loadRecent(WATCHED_KEY), loadRecent(HOSTED_KEY)));

  async function connect(c: string) {
    setBusy(true);
    setError(undefined);
    try { onConnected(await claimLight(c)); }
    catch (e) { setError(e instanceof JoinError ? e.message : "Something went wrong. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <main className="join watch">
      <h1>Taskmaster - <span className="nowrap">The Light</span></h1>
      <form onSubmit={(e) => { e.preventDefault(); void connect(code); }}>
        <label>Game code (from the main screen)
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            maxLength={4} autoCapitalize="characters" autoComplete="off" placeholder="ABCD" required />
        </label>
        <button type="submit" className="big" disabled={busy || code.length !== 4}>{busy ? "Starting…" : "Start the light"}</button>
        {error && <p className="error">{error}</p>}
        <p className="muted small">Run this on a computer with a webcam that can see everyone, on the same network as the Hue Bridge. It keeps running whatever game is on.</p>
      </form>
      <RecentList recent={recent} busy={busy} onPick={(c) => void connect(c)} />
    </main>
  );
}
