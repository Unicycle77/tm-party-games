import { useEffect, useRef, useState } from "react";
import { Toggle } from "../Toggle";
import type { Session } from "../types";
import {
  DELAY_MS, cameraText, isArmed, lightAllNow, lightLater, lightNow, lightOf, lightOneLater, modeOf, setArmed, setMode, setTrigger, triggerOf,
} from "./data";
import { MODES, TRIGGERS } from "./triggers";

/**
 * The host phone's light controls: on or off (off stops the camera too), what the camera sees, a manual
 * light for someone the camera missed, and the secret (or mode) behind "Change". Tests only while it's off.
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
  // The mode and the secret are set before switching on, so they sit behind "Change".
  const [changing, setChanging] = useState(false);

  return (
    <section className="remote light-remote">
      <h2>💡 The light</h2>
      {/* On or off, and what the camera sees: what the host checks during the evening. Off means the camera is off too. */}
      <div className="toggles">
        <Toggle label="Light on" on={armed} disabled={!running} onChange={(on) => void setArmed(code, on)} />
      </div>
      <p>{cameraText(session)}</p>

      {armed && (mode ? (
        <>
          <p className="muted small">Tap a colour to light it in {DELAY_MS / 1000} s, for someone the camera missed.</p>
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
        </>
      ) : (
        <button className="big" disabled={!running || pending > 0} onClick={lightSoon}>
          {pending > 0 ? "Lighting…" : `Light it in ${DELAY_MS / 1000} s`}
        </button>
      ))}

      <p className="light-secret">
        {mode ? <>Mode: <strong>{mode.label}</strong></> : <>Secret: <strong>{trigger.label.toLowerCase()}</strong></>}
        {" · "}<button className="link" onClick={() => setChanging((c) => !c)}>{changing ? "Done" : "Change"}</button>
      </p>
      {changing && (
        <>
          <div className="choices" role="group" aria-label="Mode">
            <button className={mode ? "" : "active"} aria-pressed={!mode} onClick={() => { if (mode) void setMode(code, null); }}>One secret</button>
            {MODES.map((m) => (
              <button key={m.id} className={m.id === mode?.id ? "active" : ""} aria-pressed={m.id === mode?.id}
                onClick={() => { if (m.id !== mode?.id) void setMode(code, m.id); }}>{m.label}</button>
            ))}
          </div>
          {mode ? (
            <p className="muted small">Each bulb goes on {DELAY_MS / 1000} s after anyone does its action. The players see the colours, not the names.</p>
          ) : (
            <>
              <p className="muted small">The light goes on {DELAY_MS / 1000} s after anyone <strong>{trigger.secret}</strong>.</p>
              <div className="choices two" role="group" aria-label="The secret">
                {TRIGGERS.map((t) => (
                  <button key={t.id} className={t.id === trigger.id ? "active" : ""} aria-pressed={t.id === trigger.id}
                    onClick={() => { if (t.id !== trigger.id) void setTrigger(code, t.id); }}>{t.label}</button>
                ))}
              </div>
            </>
          )}
          {needsArms && <p className="muted small">The camera needs to see people's arms and shoulders, not just faces.</p>}
        </>
      )}

      {/* Safe only while guests aren't watching: a test mid-game would throw off their guesses. */}
      {!armed && <button disabled={!running} onClick={() => mode ? lightAllNow(code, mode) : void lightNow(code)}>Test the light</button>}
    </section>
  );
}
