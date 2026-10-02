import { useEffect, useRef, useState } from "react";
import { HostRemote } from "./HostRemote";
import { JukeboxRemote } from "./JukeboxRemote";
import { isArmed, lightOf, releaseLight } from "./light/data";
import { LightRemote } from "./light/LightRemote";
import { QrScannerModal } from "./QrScannerModal";
import { REMOTE_KEY, RecentList, loadRecent, saveRecent, withRecent, withoutRecent } from "./recent";
import { JoinError, claimController, extractCode, releaseController, setShowDownload, store, useSession, useUid } from "./session";
import { Toggle } from "./Toggle";
import type { Session } from "./types";

const KEY = "ba.remoteCode";
const VIEW_KEY = "ba.hostTab";
type View = "show" | "music" | "light";

/** The host's phone (`/host`): same 4-letter code as players, but drives the main screen. */
export function HostPage() {
  const uid = useUid();
  const [code, setCode] = useState(() => store.get(KEY));
  const session = useSession(code || undefined);
  // The show, with the music and the light one tap away in the header. This phone remembers which
  // is open, so a refresh mid-game lands where the host was.
  const [view, setViewState] = useState<View>(() => {
    const saved = store.get(VIEW_KEY);
    return saved === "music" || saved === "light" ? saved : "show";
  });
  const setView = (v: View) => { setViewState(v); store.set(VIEW_KEY, v); };

  const disconnect = () => { store.set(KEY, ""); setCode(""); };

  // Connected: keep this session at the top of the phone's recent list.
  const connected = !!code && !!uid && session?.controllerUid === uid;
  useEffect(() => {
    if (connected) saveRecent(REMOTE_KEY, withRecent(loadRecent(REMOTE_KEY), code));
  }, [connected, code]);

  // Session gone, or the main screen reset our remote → back to code entry.
  useEffect(() => {
    if (!uid || session === undefined) return;
    if (session === null || session.controllerUid !== uid) disconnect();
  }, [uid, session]);

  if (!code) return <Connect onConnected={(c) => { store.set(KEY, c); setCode(c); }} />;
  if (!session || session.controllerUid !== uid) return <main className="center"><p>Connecting…</p></main>;

  const playing = session.jukebox?.state?.playing === true;
  const lightOn = isArmed(lightOf(session));
  const icon = (v: View, label: string, glyph: string, lit: boolean) => (
    <button className={`head-icon${lit ? " lit" : ""}${view === v ? " open" : ""}`} aria-label={label} aria-pressed={view === v}
      onClick={() => setView(view === v ? "show" : v)}>{glyph}</button>
  );

  return (
    <main className="phone host">
      <header className="host-head">
        <span><strong>🎮 Host</strong><span className="muted"> · {code}</span></span>
        {icon("music", playing ? "Music (playing)" : "Music", playing ? "🎵▶" : "🎵", playing)}
        {icon("light", lightOn ? "The light (on)" : "The light (off)", "💡", lightOn)}
      </header>
      {view === "show" ? (
        <>
          <HostRemote code={code} session={session} />
          <PartySettings code={code} session={session} onDisconnect={() => { void releaseController(code); disconnect(); }} />
        </>
      ) : (
        <>
          <button className="link back" onClick={() => setView("show")}>← Back to the show</button>
          {view === "music" ? <JukeboxRemote code={code} session={session} /> : <LightRemote code={code} session={session} />}
        </>
      )}
    </main>
  );
}

/** Set-once things, behind a quiet link at the bottom of the show. */
function PartySettings({ code, session, onDisconnect }: { code: string; session: Session; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="link" onClick={() => setOpen(true)}>Party settings</button>;
  return (
    <section className="party-settings">
      <div className="remote-head">
        <h2>Party settings</h2>
        <button className="link" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="toggles">
        <Toggle label="Download button on the big screen" on={!!session.showDownload} onChange={(on) => void setShowDownload(code, on)} />
      </div>
      {session.lightUid && (
        <button className="link" onClick={() => { if (confirm("Reset the light? The computer running it stops, and another one can take over.")) void releaseLight(code); }}>
          Reset the light computer
        </button>
      )}
      <button className="link" onClick={onDisconnect}>Disconnect this phone</button>
    </section>
  );
}

function Connect({ onConnected }: { onConnected: (code: string) => void }) {
  const [code, setCode] = useState(() => (new URLSearchParams(location.search).get("code") ?? "").toUpperCase().slice(0, 4));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const autoTried = useRef(false);
  // Sessions this phone has been the host remote for.
  const [recent, setRecent] = useState(() => loadRecent(REMOTE_KEY));

  async function connect(c: string) {
    setBusy(true);
    setError(undefined);
    try { onConnected(await claimController(c)); }
    catch (err) {
      // A session that no longer exists drops off the recent list.
      if (err instanceof JoinError && err.message.startsWith("No session found")) {
        setRecent(saveRecent(REMOTE_KEY, withoutRecent(recent, c.trim().toUpperCase())));
      }
      setError(err instanceof JoinError ? err.message : "Something went wrong. Try again.");
    }
    finally { setBusy(false); }
  }

  // Opened from the host QR on the main screen: connect straight away, so the QR disappears there.
  // The code is then dropped from the URL, so a later Disconnect doesn't reconnect on refresh.
  useEffect(() => {
    if (code.length !== 4 || autoTried.current) return;
    autoTried.current = true;
    history.replaceState(null, "", location.pathname);
    void connect(code);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void connect(code);
  }

  return (
    <main className="join">
      <h1>Host remote</h1>
      <form onSubmit={submit}>
        <label>Game code (from the main screen)
          <div className="row">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4} autoCapitalize="characters" autoComplete="off" placeholder="ABCD" required />
            <button type="button" aria-label="Scan QR code" onClick={() => setScanning(true)}>📷</button>
          </div>
        </label>
        <button type="submit" disabled={busy || code.length !== 4}>{busy ? "Connecting…" : "Connect"}</button>
        {error && <p className="error">{error}</p>}
      </form>
      <RecentList recent={recent} busy={busy} onPick={(c) => void connect(c)} />
      {scanning && <QrScannerModal onClose={() => setScanning(false)} onScan={(t) => {
        setScanning(false);
        const c = extractCode(t);
        if (c) { setCode(c); setError(undefined); }
      }} />}
    </main>
  );
}
