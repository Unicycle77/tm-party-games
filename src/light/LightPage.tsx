import { useEffect, useState } from "react";
import { useStageBarVisible } from "../useStageBarVisible";
import { RecentList, WATCHED_KEY, HOSTED_KEY, loadRecent, mergeRecent } from "../recent";
import { JoinError, store, useSession, useUid } from "../session";
import { Toggle } from "../Toggle";
import type { LightState, Session } from "../types";
import { Bulb } from "./Bulb";
import { claimLight, isArmed, lightAllNow, lightNow, lightOf, ONE, releaseLight, setArmed, setCamera, watchedTriggers } from "./data";
import { useLightDriver } from "./driver";
import { type HueConfig, loadHue } from "./hue";
import { CameraSetup, type CameraSettings, loadCameraSettings } from "./CameraSetup";
import { HueSetup } from "./HueSetup";
import { Camera, type HeadBox } from "./Camera";
import { useKeepAwake } from "../keepAwake";

const KEY = "ba.lightCode";

/**
 * The light (`/light`): runs all evening on a computer with a webcam, whatever task is on. It watches
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
  const [hue, setHue] = useState<HueConfig | undefined>(loadHue);
  const { armed, mode, flash, spinning, spinBulb, hueError, onTrigger } = useLightDriver(code, light, hue);
  const [settingUp, setSettingUp] = useState<"hue" | "camera">();
  // The setup checklist comes first on every load, so a broken camera shows before guests arrive.
  const [checking, setChecking] = useState(true);
  // Off means the camera is off too; it runs only while the light is on, or while setting it up.
  const cameraOn = armed || checking || settingUp === "camera";
  useEffect(() => { if (!cameraOn) void setCamera(code, { off: true }).catch(() => {}); }, [cameraOn, code]);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(loadCameraSettings);
  // The camera's picture and what the detection runs on, for the camera panel's preview.
  const [feed, setFeed] = useState<{ stream?: MediaStream; runsOn?: "GPU" | "CPU" }>({});
  // The heads being read, only while the camera panel shows them.
  const [heads, setHeads] = useState<HeadBox[]>([]);

  useKeepAwake();

  // Players may see this screen, so it shows just the bulbs (never what they mean). What it's doing, and its buttons, only
  // appear while the mouse moves (like the main screen's backup controls).
  const barVisible = useStageBarVisible();
  const tab = barVisible ? 0 : -1;
  const bulbs = mode ? (
        // Up to three across; a mode with few bulbs gets bigger ones in a single row.
        <div className={mode.bulbs.length > 3 ? "light-bulbs" : "light-bulbs few"}
          style={{ gridTemplateColumns: `repeat(${Math.min(3, mode.bulbs.length)}, auto)` }}>
          {mode.bulbs.map((b, i) => <Bulb key={b.trigger.id} lit={spinning ? spinBulb === i : flash === b.trigger.id} colour={b.colour} />)}
        </div>
      ) : <Bulb lit={flash === ONE} />;
  const cameraLabel = feed.stream?.getVideoTracks()[0]?.label;
  return (
    <main className="stage light-stage">
      {checking ? (
        <LightChecklist cameraLabel={cameraLabel} camera={light.camera} hue={hue}
          onCamera={() => setSettingUp("camera")} onHue={() => setSettingUp("hue")} onTest={() => void lightNow(code)}
          lit={!!flash} onDone={() => setChecking(false)} />
      // While off, only the curtain (a test still flashes the bulb); switching on fades the bulb in.
      ) : (armed || flash) && <div className="light-show">{bulbs}</div>}
      <div className={barVisible || settingUp ? "stage-controls light-bar show" : "stage-controls light-bar"} aria-hidden={!barVisible}>
        <p className="light-bar-status">
          💡 {code} · {cameraStatus(light)} · {!hue?.lights.length ? "No Hue lamp" : `Hue lamp: ${hueError ?? hue.lights.map((l) => l.name).join(", ")}`}
        </p>
        <button onClick={() => setSettingUp("camera")} tabIndex={tab}>Camera</button>
        <button onClick={() => setSettingUp("hue")} tabIndex={tab}>💡 Hue lamp</button>
        <button onClick={() => mode ? lightAllNow(code, mode) : void lightNow(code)} tabIndex={tab}>{mode ? "Light them all now" : "Light it now"}</button>
        <Toggle label="Light on" on={armed} onChange={(on) => void setArmed(code, on)} tabIndex={tab} />
        <button onClick={onStop} tabIndex={tab}>Stop the light</button>
        <p className="light-bar-status small">Keep this window in front all evening (not a background tab, minimised or covered). The host phone shows what the camera sees.</p>
      </div>
      {cameraOn && <Camera triggers={watchedTriggers(light)} settings={cameraSettings}
        onStream={(stream, runsOn) => setFeed({ stream, runsOn })}
        onHeads={settingUp === "camera" ? setHeads : undefined}
        onTrigger={onTrigger}
        onStatus={(status) => void setCamera(code, status)} />}
      {settingUp === "hue" && <HueSetup config={hue} onChange={setHue} onClose={() => setSettingUp(undefined)} />}
      {settingUp === "camera" && (
        <CameraSetup settings={cameraSettings} onChange={setCameraSettings} stream={feed.stream} runsOn={feed.runsOn} heads={heads}
          people={light.camera?.people} onClose={() => setSettingUp(undefined)} />
      )}
    </main>
  );
}

/**
 * The light computer's setup, on the curtain: the camera (with what it sees), the Hue lamp, and full screen,
 * which also keeps this window in front for the camera. Then it settles on the bare curtain.
 */
