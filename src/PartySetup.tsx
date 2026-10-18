import { useEffect, useRef, useState } from "react";
import { HostPinSetting } from "./HostPin";
import { uploadPortrait } from "./media";
import { renameParty, setUnits, useUid } from "./session";
import type { Session } from "./types";

/** This party's Taskmaster portrait: shown framed on the big screen between games. */
export function Portrait({ code, session }: { code: string; session: Session }) {
  const uid = useUid();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState(false);

  async function upload(file: File | undefined) {
    if (!file || !uid) return;
    setFailed(false);
    setProgress(0);
    try { await uploadPortrait(code, uid, file, setProgress); }
    catch { setFailed(true); }
    finally { setProgress(undefined); }
  }

  return (
    <div className="portrait-setting">
      {session.portrait ? <img src={session.portrait} alt="The Taskmaster's portrait" /> : <div className="ph">No portrait</div>}
      <div className="portrait-text">
        <span>Taskmaster portrait</span>
        <span className="muted small">Shown on the big screen between games.</span>
        {progress !== undefined ? <span className="small">Uploading… {Math.round(progress * 100)}%</span>
          : <button onClick={() => input.current?.click()}>{session.portrait ? "Change portrait" : "Upload portrait"}</button>}
        {failed && <span className="error small">That didn't upload. Try again.</span>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

/** The party's name, as typed when it was started (or none, for a party started on the big screen). */
export function PartyName({ code, session }: { code: string; session: Session }) {
  const [name, setName] = useState(session.name ?? "");
  // Someone else renaming it (another remote) shows up here, unless it's being edited.
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setName(session.name ?? ""); }, [session.name, editing]);
  const changed = name.trim() !== (session.name ?? "") && !!name.trim();
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    void renameParty(code, name);
    setEditing(false);
  };
  return (
    <form className="party-name" onSubmit={save}>
      <label>Party name
        <div className="row">
          <input value={name} maxLength={40} placeholder="Halloween party"
            onChange={(e) => { setName(e.target.value); setEditing(true); }} />
          <button type="submit" disabled={!changed}>Save</button>
        </div>
      </label>
    </form>
  );
}


/** Metric or imperial: how the 📏 converter explains a result ("39 dice = 62.4 cm" or "39 dice = 2 ft ½ in"). */
export function UnitsSetting({ code, session }: { code: string; session: Session }) {
  const units = session.units ?? "metric";
  return (
    <div className="units-setting">
      <span>📏 Conversions in</span>
      <div className="choices two">
        {(["metric", "imperial"] as const).map((u) => (
          <button key={u} className={units === u ? "active" : ""} aria-pressed={units === u} onClick={() => void setUnits(code, u)}>
            {u === "metric" ? "Metric" : "Imperial"}
          </button>
        ))}
      </div>
      <span className="muted small">{units === "metric" ? "Results are explained in cm, kg and liters." : "Results are explained in feet and inches, pounds and cups."}</span>
    </div>
  );
}

/**
 * The party in one line on Plan the party ("Halloween party · portrait set · pin set"), with Change opening its
 * name, portrait and host pin in place. These are set once, days ahead, so they live there and not in Party settings.
 */
export function PartySummary({ code, session }: { code: string; session: Session }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="party-summary">
      <div className="summary-line">
        <span>{session.name || "Unnamed party"}<span className="muted small"> · {session.portrait ? "portrait set" : "no portrait"} · {session.hostPin ? "pin set" : "no pin"} · {session.units ?? "metric"}</span></span>
        <button className="link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Change"}</button>
      </div>
      {open && (
        <div className="party-settings">
          <PartyName code={code} session={session} />
          <Portrait code={code} session={session} />
          <HostPinSetting code={code} />
          <UnitsSetting code={code} session={session} />
        </div>
      )}
    </section>
  );
}
