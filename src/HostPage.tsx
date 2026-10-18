import { useEffect, useRef, useState } from "react";
import { JoinQr, OnScreen } from "./HostRemote";
import { JukeboxRemote } from "./JukeboxRemote";
import { ConverterRemote } from "./conversions/ConverterRemote";
import { isArmed, lightOf, releaseLight } from "./light/data";
import { secretTasksPlanned, useDealer, useRecordLeftovers, useSecretTasks } from "./games/secretTasks/data";
import { TaskPile } from "./games/secretTasks/TaskPile";
import { LightRemote } from "./light/LightRemote";
import { QrScannerModal } from "./QrScannerModal";
import { PlanParty } from "./scoreboard/Planning";
import { TaskEditPage } from "./scoreboard/TaskEditPage";
import { RunOfShow } from "./scoreboard/RunOfShow";
import { AdHocPage, TaskPage, TiebreakerPage } from "./scoreboard/TaskPage";
import { activeTaskId } from "./scoreboard/tasks";
import { REMOTE_KEY, RecentList, loadRecent, saveRecent, withRecent, withoutRecent } from "./recent";
import { PinStep } from "./HostPin";
import { JoinError, PinNeededError, allowMove, claimController, claimWithPin, createParty, declineMove, extractCode, releaseController, setShowDownload, store, useSession, useUid } from "./session";
import { Toggle } from "./Toggle";
import type { Session } from "./types";

const KEY = "ba.remoteCode";
const VIEW_KEY = "ba.hostTab";
const BACK_KEY = "ba.hostBack";
/** Run of show (home), a task's page, Plan the party, a task's ✎ page, and the side jobs in the header. */
type View = "show" | "task" | "plan" | "edit" | "music" | "light" | "tasks" | "convert";
/** Where the host is: a view, and for a task's page which task (a task's id, "adhoc" or "tiebreaker"). */
interface Place { view: View; task?: string }
const SIDE: View[] = ["music", "light", "tasks", "convert"];
const VIEWS: View[] = ["show", "task", "plan", "edit", ...SIDE];
const HOME: Place = { view: "show" };

/** A place this phone remembered; older phones kept just a view's name ("scoreboard" was home, "show" the game). */
function loadPlace(key: string): Place | undefined {
  const saved = store.get(key);
  try {
    const p = JSON.parse(saved) as Place;
    if (p && VIEWS.includes(p.view)) return p;
  } catch { /* an older phone's view name */ }
  if (saved === "show") return { view: "task", task: "game" };
  if (SIDE.includes(saved as View)) return { view: saved as View };
  return undefined;
}