function LightChecklist({ cameraLabel, camera, hue, lit, onCamera, onHue, onTest, onDone }: {
  cameraLabel?: string; camera: LightState["camera"]; hue?: HueConfig; lit: boolean;
  onCamera: () => void; onHue: () => void; onTest: () => void; onDone: () => void;
}) {
  const [skipLamp, setSkipLamp] = useState(false);
  const cameraOk = !!camera && !camera.error && !camera.starting && !camera.off;
  const lamp = hue?.lights.length ? hue.lights.map((l) => l.name).join(", ") : undefined;
  function start() {
    void document.documentElement.requestFullscreen?.().catch(() => {});
    onDone();
  }
  return (
    <section className="gate light-check">
      <h1>The Light</h1>
      <ul className="gate-checks">
        <li className={cameraOk ? "done" : camera?.error ? "failed" : "todo"}>
          {cameraOk ? "✓" : "○"} Camera: {camera?.error ?? (cameraOk ? `${cameraLabel ?? "on"}, sees ${camera.people ?? 0}` : "starting…")}
          <button className="link" onClick={onCamera}>Change</button>
        </li>
        <li className={lamp || skipLamp ? "done" : "todo"}>
          {lamp || skipLamp ? "✓" : "○"} Hue lamp: {lamp ?? (skipLamp ? "none tonight" : "not set up")}
          {lamp && <button className="link" onClick={onTest}>{lit ? "Lit" : "Test"}</button>}
          <button className="link" onClick={onHue}>{lamp ? "Change" : "Set up"}</button>
          {!lamp && !skipLamp && <button className="link" onClick={() => setSkipLamp(true)}>Skip, no lamp tonight</button>}
        </li>
      </ul>
      <button className="big raise" onClick={start}>Go full screen</button>
      <p className="muted small">Full screen keeps this window in front, which the camera needs all evening.</p>
    </section>
  );
}

/** What the camera is doing, without any counts (players may glimpse this). */
function cameraStatus(light: LightState): string {
  const camera = light.camera;
  if (camera?.error) return `Camera: ${camera.error}`;
  if (!camera || camera.starting) return "Camera starting…";
  return isArmed(light) ? "Camera on" : "Camera paused";
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
        <label>Party code (from the main screen)
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            maxLength={4} autoCapitalize="characters" autoComplete="off" placeholder="ABCD" required />
        </label>
        <button type="submit" className="big" disabled={busy || code.length !== 4}>{busy ? "Starting…" : "Start the light"}</button>
        {error && <p className="error">{error}</p>}
        <p className="muted small">Run this on a computer with a webcam that can see everyone, on the same network as the Hue Bridge. It keeps running whatever task is on.</p>
      </form>
      <RecentList recent={recent} busy={busy} onPick={(c) => void connect(c)} />
    </main>
  );
}
