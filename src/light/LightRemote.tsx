import { useEffect, useRef, useState } from "react";
import { Toggle } from "../Toggle";
import type { Session } from "../types";
import {
  DELAY_MS, cameraText, isArmed, lightAllNow, lightLater, lightNow, lightOf, lightOneLater, modeOf, releaseLight, setArmed, setMode, setTrigger, triggerOf,
} from "./data";
import { MODES, TRIGGERS } from "./triggers";

/**
 * The host phone's light controls (its own tab): the mode (one secret trigger, or a bulb per trigger),
 * what the camera sees, pause and manual lights.
 */
export function LightRemote({ code, session }: { code: string; session: Session }) {
  const light = lightOf(session);
  const armed = isArmed(light);
  const running = !!session.lightUid;
  const trigger = triggerOf(light);
  const mode = modeOf(light);
  // Manual lights counting down (for someone the camera missed).
  const [pending, setPending] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function lightSoon() {
    setPending((n) => n + 1);
    timers.current.push(lightLater(code), window.setTimeout(() => setPending((n) => n - 1), DELAY_MS));
  }
  // A mode with several bulbs: one colour's bulb, after the delay (for something the camera missed).
  const [pendingOne, setPendingOne] = useState<string[]>([]);
  function lightOneSoon(id: string) {
    setPendingOne((p) => [...p, id]);
    timers.current.push(lightOneLater(code, id), window.setTimeout(() => setPendingOne((p) => p.filter((x) => x !== id)), DELAY_MS));
  }

  const needsArms = mode ? mode.bulbs.some((b) => b.trigger.model === "pose") : trigger.model === "pose";

  return (
    <section className="remote light-remote">
      <h2>💡 The light</h2>
      {/* What the camera sees and whether it's watching come first: that's what the host checks during the evening. */}
      <p>{cameraText(session)}</p>
      <div className="toggles">
        <Toggle label="Camera watching" on={armed} disabled={!running} onChange={(on) => void setArmed(code, on)} />
      </div>
      <div className="choices" role="group" aria-label="Mode">
        <button className={mode ? "" : "active"} aria-pressed={!mode} onClick={() => { if (mode) void setMode(code, null); }}>One secret</button>
        {MODES.map((m) => (
          <button key={m.id} className={m.id === mode?.id ? "active" : ""} aria-pressed={m.id === mode?.id}
            onClick={() => { if (m.id !== mode?.id) void setMode(code, m.id); }}>{m.label}</button>
        ))}
      </div>
      {mode ? (
        <>
          <p className="muted small">
            Only you know: each bulb goes on {DELAY_MS / 1000} s after anyone does its action. The players see the colours, not the names.
            Tap one to light it in {DELAY_MS / 1000} s (for something the camera missed).
          </p>
          <div className="light-keys">
            {mode.bulbs.map(({ trigger: t, colour, colourName }) => (
              <button key={t.id} className="light-key" style={{ "--bulb": colour } as React.CSSProperties}
                aria-label={`${t.label} (${colourName})`} disabled={!running || pendingOne.includes(t.id)} onClick={() => lightOneSoon(t.id)}>
                <span className="swatch" aria-hidden />{pendingOne.includes(t.id) ? "Lighting…" : t.label}
              </button>
            ))}
            {mode.spins?.map((t) => (
              <button key={t.id} className="light-key wide"
                style={{ "--bulb": `conic-gradient(${mode.bulbs.map((b) => b.colour).join(", ")}, ${mode.bulbs[0]?.colour})` } as React.CSSProperties}
                disabled={!running || pendingOne.includes(t.id)} onClick={() => lightOneSoon(t.id)}>
                <span className="swatch" aria-hidden />{pendingOne.includes(t.id) ? "Lighting…" : t.label}
                <span className="muted small">rainbow spin</span>
              </button>
            ))}
          </div>
          <button disabled={!running} onClick={() => lightAllNow(code, mode)}>Light them all now</button>
        </>
      ) : (
        <>
          <p className="muted small">
            Only you know: the light goes on {DELAY_MS / 1000} s after anyone <strong>{trigger.secret}</strong>.
          </p>
          <p className="muted small">The secret:</p>
          <div className="choices two" role="group" aria-label="The secret">
            {TRIGGERS.map((t) => (
              <button key={t.id} className={t.id === trigger.id ? "active" : ""} aria-pressed={t.id === trigger.id}
                onClick={() => { if (t.id !== trigger.id) void setTrigger(code, t.id); }}>{t.label}</button>
            ))}
          </div>
          <div className="steps two">
            <button disabled={!running || pending > 0} onClick={lightSoon}>{pending > 0 ? "Lighting…" : `Light in ${DELAY_MS / 1000} s`}</button>
            <button disabled={!running} onClick={() => void lightNow(code)}>Light it now</button>
          </div>
          <p className="muted small">"Light in {DELAY_MS / 1000} s" is for something the camera missed; "Light it now" is a test.</p>
        </>
      )}
      {needsArms && <p className="muted small">The camera needs to see people's arms and shoulders, not just faces.</p>}
      {running && (
        <button className="link" onClick={() => { if (confirm("Reset the light? The computer running it stops, and another one can take over.")) void releaseLight(code); }}>
          Reset the light computer
        </button>
      )}
    </section>
  );
}
