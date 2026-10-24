import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "../keepAwake";
import { useUid } from "../session";
import type { Session, StageHead, StageLightAsk, StageLightInfo } from "../types";
import { Camera } from "./Camera";
import { type CameraSettings, loadCameraSettings, saveCameraSettings } from "./CameraSetup";
import { claimLight, clearAsk, lightOf, setCamera, setStageInfo, watchedTriggers } from "./data";
import { useLightDriver } from "./driver";
import { HueError, type HueConfig, type HueLight, findBridges, lampsOn, listLights, loadHue, pair, reach, readLamps, restoreLamps, saveHue } from "./hue";

/** Where the camera finds heads goes to the phone at most this often, while its checklist is open. */
const HEADS_MS = 500;

/**
 * The light, run by the main screen out of sight, once the host starts it from their phone: this browser
 * becomes the session's light computer, and its camera and Hue lamp work as on /light, with nothing on the
 * screen. The main screen is always the window in front, so the camera isn't slowed down. Its camera and
 * lamp are set up from the phone, which asks for changes (see `ask`) and sees what this browser has
 * (`stage`), never the picture or the bridge's key.
 */
export function StageLight({ code, session }: { code: string; session: Session }) {
  const uid = useUid();
  const wanted = lightOf(session).onStage === true;
  // Started from the phone: take the light's slot (it stays ours after a reload, so the light picks up again).
  useEffect(() => {
    if (wanted && uid && !session.lightUid) void claimLight(code).catch(() => {});
  }, [wanted, uid, session.lightUid, code]);
  if (!wanted || !uid || session.lightUid !== uid) return null;
  return <Running code={code} session={session} />;
}

