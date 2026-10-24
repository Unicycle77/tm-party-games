import { useEffect, useRef, useState } from "react";
import { Toggle } from "../Toggle";
import { addKeptGame, taskFor } from "../scoreboard/data";
import { ordinal, pointsForPlace, workOut } from "../scoreboard/measured";
import type { Session } from "../types";
import { PUBLIC_URL } from "../firebase";
import {
  DELAY_MS, cameraText, gotOrder, isArmed, lightAllNow, lightLater, lightNow, lightOf, lightOneLater, markGot, modeOf, moveGot, releaseLight, setArmed,
  setMode, setSetup, setTrigger, startOnStage, triggerOf, unmarkGot,
} from "./data";
import { ReadyLine, StageSetup } from "./StageSetup";
import { MODES, TRIGGERS } from "./triggers";

/**
 * The host phone's light controls: starting it on the big screen (then its setup checklist, see StageSetup),
 * on or off (off stops the camera too), what the camera sees, a manual light for someone the camera missed,
 * and the secret (or mode) behind "Change". A /light computer can be tested while it's off; the big screen's
 * lamp is tested in its checklist.
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

  const onStage = light.onStage === true;
  const site = PUBLIC_URL.replace(/^https?:\/\//, "");
  // Started on the big screen, with the phone's checklist open: just the checklist.
  if (running && onStage && light.setup) {
    return (
      <section className="remote light-remote">
        <h2>💡 The light</h2>
        <StageSetup code={code} session={session} />
      </section>
    );
  }

  return (
    <section className="remote light-remote">
      <h2>💡 The light</h2>
      {!running ? (
        onStage ? (
          <>
            <p>Starting on the big screen… Check that it's open.</p>
            <button className="link" onClick={() => void releaseLight(code)}>Cancel</button>
          </>
        ) : (
          // Not started: where it runs, then the one thing to do. The switch comes once there's something to switch.
          <>
            <p>Not started. It runs on the big screen's computer, out of sight: its webcam watches the room and the Hue lamp flashes. Nothing shows on the TV.</p>
            <button className="big" onClick={() => void startOnStage(code)}>Start the light</button>
            <p className="muted small">Webcam on another computer? Open <strong>{site}/light</strong> there instead.</p>
          </>
        )
      ) : (
        <>
          {/* On or off, and what the camera sees: what the host checks during the evening. Off means the camera is off too. */}
          <div className="toggles">
            <Toggle label="Light on" on={armed} onChange={(on) => void setArmed(code, on)} />
          </div>
          <p>{cameraText(session)}</p>
          {onStage && <ReadyLine session={session} onSetUp={() => void setSetup(code, true)} />}
        </>
      )}

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

      <GotIt code={code} session={session} />

      {/* Safe only while guests aren't watching: a test mid-game would throw off their guesses. */}
      {running && !onStage && !armed && <button onClick={() => mode ? lightAllNow(code, mode) : void lightNow(code)}>Test the light</button>}
    </section>
  );
}

/**
 * Who has worked out the secret, in the order the host tapped them: the place and the points, so the host
 * can say them out loud. Every contestant keeps a chip in the same spot (dimmed once they're on the list),
 * and a tap on a row or a dimmed chip opens it to move them or take them off. While the light is on the
 * task list the points are the scoreboard's (a DQ there shows here); until then a line offers to add it.
 */
export function GotIt({ code, session }: { code: string; session: Session }) {
  const [last, setLast] = useState<string>();
  const [open, setOpen] = useState<string>();
  const contestants = session.scoreboard?.contestants ?? {};
  const names = Object.entries(contestants).sort(([, a], [, b]) => a.name.localeCompare(b.name));
  if (names.length === 0) return null;
  const nameOf = (c: string) => contestants[c]?.name ?? "";
  // Someone taken off the scoreboard drops out of the order.
  const order = gotOrder(lightOf(session)).filter((c) => contestants[c]);
  const placeOf = (c: string) => order.indexOf(c) + 1;
  const id = taskFor(session.scoreboard, "light");
  const task = id ? session.scoreboard?.tasks?.[id] : undefined;
  const worked = task && workOut(task);
  const pointsOf = (c: string) => worked ? worked.points[c] ?? 0 : pointsForPlace(placeOf(c));
  const mark = (c: string) => { void markGot(code, session, c); setLast(c); setOpen(undefined); };
  const lastPlace = last ? placeOf(last) : 0;

  return (
    <div className="light-got">
      <div className="remote-head"><h3>Got it</h3><span className="muted small">{order.length} of {names.length}</span></div>
      {order.length > 0 && (
        <ol>
          {order.map((c, i) => (
            <li key={c} className={[open === c && "open", task?.dq?.[c] && "dq"].filter(Boolean).join(" ") || undefined}>
              <button className="light-got-row" aria-expanded={open === c} onClick={() => setOpen(open === c ? undefined : c)}>
                <span className="muted">{ordinal(i + 1)}</span><span className="light-got-name">{nameOf(c)}</span>
                <span className="light-got-pts">{task?.dq?.[c] ? "DQ" : `${pointsOf(c)} pts`}</span>
              </button>
              {open === c && (
                <div className="light-got-fix">
                  <p className="muted small">{nameOf(c)}'s place. Tap another to move {nameOf(c)}; the others shift.</p>
                  <div className="choices marks" role="group" aria-label={`${nameOf(c)}'s place`}>
                    {order.map((_, k) => (
                      <button key={k} aria-pressed={k === i} onClick={() => { if (k !== i) void moveGot(code, session, c, k + 1); }}>{ordinal(k + 1)}</button>
                    ))}
                  </div>
                  <button className="link" onClick={() => { void unmarkGot(code, session, c); setOpen(undefined); if (last === c) setLast(undefined); }}>
                    Take {nameOf(c)} off the list
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {lastPlace > 0 && (
        <p className="muted small">✓ {nameOf(last!)} got it {ordinal(lastPlace)} · {pointsOf(last!)} points{task ? " on the scoreboard" : ""}.</p>
      )}
      {!task && (
        <p className="muted small">
          Not on the task list yet, so these points aren't on the scoreboard.{" "}
          <button className="link" onClick={() => void addKeptGame(code, session, "light")}>Add it</button>
        </p>
      )}
      <p className="muted small">Tap whoever just got it:</p>
      <div className="choices">
        {names.map(([c, { name }]) => placeOf(c) > 0
          ? <button key={c} className="got" aria-label={`${name}, got it ${ordinal(placeOf(c))}. Change`} onClick={() => setOpen(c)}>✓ {name}</button>
          : <button key={c} onClick={() => mark(c)}>{name}</button>)}
      </div>
    </div>
  );
}