/** The host's phone (`/host`): same 4-letter code as players, but drives the main screen. */
export function HostPage() {
  const uid = useUid();
  const [code, setCode] = useState(() => store.get(KEY));
  const session = useSession(code || undefined);
  // This phone remembers where the host was, so a refresh mid-game lands there; and, on a side page, where "Back" goes.
  const [place, setPlaceState] = useState<Place>(() => loadPlace(VIEW_KEY) ?? HOME);
  const [back, setBackState] = useState<Place>(() => loadPlace(BACK_KEY) ?? HOME);
  const go = (p: Place) => {
    // Opening a side job from a page remembers the page; moving between side jobs keeps it.
    if (SIDE.includes(p.view) && !SIDE.includes(place.view)) { setBackState(place); store.set(BACK_KEY, JSON.stringify(place)); }
    setPlaceState(p);
    store.set(VIEW_KEY, JSON.stringify(p));
    window.scrollTo(0, 0);
  };

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
      // Every party opens on the run of show.
      if (created) go(HOME);
    }} />;
  }
  if (!session || session.controllerUid !== uid) return <main className="center"><p>Connecting…</p></main>;

  const playing = session.jukebox?.state?.playing === true;
  const lightOn = isArmed(lightOf(session));
  // An older phone's "the game": the game in progress's task page.
  const task = place.task === "game" ? activeTaskId(session) ?? "adhoc" : place.task;
  const icon = (v: View, label: string, glyph: string, lit: boolean, alert = false) => (
    <button className={`head-icon${lit ? " lit" : ""}${alert ? " alert" : ""}${place.view === v ? " open" : ""}`} aria-label={label} aria-pressed={place.view === v}
      onClick={() => go(place.view === v && v !== "show" ? back : { view: v })}>{glyph}</button>
  );
  const settings = <PartySettings code={code} session={session} onDisconnect={() => { void releaseController(code); disconnect(); }} />;
  const open = (id: string) => go(id === "tiebreaker" ? { view: "task", task: "tiebreaker" } : { view: "task", task: id });

  return (
    <main className="phone host">
      <header className="host-head">
        {icon("music", playing ? "Music (playing)" : "Music", playing ? "🎵▶" : "🎵", playing)}
        <TasksIcon code={code} session={session} icon={icon} />
        {icon("light", lightOn ? "The light (on)" : "The light (off)", "💡", lightOn)}
        {icon("convert", session.conversion ? "Useless conversions (on the big screen)" : "Useless conversions", "📏", !!session.conversion)}
      </header>
      <Dealer code={code} session={session} />
      <MoveRequests code={code} session={session} />
      {place.view === "task" && task === "adhoc" ? <AdHocPage code={code} session={session} onBack={() => go(HOME)} />
        : place.view === "task" && task === "tiebreaker" ? <TiebreakerPage code={code} session={session} onBack={() => go(HOME)} />
        : place.view === "task" && task ? <TaskPage code={code} session={session} id={task} onBack={() => go(HOME)} onLight={() => go({ view: "light" })} />
        : place.view === "plan" ? <PlanParty code={code} session={session} onBack={() => go(HOME)} onEdit={(id) => go({ view: "edit", task: id })} />
        : place.view === "edit" && place.task ? <TaskEditPage code={code} session={session} id={place.task} onBack={() => go({ view: "plan" })} />
        : SIDE.includes(place.view) ? (
          <>
            <button className="link back" onClick={() => go(back)}>← Back</button>
            <OnScreen code={code} session={session} />
            {place.view === "music" ? <JukeboxRemote code={code} session={session} />
              : place.view === "tasks" ? <TaskPile code={code} session={session} />
              : place.view === "convert" ? <ConverterRemote code={code} session={session} />
              : <LightRemote code={code} session={session} />}
          </>
        ) : (
          <RunOfShow code={code} session={session} onOpen={open} onTiebreak={() => open("tiebreaker")}
            footer={<>
              <button className="link" onClick={() => go({ view: "plan" })}>Plan the party</button>
              <JoinQr code={code} session={session} />
              {settings}
            </>} />
        )}
    </main>
  );
}

/** ✉ in the header, with a burgundy dot while a guest has no secret task yet (whether they've read theirs doesn't count). */
function TasksIcon({ code, session, icon }: { code: string; session: Session; icon: (v: View, label: string, glyph: string, lit: boolean, alert?: boolean) => React.ReactNode }) {
  const tasks = useSecretTasks(code);
  // Guests only get envelopes once Secret Tasks is on the run of show, so until then nobody is waiting on one.
  const alert = secretTasksPlanned(session) && !!tasks && Object.keys(session.players ?? {}).some((uid) => !tasks.assigned?.[uid]);
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

function Connect({ onConnected }: { onConnected: (code: string, created?: boolean) => void }) {
  const [code, setCode] = useState(() => (new URLSearchParams(location.search).get("code") ?? "").toUpperCase().slice(0, 4));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);
  /** The new party's name, while "Start a new party" is open. */
  const [naming, setNaming] = useState<string>();
  /** A pinned party this phone hasn't entered the pin for yet. */
  const [pinFor, setPinFor] = useState<PinNeededError>();
  const autoTried = useRef(false);
  // Sessions this phone has been the host remote for.
  const [recent, setRecent] = useState(() => loadRecent(REMOTE_KEY));

  async function connect(c: string) {
    setBusy(true);
    setError(undefined);
    try { onConnected(await claimController(c)); }
    catch (err) {
      if (err instanceof PinNeededError) { setPinFor(err); return; }
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

  async function enterPin(pin: string) {
    if (!pinFor) return;
    setBusy(true);
    setError(undefined);
    try { onConnected(await claimWithPin(pinFor.code, pin)); }
    catch (err) { setError(err instanceof JoinError ? err.message : "Something went wrong. Try again."); }
    finally { setBusy(false); }
  }

  if (pinFor) {
    return <PinStep title="Host remote" opening="Connecting to" name={pinFor.partyName} code={pinFor.code}
      hint="You'll only type it once on this phone." action="Connect" busy={busy} error={error}
      onSubmit={(pin) => void enterPin(pin)} onExit={() => { setPinFor(undefined); setError(undefined); }} />;
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
