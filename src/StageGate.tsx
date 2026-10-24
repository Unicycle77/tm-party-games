import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { hostUrlFor } from "./firebase";
import { type DirHandle, folderPickerSupported, hasAccess, pickFolder, recallFolder, rememberFolder, requestAccess } from "./musicFolder";
import type { Session } from "./types";
import { skippedStingPictures } from "./stingPictures";
import { isArmed, lightOf, lightPageGone, runsOnStage } from "./light/data";
import { stageParts } from "./light/StageSetup";

/** Tells the jukebox a music folder can now be read, so it loads it. */
export const MUSIC_READY = "taskmaster:music-ready";

type Check = "todo" | "done" | "failed";

/**
 * The closed curtain the main screen opens on (after start, resume or any refresh). One gold "Raise the
 * curtain" click turns on sound, goes full screen and reconnects the music folder, so none of these
 * chores surface later in front of the room. Anything the browser refused stays on the checklist as its
 * own button. The host QR lives here (until the host's phone connects), never on the welcome screen.
 */
export function StageGate({ code, session, onRaised, onEnd }: {
  code: string; session: Session; onRaised: () => void; onEnd: () => void;
}) {
  const [folder, setFolder] = useState<DirHandle | null>();
  const [sound, setSound] = useState<Check>("todo");
  const [full, setFull] = useState<Check>("todo");
  const [music, setMusic] = useState<Check>("todo");
  const songs = session.jukebox?.tracks?.length ?? 0;
  // Each transition folder on its own line, so it's plain which ones loaded.
  const transitions = [
    ["Transition music", session.jukebox?.transitions],
    ["Transition pictures", session.jukebox?.transitionPictures],
    ["Transition videos", session.jukebox?.transitionVideos],
  ] as const;

  useEffect(() => {
    if (!folderPickerSupported()) { setFolder(null); return; }
    void recallFolder().then(async (dir) => {
      setFolder(dir ?? null);
      if (dir && (await hasAccess(dir))) setMusic("done");
    });
  }, []);

  async function connect(dir: DirHandle | undefined): Promise<Check> {
    if (!dir) return "failed";
    try {
      if (!(await requestAccess(dir))) return "failed";
      void rememberFolder(dir);
      setFolder(dir);
      window.dispatchEvent(new Event(MUSIC_READY));
      return "done";
    } catch { return "failed"; }
  }

  function goFull(): Promise<Check> {
    if (document.fullscreenElement) return Promise.resolve("done");
    return document.documentElement.requestFullscreen?.().then(() => "done" as const, () => "failed" as const) ?? Promise.resolve("failed");
  }

  async function raise() {
    // Everything that needs the click starts before the first await, while the click still counts.
    const access = music === "done" || !folder ? Promise.resolve<Check>(music === "done" ? "done" : "todo") : connect(folder);
    const screen = goFull();
    // A click on the page is what lets audio and video play with sound from now on.
    setSound("done");
    const [m, f] = await Promise.all([access, screen]);
    setMusic(m);
    setFull(f);
    if (m !== "failed" && f !== "failed") onRaised();
  }

  async function chooseFolder() {
    const dir = await pickFolder();
    if (dir) { void rememberFolder(dir); setFolder(dir); setMusic("done"); window.dispatchEvent(new Event(MUSIC_READY)); }
  }

  const tried = sound === "done";
  const musicLine = folder === undefined ? "Music: checking…"
    : folder === null ? "Music: no folder chosen yet"
    : `Music: ${folder.name}${songs ? ` (${songs} songs)` : ""}`;

  return (
    <main className="gate">
      <h1>Taskmaster</h1>
      <button className="big raise" onClick={() => void raise()}>Raise the curtain</button>
      <ul className="gate-checks">
        <li className={sound}>{sound === "done" ? "✓" : "○"} Sound on</li>
        <li className={full}>
          {full === "done" ? "✓" : "○"} Full screen
          {full === "failed" && <button className="link" onClick={() => void goFull().then(setFull)}>Go full screen</button>}
        </li>
        {folder !== null && (
          <li className={music}>
            {music === "done" ? "✓" : "○"} {musicLine}
            {music === "failed" && folder && <button className="link" onClick={() => void connect(folder).then(setMusic)}>Reconnect</button>}
          </li>
        )}
        {folder && music === "done" && transitions.map(([name, list]) => {
          const n = list ? Object.keys(list).length : 0;
          return <li key={name} className={`gate-sub ${n ? "done" : "failed"}`}>{n ? "✓" : "○"} {name}: {n || `none found (add a folder named "${name}")`}{name === "Transition pictures" && skippedStingPictures().length > 0 && ` · couldn't read ${skippedStingPictures().join(", ")}`}</li>;
        })}
        <LightCheck session={session} />
      </ul>
      {tried && (full === "failed" || music === "failed") && (
        <button className="link" onClick={onRaised}>Raise it anyway</button>
      )}
      {!session.controllerUid && (
        <figure className="host-qr">
          <QRCodeSVG value={hostUrlFor(code)} size={160} bgColor="#fff" marginSize={2} />
          <figcaption>Host scans here</figcaption>
        </figure>
      )}
      <p className="gate-quiet muted small">
        Party <strong>{code}</strong>
        {folderPickerSupported() && <> · <button className="link" onClick={() => void chooseFolder()}>{folder ? "Change asset folder" : "Select asset folder"}</button></>}
        {" · "}<button className="link" onClick={onEnd}>End session</button>
      </p>
    </main>
  );
}

/**
 * The light, on the main screen's checklist: running here out of sight (and with what), on a /light computer,
 * in trouble, or not started yet, at every party. It never holds up raising the curtain: it starts from the
 * host phone's 💡.
 */
function LightCheck({ session }: { session: Session }) {
  const light = lightOf(session);
  if (!session.lightUid) return <li className="todo">○ The light: not started. Start it from 💡 on the host phone.</li>;
  if (!runsOnStage(session)) {
    return lightPageGone(session)
      ? <li className="failed">○ The light: its /light page has closed. Run it here from 💡 on the host phone.</li>
      : <li className="done">✓ The light: on another computer</li>;
  }
  if (light.stage?.hue?.error) return <li className="failed">○ The light: the Hue lamp isn't responding. Fix it from 💡 on the host phone.</li>;
  if (isArmed(light) && light.camera?.error) return <li className="failed">○ The light: camera: {light.camera.error}</li>;
  return <li className="done">✓ The light: running here, out of sight · {stageParts(session).join(" · ")}</li>;
}
