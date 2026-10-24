import { useState } from "react";
import type { Session } from "../types";
import { askStage, isArmed, lightOf, setSetup } from "./data";

export type SetupStep = "camera" | "lamp";

/**
 * The host phone's checklist for the light running on the big screen: the camera (which one, and the heads
 * it finds, drawn on an empty frame: the picture never leaves that computer), then the Hue lamp (which lamps,
 * and a test flash, only while the light is off). The camera and the bridge's key are kept in the big screen's browser, so each change is
 * asked of it (see `askStage`). Nothing shows on the TV.
 */
export function StageSetup({ code, session, start = "camera" }: { code: string; session: Session; start?: SetupStep }) {
  const light = lightOf(session);
  const stage = light.stage ?? {};
  const camera = light.camera;
  const hue = stage.hue ?? {};
  const [step, setStep] = useState<SetupStep>(start);
  const [host, setHost] = useState("");

  const cameraOk = !!camera && !camera.error && !camera.starting && !camera.off && camera.people !== undefined;
  const people = camera?.people ?? 0;
  const label = cameraLabel(session);
  const chosen = (hue.lamps ?? []).filter((l) => hue.chosen?.[l.id]);
  const lampNames = chosen.map((l) => l.name).join(", ");
  const done = () => { void setSetup(code, false); setStep("camera"); };

  return (
    <>
      <ul className="gate-checks">
        <li className={cameraOk ? "done" : camera?.error ? "failed" : "todo"}>
          {cameraOk ? "✓" : "○"} Camera: {camera?.error ?? (cameraOk ? `${label ?? "on"}, sees ${people} ${people === 1 ? "person" : "people"}` : "starting…")}
          {step === "lamp" && <button className="link" onClick={() => setStep("camera")}>Change</button>}
        </li>
        <li className={lampNames && !hue.error ? "done" : lampNames ? "failed" : "todo"}>
          {!lampNames ? "○ Hue lamp" : hue.error ? `○ Hue lamp: ${lampNames}, not responding` : `✓ Hue lamp: ${lampNames}`}
        </li>
      </ul>

      {step === "camera" ? (
        <>
          <div className="camera-preview" style={{ aspectRatio: "16 / 9" }}>
            {!cameraOk && <p className="slot-hint">{camera?.error ?? "Starting the camera…"}</p>}
            {cameraOk && stage.heads?.map((b, i) => (
              <span key={i} className={b.read ? "camera-head read" : "camera-head"}
                style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} />
            ))}
            {cameraOk && <span className="camera-count">{people} {people === 1 ? "person" : "people"} found</span>}
          </div>
          <p className="muted small">
            Where the camera finds heads, from the big screen's computer. The picture itself never leaves it. Solid
            green: face read. Dashed: head only (turned away, too dark, too far).
          </p>
          {!!stage.cameras?.length && (
            <>
              <p className="muted small">Which camera</p>
              <div className="choices two" role="group" aria-label="Which camera">
                {stage.cameras.map((c) => (
                  <button key={c.id} className={c.id === stage.cameraId ? "active" : ""} aria-pressed={c.id === stage.cameraId}
                    onClick={() => { if (c.id !== stage.cameraId) void askStage(code, "camera", c.id); }}>{c.label}</button>
                ))}
              </div>
            </>
          )}
          <p className="muted small">
            {stage.cpu
              ? <>Running on the processor. <button className="link" onClick={() => void askStage(code, "processor", "gpu")}>Try the graphics card</button></>
              : <>Nobody found? <button className="link" onClick={() => void askStage(code, "processor", "cpu")}>Run it on the processor</button></>}
          </p>
          <button className="big" onClick={() => setStep("lamp")}>Next: the Hue lamp</button>
        </>
      ) : hue.bridge ? (
        <>
          <p className="muted small">The big screen's computer knows the Hue Bridge at <strong>{hue.bridge}</strong>. Which lamps flash?</p>
          {!hue.lamps?.length && !hue.error && <p className="muted small">Loading the lamps…</p>}
          <div className="choices two" role="group" aria-label="Which lamps flash">
            {hue.lamps?.map((l) => (
              <button key={l.id} className={hue.chosen?.[l.id] ? "active" : ""} aria-pressed={!!hue.chosen?.[l.id]}
                onClick={() => void askStage(code, "lamp", l.id)}>{l.name}{l.color ? " (red)" : ""}</button>
            ))}
          </div>
          {/* No test while the light is on: a flash in front of the guests would look like a clue. */}
          {isArmed(light) ? (
            <p className="muted small">Switch the light off to test the lamp: a flash now would look like a clue.</p>
          ) : (
            <>
              <button className="big" disabled={!chosen.length || !!hue.busy} onClick={() => void askStage(code, "test")}>{hue.busy ?? "Flash the lamp"}</button>
              <p className="muted small">Flashes the lamp for a second, then puts it back as it was. Nothing shows on the TV.</p>
            </>
          )}
          {hue.error && <p className="error">{hue.error}</p>}
          <button onClick={done}>{chosen.length ? "Done: the light is ready" : "Done, no lamp tonight"}</button>
        </>
      ) : (
        // A bridge the big screen's computer has never paired with: the same steps as /light's Hue panel.
        <>
          <p className="muted small">Connect the big screen's computer to the Hue Bridge, so a real lamp flashes with the light.</p>
          <label>
            1. The Hue Bridge's address
            <div className="row">
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.50" inputMode="decimal" />
              <button disabled={!!hue.busy} onClick={() => void askStage(code, "find")}>Find it</button>
            </div>
          </label>
          {!!hue.found?.length && (
            <div className="choices two" role="group" aria-label="Bridges found">
              {hue.found.map((ip) => <button key={ip} className={ip === host ? "active" : ""} aria-pressed={ip === host} onClick={() => setHost(ip)}>{ip}</button>)}
            </div>
          )}
          <p className="muted small">2. Press the round button on top of the bridge, then within 30 seconds:</p>
          <button className="big" disabled={!host.trim() || !!hue.busy} onClick={() => void askStage(code, "connect", host.trim())}>{hue.busy ?? "Connect"}</button>
          {hue.error && (
            <>
              <p className="error">{hue.error}</p>
              {hue.error.startsWith("Couldn't reach") && (
                <p className="muted small">
                  The big screen's computer has to be on the same network as the bridge. If Chrome there asked about devices
                  on your local network, allow it. If it still fails, open <strong>https://{host.trim() || "the-bridge-address"}</strong> in
                  a new tab on that computer, choose Advanced → Proceed, then try again.
                </p>
              )}
            </>
          )}
          <button onClick={done}>Done, no lamp tonight</button>
        </>
      )}
    </>
  );
}

