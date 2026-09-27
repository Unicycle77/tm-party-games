import { useEffect, useRef, useState } from "react";
import type { Session } from "../types";
import { DELAY_MS, cameraText, isArmed, lightLater, lightNow, lightOf, releaseLight, setArmed, setTrigger, triggerOf } from "./data";
import { TRIGGERS } from "./triggers";

/** The host phone's light controls (on every view): the secret trigger, what the camera sees, pause and a manual light. */
export function LightRemote({ code, session }: { code: string; session: Session }) {
  const light = lightOf(session);
  const armed = isArmed(light);
  const running = !!session.lightUid;
  const trigger = triggerOf(light);
  // Manual lights counting down (for someone the camera missed).
  const [pending, setPending] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function lightSoon() {
    setPending((n) => n + 1);
    timers.current.push(lightLater(code), window.setTimeout(() => setPending((n) => n - 1), DELAY_MS));
  }

  return (
    <div className="light-remote">
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
      {trigger.model === "pose" && <p className="muted small">The camera needs to see people's arms and shoulders, not just faces.</p>}
      <p>{cameraText(session)}</p>
      <div className="steps two">
        <button disabled={!running || pending > 0} onClick={lightSoon}>{pending > 0 ? "Lighting…" : `Light in ${DELAY_MS / 1000} s`}</button>
        <button disabled={!running} onClick={() => void lightNow(code)}>Light it now</button>
      </div>
      <p className="muted small">"Light in {DELAY_MS / 1000} s" is for something the camera missed; "Light it now" is a test.</p>
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