function Running({ code, session }: { code: string; session: Session }) {
  const light = lightOf(session);
  const [hue, setHue] = useState<HueConfig | undefined>(loadHue);
  const setup = light.setup === true;
  // Each time the phone opens the checklist (to fix the lamp, say), the lamps are asked again.
  const { armed, hueError, onTrigger } = useLightDriver(code, light, hue, setup);
  // Off means the camera is off too; it runs only while the light is on, or while the phone sets it up.
  const cameraOn = armed || setup;
  useEffect(() => { if (!cameraOn) void setCamera(code, { off: true }).catch(() => {}); }, [cameraOn, code]);
  const [settings, setSettings] = useState<CameraSettings>(loadCameraSettings);
  const [feed, setFeed] = useState<{ stream?: MediaStream; runsOn?: "GPU" | "CPU" }>({});
  const [cameras, setCameras] = useState<StageLightInfo["cameras"]>();
  useEffect(() => {
    // Named once the page may use the camera.
    navigator.mediaDevices?.enumerateDevices().then((all) => setCameras(all.filter((d) => d.kind === "videoinput")
      .map((d, i) => ({ id: d.deviceId, label: (d.label || `Camera ${i + 1}`).slice(0, 200) }))), () => {});
  }, [feed.stream]);

  // Where the camera finds heads, a couple of times a second, only while the phone's checklist shows them.
  const [heads, setHeads] = useState<StageHead[]>([]);
  const headsAt = useRef(0);
  const onHeads = (boxes: StageHead[]) => {
    const now = Date.now();
    if (now - headsAt.current < HEADS_MS) return;
    headsAt.current = now;
    const round = (n: number) => Math.round(n * 1000) / 1000;
    setHeads(boxes.map((b) => ({ x: round(b.x), y: round(b.y), w: round(b.w), h: round(b.h), read: b.read })));
  };
  useEffect(() => { if (!setup) setHeads([]); }, [setup]);

  // The bridge's lamps, and how the phone's last ask went.
  const [lamps, setLamps] = useState<HueLight[]>();
  const [found, setFound] = useState<string[]>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!hue) { setLamps(undefined); return; }
    listLights(hue).then(setLamps, (e: unknown) => setError(message(e)));
  }, [hue?.host, hue?.scheme, hue?.username]);

  const changeHue = (next: HueConfig | undefined) => { saveHue(next); setHue(next); };
  const changeCamera = (next: CameraSettings) => { saveCameraSettings(next); setSettings(next); };

  // Does what the phone asks, once each.
  const done = useRef<number>();
  const ask = light.ask;
  useEffect(() => {
    if (!ask || done.current === ask.id) return;
    done.current = ask.id;
    void clearAsk(code).catch(() => {});
    void run(ask);
  }, [ask?.id]);

  async function run(ask: StageLightAsk) {
    const job = async () => {
      switch (ask.kind) {
        case "camera": changeCamera({ ...settings, deviceId: ask.value }); return;
        case "processor": changeCamera({ ...settings, processor: ask.value === "cpu" ? "cpu" : undefined }); return;
        case "find": {
          const ips = await findBridges();
          setFound(ips);
          if (!ips.length) throw new HueError("No bridge found. Type its address instead (it's in the Hue app under Settings → Bridges).");
          return;
        }
        case "connect": {
          const host = (ask.value ?? "").trim();
          const scheme = await reach(host);
          changeHue({ host, scheme, username: await pair(host, scheme), lights: [] });
          return;
        }
        case "lamp": {
          const lamp = lamps?.find((l) => l.id === ask.value);
          if (!hue || !lamp) return;
          const on = hue.lights.some((l) => l.id === lamp.id);
          changeHue({ ...hue, lights: on ? hue.lights.filter((l) => l.id !== lamp.id) : [...hue.lights, lamp] });
          return;
        }
        case "test": {
          if (!hue?.lights.length) return;
          const was = await readLamps(hue);
          await lampsOn(hue);
          await new Promise((r) => window.setTimeout(r, 1000));
          await restoreLamps(hue, was);
          return;
        }
      }
    };
    const label = { find: "Looking…", connect: "Connecting…", test: "Flashing…" }[ask.kind as string];
    setBusy(label);
    setError(undefined);
    try { await job(); } catch (e) { setError(message(e)); } finally { setBusy(undefined); }
  }

  // What this browser has, for the phone's checklist (only written when it changes).
  const info: StageLightInfo = {
    ...(cameras?.length && { cameras }),
    // The camera in use, or (while it's off) the one picked, so its name shows before the light first goes on.
    ...((feed.stream?.getVideoTracks()[0]?.getSettings().deviceId ?? settings.deviceId) && { cameraId: feed.stream?.getVideoTracks()[0]?.getSettings().deviceId ?? settings.deviceId }),
    ...((settings.processor === "cpu" || feed.runsOn === "CPU") && { cpu: true }),
    ...(setup && heads.length && { heads }),
    hue: {
      ...(hue && { bridge: hue.host, chosen: Object.fromEntries(hue.lights.map((l) => [l.id, true])) }),
      ...(lamps?.length && { lamps: lamps.map((l) => ({ id: l.id, name: l.name.slice(0, 100), color: l.color })) }),
      ...(found?.length && { found }),
      ...(busy && { busy }),
      ...((error ?? hueError) && { error: (error ?? hueError)!.slice(0, 300) }),
    },
  };
  const sent = useRef<string>();
  const json = JSON.stringify(info);
  useEffect(() => {
    if (json === sent.current) return;
    sent.current = json;
    void setStageInfo(code, JSON.parse(json) as StageLightInfo).catch(() => {});
  }, [json, code]);

  useKeepAwake();

  return cameraOn ? (
    <Camera triggers={watchedTriggers(light)} settings={settings}
      onStream={(stream, runsOn) => setFeed({ stream, runsOn })}
      onHeads={setup ? onHeads : undefined}
      onTrigger={onTrigger}
      onStatus={(status) => void setCamera(code, status).catch(() => {})} />
  ) : null;
}

const message = (e: unknown) => (e instanceof HueError ? e.message : "Something went wrong talking to the bridge.");
