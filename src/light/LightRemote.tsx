import { useEffect, useRef, useState } from "react";
import type { Session } from "../types";
import {
  DELAY_MS, cameraText, isAllMode, isArmed, lightAllNow, lightLater, lightNow, lightOf, lightOneLater, releaseLight, setAllMode, setArmed, setTrigger, triggerOf,
} from "./data";
import { TRIGGERS } from "./triggers";

/**
 * The host phone's light controls (on every view): one secret trigger or all at once, what the camera
 * sees, pause and manual lights.
 */
export function LightRemote({ code, session }: { code: string; session: Session }) {
  const light = lightOf(session);
  const armed = isArmed(light);
  const running = !!session.lightUid;
  const trigger = triggerOf(light);
  const all = isAllMode(light);
  // Manual lights counting down (for someone the camera missed).
  const [pending, setPending] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function lightSoon() {
    setPending((n) => n + 1);
    timers.current.push(lightLater(code), window.setTimeout(() => setPending((n) => n - 1), DELAY_MS));
  }
  // All at once: one colour's bulb, after the delay (for something the camera missed).
  const [pendingOne, setPendingOne] = useState<string[]>([]);
  function lightOneSoon(id: string) {
    setPendingOne((p) => [...p, id]);
    timers.current.push(lightOneLater(code, id), window.setTimeout(() => setPendingOne((p) => p.filter((x) => x !== id)), DELAY_MS));
  }

  return (
    <div className="light-remote">
      <div className="steps two">
        <button className={all ? "step" : "step active"} onClick={() => { if (all) void setAllMode(code, false); }}>One secret</button>
        <button className={all ? "step active" : "step"} onClick={() => { if (!all) void setAllMode(code, true); }}>All at once</button>
      </div>
      {all ? (
        <>
          <p className="muted small">
            Only you know: each bulb goes on {DELAY_MS / 1000} seconds after anyone does its action. The players see the colours, not the names.
            Tap one to light it in {DELAY_MS / 1000} s (for something the camera missed).
          </p>
          <div className="steps two">
            {TRIGGERS.map((t) => (
              <button key={t.id} className="step light-key" style={{ "--bulb": t.colour } as React.CSSProperties}
                disabled={!running || pendingOne.includes(t.id)} onClick={() => lightOneSoon(t.id)}>
                <span className="swatch" aria-hidden />{pendingOne.includes(t.id) ? "Lighting…" : t.label}
                <span className="muted small">{t.colourName}</span>
              </button>
            ))}
          </div>
          <p>{cameraText(session)}</p>
          <button disabled={!running} onClick={() => void lightAllNow(code)}>Light them all now</button>
        </>
      ) : (
        <>
          <p className="muted small">
            Only you know: the light goes on {DELAY_MS / 1000} seconds after anyone <strong>{trigger.secret}</strong>. A computer running /light watches for it.
          </p>
          <p className="muted small">The secret:</p>
          <div className="steps two">
            {TRIGGERS.map((t) => (
              <button key={t.id} className={t.id === trigger.id ? "step active" : "step"}
                onClick={() => { if (t.id !== trigger.id) void setTrigger(code, t.id); }}>{t.label}</button>
            ))}
          </div>
          <p>{cameraText(session)}</p>
          <div className="steps two">
            <button disabled={!running || pending > 0} onClick={lightSoon}>{pending > 0 ? "Lighting…" : `Light in ${DELAY_MS / 1000} s`}</button>
            <button disabled={!running} onClick={() => void lightNow(code)}>Light it now</button>
          </div>
          <p className="muted small">"Light in {DELAY_MS / 1000} s" is for something the camera missed; "Light it now" is a test.</p>
        </>
      )}
      {(all || trigger.model === "pose") && <p className="muted small">The camera needs to see people's arms and shoulders, not just faces.</p>}
      <button className={armed ? undefined : "active"} disabled={!running} onClick={() => void setArmed(code, !armed)}>
        {armed ? "⏸ Pause camera" : "▶ Resume camera"}
      </button>
      {running && (
        <button className="link" onClick={() => { if (confirm("Reset the light? The computer running it stops, and another one can take over.")) void releaseLight(code); }}>
          Reset the light computer
        </button>
      )}
    </div>
  );
}
