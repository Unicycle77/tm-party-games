import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { DownloadZip } from "./DownloadZip";
import { Curtain } from "./Curtain";
import { activeGame } from "./games";
import { preloadImages } from "./preload";
import { PUBLIC_URL, hostUrlFor, joinUrlFor } from "./firebase";
import { resetController, setDisplay, setGame, showContestant } from "./session";
import type { SubmissionStatus } from "./submission";
import type { Player, Session } from "./types";

/** What a screen shows for a session: the active game's stage, or the lobby. */
export function screenState(session: Session) {
  const game = activeGame(session);
  const display = session.display ?? { step: "list" as const };
  const videoPlaying = display.step === "video" && display.playing !== false;
  // A step without a player shows everyone; one with a player needs them to still be here and to have sent something.
  const onStage = !!game && display.step !== "list" && display.step !== "curtain"
    && (!display.uid || (!!session.players?.[display.uid] && game.status?.(session, display.uid) !== "waiting"));
  return { game, display, videoPlaying, onStage };
}

/**
 * The lobby or the stage, as the main screen shows them. `viewOnly` is for extra screens (`/screen`):
 * the same picture, but nothing to click and no host setup (QR, remote status, download).
 * `footer` goes in the lobby's hidden menu (e.g. End session), or at the bottom of a view-only lobby.
 */
export function Screen({ code, session, viewOnly = false, footer }: {
  code: string; session: Session; viewOnly?: boolean; footer?: React.ReactNode;
}) {
  const { game, display, onStage } = screenState(session);
  const players = Object.entries(session.players ?? {});

  // Warm the browser cache with every photo submitted to the active game so reveals appear instantly.
  const photoUrls = game?.photoUrls(session).join("\n") ?? "";
  useEffect(() => {
    preloadImages(photoUrls.split("\n"));
  }, [photoUrls]);

  if (game && onStage) return <game.Stage code={code} session={session} display={display} viewOnly={viewOnly} />;

  const site = PUBLIC_URL.replace(/^https?:\/\//, "");
  // Host setup: out of sight until the mouse goes near the top-left corner.
  const menu = !viewOnly && (
    <LobbyMenu>
      {session.controllerUid
        ? <p className="muted small">🎮 Host remote connected. <button className="link" onClick={() => void resetController(code)}>Reset</button></p>
        : (
          <>
            <figure className="host-qr">
              <QRCodeSVG value={hostUrlFor(code)} size={150} bgColor="#fff" marginSize={2} />
              <figcaption>Host scans here</figcaption>
            </figure>
            <p className="muted small">Or open <strong>{site}/host</strong> on your phone and enter the same code.</p>
          </>
        )}
      <p className="muted small">
        📺 To show this on another screen too, open <strong>{site}/screen</strong> there and enter the same code.
      </p>
      <p className="muted small">
        {session.lightUid
          ? "💡 The light is running."
          : <>💡 To run the light, open <a href={`${PUBLIC_URL}/light?code=${code}`} target="_blank" rel="noreferrer">{site}/light</a> on a computer with a webcam that can see everyone.</>}
      </p>
      {game && <button className="link" onClick={() => void setGame(code, null)}>← Between games</button>}
      {footer}
    </LobbyMenu>
  );

  // Between games (once the first has started): the party's Taskmaster portrait, framed, on the
  // curtain; or just the curtain if there's none. The code stays small in the corner for latecomers.
  if (!game && session.begun) return <Curtain code={code} session={session}>{menu}{viewOnly && footer}</Curtain>;

  // Welcome: guests join on the left and find their name on the right. No game list: the host picks on their phone.
  if (!game) {
    return (
      <main className="welcome">
        <section className="welcome-join">
          <h1>Taskmaster</h1>
          <figure className="join-qr">
            <QRCodeSVG value={joinUrlFor(code)} size={300} bgColor="#fff" marginSize={2} />
            <figcaption>Scan to join</figcaption>
          </figure>
          <p className="muted">or go to <strong>{site}/play</strong> and enter</p>
          <p className="code">{code}</p>
        </section>
        <section className="welcome-contestants">
          <h2>Contestants ({players.length})</h2>
          {players.length === 0 && <p className="muted">Waiting for the first contestant…</p>}
          <ul className="tiles">
            {players.map(([uid, p]) => <Tile key={uid} player={p} />)}
          </ul>
        </section>
        {menu}
        {viewOnly && footer}
      </main>
    );
  }

  // Between contestants, and for a game the host runs (like [BLANK] in a Box) until a round starts:
  // the curtain (with the portrait, if there is one), so the room looks at the host.
  if (!game.status || display.step === "curtain") return <Curtain code={code} session={session}>{menu}{viewOnly && footer}</Curtain>;

  // Collecting: the task card is the star; the contestants move to a column on the right.
  const status = game.status;
  const submitted = players.filter(([uid]) => status(session, uid) === "submitted").length;
  const allIn = players.length > 0 && submitted === players.length;
  return (
    <main className={game.task ? "collecting" : "collecting no-task"}>
      <section className="collecting-main">
        {game.task ? <TaskCard lines={game.task} allIn={allIn} /> : <h1 className="collecting-title">{game.heading(session)}</h1>}
      </section>
      <aside className="collecting-side">
        <h2>{submitted} of {players.length} submitted</h2>
        <ul className="tiles">
          {players.map(([uid, p]) => (
            <Tile key={uid} player={p} status={status(session, uid)}
              onPick={viewOnly ? undefined : () => void showContestant(code, game.id, { uid, step: game.firstStep })} />
          ))}
        </ul>
      </aside>
      <p className="corner-code">{site}/play · <strong>{code}</strong></p>
      {!viewOnly && session.showDownload && <div className="corner-download"><DownloadZip code={code} session={session} /></div>}
      {menu}
      {viewOnly && footer}
    </main>
  );
}

/** The task card: aged, torn paper in typewriter with the red TM seal. Once everyone is in, a big red stamp lands on it. */
function TaskCard({ lines, allIn }: { lines: readonly string[]; allIn: boolean }) {
  const [label, ...body] = lines;
  return (
    <div className="task-card">
      <p className="task-label">{label}</p>
      {body.map((line) => <p key={line}>{line}</p>)}
      <span className="wax-seal" aria-hidden="true">TM</span>
      {allIn && <span className="stamp all-in">✓ All submitted</span>}
    </div>
  );
}

/**
 * The main screen's hidden menu (like tm-scoreboard's): a paper "☰ Menu" button in the top-left corner that stays
 * invisible until the mouse comes near it, and opens a panel of setup hints. Escape or a click outside closes it.
 */
function LobbyMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!zone.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);
  return (
    <div ref={zone} className={open ? "lobby-menu open" : "lobby-menu"}>
      <button className="lobby-menu-button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰ Menu</button>
      {open && <div className="lobby-menu-panel">{children}</div>}
    </div>
  );
}

/**
 * A player in the lobby; on the game selection screen (no status) it's just their name.
 * Without `onPick` (a view-only screen) it can't be clicked but looks the same.
 */
function Tile({ player, status, onPick }: { player: Player; status?: SubmissionStatus; onPick?: () => void }) {
  return (
    <li>
      <button className={onPick ? "tile" : "tile static"} disabled={!!status && status !== "submitted"}
        tabIndex={onPick ? undefined : -1} onClick={onPick}>
        <span className="name">{player.name}</span>
        {status === "submitted" ? <span className="stamp">✓ Submitted</span>
          : status && <span className="status">… {status === "sending" ? "sending" : "waiting"}</span>}
      </button>
    </li>
  );
}
