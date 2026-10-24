import { useEffect, useState } from "react";
import { hostUrlFor } from "./firebase";
import { removeHostPin, setHostPin, watchPin } from "./session";

const VALID = /^[0-9]{4,6}$/;

/**
 * A pin field with an 👁 inside it that shows the digits. Hidden unless `shownAtFirst` (choosing a new pin,
 * where you want to check what you typed): guests may be looking.
 */
export function PinField({ value, onChange, autoFocus, placeholder, centred, shownAtFirst = false }: {
  value: string; onChange: (pin: string) => void; autoFocus?: boolean; placeholder?: string; centred?: boolean; shownAtFirst?: boolean;
}) {
  const [shown, setShown] = useState(shownAtFirst);
  return (
    <span className={centred ? "pin-field centred" : "pin-field"}>
      <input type={shown ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={6} value={value}
        autoFocus={autoFocus} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))} />
      <button type="button" className="eye" aria-label={shown ? "Hide the pin" : "Show the pin"} aria-pressed={shown}
        onClick={() => setShown((s) => !s)}>👁</button>
    </span>
  );
}

/**
 * A pinned party opened on a phone or computer that hasn't entered the pin yet: the party's name and code on
 * a paper label, the pin, and one gold button. `children` go under the form (the big screen's "Show it here too").
 */
export function PinStep({ stage, title, opening, name, code, hint, action, busy, error, onSubmit, onExit, children }: {
  stage?: boolean; title: string; opening: string; name: string | null; code: string; hint: string; action: string; busy: boolean;
  error?: string; onSubmit: (pin: string) => void; onExit: () => void; children?: React.ReactNode;
}) {
  const [pin, setPin] = useState("");
  // A wrong pin clears the field, so the next try starts fresh.
  useEffect(() => { if (error) setPin(""); }, [error]);
  return (
    <main className={stage ? "center pin-step" : "join pin-step"}>
      <h1>{title}</h1>
      <p className="joining">{opening} {name ? <><strong className="party-name">{name}</strong><br /></> : "party "}<strong>{code}</strong></p>
      <form onSubmit={(e) => { e.preventDefault(); if (VALID.test(pin)) onSubmit(pin); }}>
        <label>This party's host pin
          <PinField value={pin} onChange={setPin} autoFocus centred />
        </label>
        <p className="muted small join-hint">{hint}</p>
        <button type="submit" className="big" disabled={busy || !VALID.test(pin)}>{busy ? "Checking…" : action}</button>
        {error && <p className="error">{error}</p>}
      </form>
      {children}
      <button className="link" onClick={onExit}>{children ? "Cancel" : "Wrong party? Enter a different code"}</button>
    </main>
  );
}

/**
 * Host: hands this party's host link to the share sheet (Messages, Notes, Mail), so the host can open the
 * remote on another of their phones days ahead, with no big screen to scan. The link carries only the code:
 * the pin still has to be typed. Where there's no share sheet, the link is copied instead.
 */
export async function sendHostLink(code: string, name: string | null): Promise<"shared" | "copied"> {
  const url = hostUrlFor(code);
  const title = `${name || "Party"} · ${code}`;
  if (navigator.share) {
    try { await navigator.share({ title, text: `${title}, host remote:`, url }); }
    catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) throw e; }
    return "shared";
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

/** Party settings: the host pin, read live (only a phone that knows it can). */
export function HostPinSetting({ code, name }: { code: string; name: string | null }) {
  const [saved, setSaved] = useState<string | null>();
  const [note, setNote] = useState<string>();
  useEffect(() => watchPin(code, setSaved), [code]);
  if (saved === undefined) return null;
  const send = () => {
    setNote(undefined);
    sendHostLink(code, name).then(
      (how) => how === "copied" && setNote("Link copied. Paste it to yourself."),
      () => setNote("Couldn't share the link. Try again."));
  };
  return <HostPinRow saved={saved} onSave={(pin) => void setHostPin(code, pin)} onRemove={() => void removeHostPin(code)}
    onSendLink={send} linkNote={note} />;
}

/**
 * The pin as a field with a paper Save, like the party's name: empty while there's none, dots once there is.
 * Once there's a pin, "Send yourself the host link" sits under it: setting the pin is when other phones are on
 * the host's mind.
 */
export function HostPinRow({ saved, onSave, onRemove, onSendLink, linkNote }: {
  saved: string | null; onSave: (pin: string) => void; onRemove: () => void; onSendLink?: () => void; linkNote?: string;
}) {
  const [pin, setPin] = useState(saved ?? "");
  // A pin changed or removed elsewhere (the big screen's menu) shows up here, unless it's being typed.
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setPin(saved ?? ""); }, [saved, editing]);
  const changed = VALID.test(pin) && pin !== saved;
  return (
    <form className="party-name host-pin" onSubmit={(e) => { e.preventDefault(); if (!changed) return; onSave(pin); setEditing(false); }}>
      <label>Host pin
        <div className="row">
          {/* Remounted when a pin is saved or removed, so a new pin starts in digits and a saved one in dots. */}
          <PinField key={saved ? "set" : "none"} shownAtFirst={!saved} value={pin} placeholder="None"
            onChange={(p) => { setPin(p); setEditing(true); }} />
          <button type="submit" disabled={!changed}>Save</button>
        </div>
      </label>
      {saved && <button type="button" className="link" onClick={() => { onRemove(); setEditing(false); }}>Remove the pin</button>}
      <p className="muted small">
        {saved ? "Type a new one to change it. Other phones will need the new pin."
          : "4 to 6 digits. Any other phone needs it to open the host remote. This phone won't."}
      </p>
      {saved && onSendLink && <button type="button" className="link" onClick={onSendLink}>📤 Send yourself the host link</button>}
      {linkNote && <p className="muted small">{linkNote}</p>}
    </form>
  );
}
