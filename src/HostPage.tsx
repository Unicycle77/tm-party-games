import { useEffect, useRef, useState } from "react";
import { HostRemote } from "./HostRemote";
import { uploadPortrait } from "./media";
import { JukeboxRemote } from "./JukeboxRemote";
import { isArmed, lightOf, releaseLight } from "./light/data";
import { needsOf, useDealer, useRecordLeftovers, useSecretTasks } from "./games/secretTasks/data";
import { TaskPile } from "./games/secretTasks/TaskPile";
import { LightRemote } from "./light/LightRemote";
import { QrScannerModal } from "./QrScannerModal";
import { ScoreboardRemote } from "./scoreboard/ScoreboardRemote";
import { REMOTE_KEY, RecentList, loadRecent, saveRecent, withRecent, withoutRecent } from "./recent";
import { JoinError, allowMove, claimController, createParty, declineMove, extractCode, releaseController, renameParty, setShowDownload, store, useSession, useUid } from "./session";
import { Toggle } from "./Toggle";
import type { Session } from "./types";

const KEY = "ba.remoteCode";
const VIEW_KEY = "ba.hostTab";
type View = "show" | "scoreboard" | "music" | "light" | "tasks";

/** The host's phone (`/host`): same 4-letter code as players, but drives the main screen. */
export function HostPage() {
  const uid = useUid();
  const [code, setCode] = useState(() => store.get(KEY));
  const session = useSession(code || undefined);
  // The show, with the music and the light one tap away in the header. This phone remembers which
  // is open, so a refresh mid-game lands where the host was.
  const [view, setViewState] = useState<View>(() => {
    const saved = store.get(VIEW_KEY);
    return saved === "scoreboard" || saved === "music" || saved === "light" || saved === "tasks" ? saved : "show";
  });
  const setView = (v: View) => { setViewState(v); store.set(VIEW_KEY, v); };

  const disconnect = () => { store.set(KEY, ""); setCode(""); };

  // Connected: keep this session at the top of the phone's recent list.
  const connected = !!code && !!uid && session?.controllerUid === uid;
  useEffect(() => {
    if (connected) saveRecent(REMOTE_KEY, withRecent(loadRecent(REMOTE_KEY), code, session?.name));
  }, [connected, code, session?.name]);

  // Session gone, or the main screen reset our remote → back to code entry.
  useEffect(() => {
    if (!uid || session === undefined) return;
    if (session === null || session.controllerUid !== uid) disconnect();
  }, [uid, session]);

  if (!code) {
    return <Connect onConnected={(c, created) => {
      store.set(KEY, c);
      setCode(c);
      // A party made ahead of time opens on the scoreboard: setting it up is why it was made now.
      if (created) setView("scoreboard");
    }} />;
  }
  if (!session || session.controllerUid !== uid) return <main className="center"><p>Connecting…</p></main>;

  const playing = session.jukebox?.state?.playing === true;
  const lightOn = isArmed(lightOf(session));
  const scoresUp = session.display?.step === "scoreboard";
  const icon = (v: View, label: string, glyph: string, lit: boolean, alert = false) => (
    <button className={`head-icon${lit ? " lit" : ""}${alert ? " alert" : ""}${view === v ? " open" : ""}`} aria-label={label} aria-pressed={view === v}
      onClick={() => setView(view === v ? "show" : v)}>{glyph}</button>
  );

  return (
    <main className="phone host">
      <header className="host-head">
        <span><strong>🎮 Host</strong><span className="muted"> · {session.name ? `${session.name} · ` : ""}{code}</span></span>
        {icon("scoreboard", scoresUp ? "Scoreboard (on the big screen)" : "Scoreboard", "🏆", scoresUp)}
        {icon("music", playing ? "Music (playing)" : "Music", playing ? "🎵▶" : "🎵", playing)}
        <TasksIcon code={code} session={session} icon={icon} />
        {icon("light", lightOn ? "The light (on)" : "The light (off)", "💡", lightOn)}
      </header>
      <Dealer code={code} session={session} />
      <MoveRequests code={code} session={session} />
      {view === "show" ? (
        <>
          <HostRemote code={code} session={session} />
          <PartySettings code={code} session={session} onDisconnect={() => { void releaseController(code); disconnect(); }} />
        </>
      ) : (
        <>
          <button className="link back" onClick={() => setView("show")}>← Back to the show</button>
          {view === "scoreboard" ? <ScoreboardRemote code={code} session={session} onStartGame={() => setView("show")} />
            : view === "music" ? <JukeboxRemote code={code} session={session} /> : view === "tasks" ? <TaskPile code={code} session={session} /> : <LightRemote code={code} session={session} />}
        </>
      )}
    </main>
  );
}