/** Under the light's switch, once it runs on the big screen: what it's using, and the way back to the checklist. */
export function ReadyLine({ session, onSetUp }: { session: Session; onSetUp: () => void }) {
  return (
    <p className="muted small">
      Ready on the big screen's computer: {stageParts(session).join(" · ")} · <button className="link" onClick={onSetUp}>Set up</button>
    </p>
  );
}

/** What the big screen is running the light with: its camera's name (once it has said) and its Hue lamps. */
export function stageParts(session: Session): string[] {
  const hue = lightOf(session).stage?.hue;
  const lamps = (hue?.lamps ?? []).filter((l) => hue?.chosen?.[l.id]).map((l) => l.name).join(", ");
  return [cameraLabel(session), lamps ? `Hue lamp: ${lamps}` : "no Hue lamp"].filter((p): p is string => !!p);
}

/** The name of the camera the big screen is using, once it has said. */
function cameraLabel(session: Session): string | undefined {
  const stage = lightOf(session).stage;
  return stage?.cameras?.find((c) => c.id === stage.cameraId)?.label;
}

/**
 * On the 💡 page when the light on the big screen needs the host: which part, what happened and what to do,
 * with a link to that part of the checklist. (A big screen that stopped answering is in the status line:
 * reopening it is the fix.)
 */
export function TroubleLine({ session, onFix }: { session: Session; onFix: (step: SetupStep) => void }) {
  const light = lightOf(session);
  const lamp = light.stage?.hue?.error;
  const camera = isArmed(light) ? light.camera?.error : undefined;
  if (!lamp && !camera) return null;
  const what = (e: string) => e.charAt(0).toLowerCase() + e.slice(1).replace(/\.$/, "");
  return lamp ? (
    <p className="error">
      The Hue lamp isn't responding: {what(lamp)}. Check the lamp is switched on at the wall,
      then <button className="link" onClick={() => onFix("lamp")}>fix it here</button>.
    </p>
  ) : (
    <p className="error">
      The camera stopped: {what(camera!)}. <button className="link" onClick={() => onFix("camera")}>Fix it here</button>.
    </p>
  );
}