/** ✉ in the header, with a burgundy dot while a guest hasn't looked at their task or is waiting for one. */
function TasksIcon({ code, session, icon }: { code: string; session: Session; icon: (v: View, label: string, glyph: string, lit: boolean, alert?: boolean) => React.ReactNode }) {
  const needs = needsOf(session, useSecretTasks(code));
  const alert = needs.unseen.length + needs.waiting.length > 0;
  return <>{icon("tasks", alert ? "Secret tasks (needs you)" : "Secret tasks", "✉", false, alert)}</>;
}

/**
 * Deals Secret Tasks picks from here too, so a player's pick never waits on the main screen being open.
 * (Both do the same thing from the same picks, so it doesn't matter which gets there first.)
 */
function Dealer({ code, session }: { code: string; session: Session }) {
  useDealer(code, session, true);
  // And keeps tonight's unpicked envelopes on record, so they roll forward to the next party.
  useRecordLeftovers(code, useUid(), useSecretTasks(code));
  return null;
}

/**
 * Guests asking to move to a new phone, at the top of every view. It blocks nothing and makes no
 * sound: the guest will usually be standing next to the host asking anyway.
 */
function MoveRequests({ code, session }: { code: string; session: Session }) {
  const asks = Object.entries(session.moves ?? {}).filter(([, m]) => m.status === "asked" && session.players?.[m.from]);
  return (
    <>
      {asks.map(([to, m]) => {
        const name = session.players![m.from]!.name;
        return (
          <section key={to} className="move-request">
            <p><strong>{name}</strong> wants to move to a new phone. Allow it if {name} asked you. Their entries move with them.</p>
            <div className="row">
              <button onClick={() => void allowMove(code, session, to)}>Allow</button>
              <button onClick={() => void declineMove(code, to)}>Decline</button>
            </div>
          </section>
        );
      })}
    </>
  );
}

/** This party's Taskmaster portrait: shown framed on the big screen between games. */
function Portrait({ code, session }: { code: string; session: Session }) {
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
function PartyName({ code, session }: { code: string; session: Session }) {
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
      <PartyName code={code} session={session} />
      <Portrait code={code} session={session} />
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

function Connect({ onConnected }: { onConnected: (code: string, created?: boolean) => void }) {
  const [code, setCode] = useState(() => (new URLSearchParams(location.search).get("code") ?? "").toUpperCase().slice(0, 4));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);
  /** The new party's name, while "Start a new party" is open. */
  const [naming, setNaming] = useState<string>();
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

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!naming?.trim()) return;
    setBusy(true);
    setError(undefined);
    try { onConnected(await createParty(naming), true); }
    catch { setError("Couldn't start the party. Try again."); }
    finally { setBusy(false); }
  }

  // Days ahead: name the party, and it's made right here, with no big screen yet.
  if (naming !== undefined) {
    return (
      <main className="join">
        <h1>Host remote</h1>
        <form onSubmit={(e) => void start(e)}>
          <label>Name this party
            <input value={naming} maxLength={40} autoFocus onChange={(e) => setNaming(e.target.value)} placeholder="Halloween party" />
          </label>
          <button type="submit" className="big" disabled={busy || !naming.trim()}>{busy ? "Starting…" : "Start the party"}</button>
          {error && <p className="error">{error}</p>}
        </form>
        <button className="link" onClick={() => { setNaming(undefined); setError(undefined); }}>Cancel</button>
      </main>
    );
  }

  return (
    <main className="join">
      <h1>Host remote</h1>
      {/* Start and Connect weigh the same (days ahead you start one, on the night you connect), so both are paper. */}
      <button onClick={() => { setNaming(""); setError(undefined); }}>Start a new party</button>
      <form onSubmit={submit}>
        <label>Or connect to one: the party code
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
