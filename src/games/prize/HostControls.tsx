import { useRef, useState, type ReactNode } from "react";
import { useKeepAwake } from "../../keepAwake";
import { setDisplay, useUid } from "../../session";
import type { Display, Session } from "../../types";
import { addPrizePhotos, presentedOf, presentPrize, prizePhotos, removePrizePhoto, showPrizePhoto, starPrizePhoto } from "./data";

/** Unused: the whole task runs from HostLobby, since contestants aren't players. */
export function HostPlayer(_: { code: string; session: Session; display: Display; uid: string }) {
  return null;
}

/** The host remote while the prize task is on: everyone on the scoreboard, in its order. */
export function HostLobby({ code, session, display, head }: { code: string; session: Session; display: Display; head?: ReactNode }) {
  const uid = useUid();
  const photos = prizePhotos(session);
  const entries = Object.entries(session.scoreboard?.contestants ?? {}).sort(([, a], [, b]) => a.order - b.order)
    .map(([id, c]) => ({ id, name: c.name, photos: photos[id] ?? [] }));
  const up = display.step === "photo" && display.contestant ? { id: display.contestant, index: display.index ?? 0 } : undefined;
  // Who's being talked about: picked here, or whoever's prize is on the big screen (e.g. after a reload).
  const [picked, setPicked] = useState<string>();
  const presenting = picked ?? up?.id;
  // Photos this remote is adding, as fractions sent, for the prize being presented.
  const [sending, setSending] = useState<{ id: string; sent: number[] }>();
  const input = useRef<HTMLInputElement>(null);
  useKeepAwake(!!sending);

  function pick(id: string) {
    setPicked(id);
    // Presenting locks the guest's phone.
    if (!presentedOf(session)[id]) void presentPrize(code, id);
  }

  async function add(id: string, files: File[]) {
    if (!uid || !files.length) return;
    const sent = files.map(() => 0);
    setSending({ id, sent: [...sent] });
    try {
      await addPrizePhotos(code, uid, id, files, (n, f) => { sent[n] = f; setSending({ id, sent: [...sent] }); });
    } catch {
      alert("Some photos didn't finish sending. Check your Wi-Fi and try again.");
    } finally {
      setSending(undefined);
    }
  }

  const url = (id: string, i: number) => photos[id]?.[i];
  return (
    <>
      <PrizePresenting head={head} entries={entries} presenting={presenting} presented={presentedOf(session)} up={up}
        sending={sending && sending.id === presenting ? sending.sent.filter((f) => f < 1) : []}
        onPick={pick}
        onShow={(id, i) => void showPrizePhoto(code, id, i)}
        onAdd={() => input.current?.click()}
        onRemove={(id, i) => {
          const u = url(id, i);
          if (!u) return;
          // The photo on the big screen (never the one removed) stays up as the ones after it move along.
          void removePrizePhoto(code, id, u).then(() => {
            if (up?.id === id && up.index > i) void showPrizePhoto(code, id, up.index - 1);
          });
        }}
        onStar={(id, i) => {
          const u = url(id, i);
          if (!u) return;
          // The photo on the big screen stays up as it moves to the front.
          void starPrizePhoto(code, id, u).then(() => {
            if (up?.id === id) void showPrizePhoto(code, id, up.index === i ? 0 : up.index < i ? up.index + 1 : up.index);
          });
        }}
        onLower={() => void setDisplay(code, { step: "curtain" })} />
      <input ref={input} type="file" accept="image/*" multiple hidden
        onChange={(e) => { if (presenting) void add(presenting, [...(e.target.files ?? [])]); e.target.value = ""; }} />
    </>
  );
}

export interface PrizeEntry { id: string; name: string; photos: string[] }

/**
 * The host remote during the prize task. One list of contestants in no set order, since the host talks
 * to whoever they like next: no gold "Next". Tapping a name starts presenting that prize (locking the
 * guest's phone) and opens its previews beside the list, in the guest's order with the ★ on the first.
 * Nothing goes on the big screen until a preview is tapped; the one up is gold, as the stage's current
 * step is. Tapping another name switches straight to them. "+ Add photos" lets the host photograph a
 * prize in the room (only the host can add to a prize once it's presented): new photos join the end,
 * each as a tile with its progress until it's sent, so the ★ stays on the guest's first. A prize with
 * no photos gets its first, and its ★, this way. The host can also tidy a prize: ✕ removes a photo (asking
 * first, since it's the guest's; never the one on the big screen), and ☆ on any other photo moves the ★
 * to it, which makes it the first.
 */
export function PrizePresenting({ head, entries, presenting, presented, up, sending = [], onPick, onShow, onAdd, onRemove, onStar, onLower }: {
  /** The task's name, the way back to the run of show and what's on the big screen, over the list. */
  head?: ReactNode;
  entries: PrizeEntry[];
  presenting?: string;
  presented: Record<string, boolean>;
  /** The photo on the big screen, if any. */
  up?: { id: string; index: number };
  /** Photos the host is adding to the prize being presented, as fractions sent. */
  sending?: number[];
  onPick: (id: string) => void;
  onShow: (id: string, index: number) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string, index: number) => void;
  /** Moves the ★ to this photo, making it the prize's first. */
  onStar: (id: string, index: number) => void;
  onLower: () => void;
}) {
  const current = entries.find((e) => e.id === presenting);
  return (
    <div className="prize-host">
      <section className="remote prize-list">
        {head}
        <ul className="picker running">
          {entries.map((e) => (
            <li key={e.id} className={e.id === presenting ? "up" : presented[e.id] ? "shown" : ""}>
              <button aria-pressed={e.id === presenting} onClick={() => onPick(e.id)}>
                <span>{e.name}</span>
                <span className="muted small">
                  {e.id === presenting ? "presenting" : presented[e.id] ? "presented"
                    : e.photos.length ? `${e.photos.length} ${e.photos.length === 1 ? "photo" : "photos"}` : "no photos yet"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="remote prize-panel">
        {current ? (
          <>
            <h2 className="contestant">{current.name}'s prize</h2>
            {current.photos.length === 0 && !sending.length && <p className="muted">{current.name} hasn't added any photos. Add some of the prize itself.</p>}
            <ul className="prize-previews">
              {current.photos.map((url, i) => {
                const isUp = up?.id === current.id && up.index === i;
                return (
                  <li key={url}>
                    <div className="prize-preview">
                      <button className={isUp ? "active" : undefined} aria-pressed={isUp} aria-label={`Show photo ${i + 1}`} onClick={() => onShow(current.id, i)}>
                        <img src={url} alt="" />
                      </button>
                      <button className="x" disabled={isUp} aria-label={`Remove photo ${i + 1}`}
                        onClick={() => confirm(`Remove this photo from ${current.name}'s prize?`) && onRemove(current.id, i)}>✕</button>
                      {i === 0 ? <span className="star" role="img" aria-label="Main photo">★</span>
                        : <button className="unstar" aria-label={`Make photo ${i + 1} the main photo`} onClick={() => onStar(current.id, i)}>☆</button>}
                    </div>
                    <span className="muted small">{isUp ? "on the big screen" : " "}</span>
                  </li>
                );
              })}
              {sending.map((f, i) => (
                <li key={`sending-${i}`}>
                  <div className="prize-sending"><progress value={f} max={1} /></div>
                  <span className="muted small">sending… {Math.round(f * 100)}%</span>
                </li>
              ))}
            </ul>
            <p className="muted small">Tap a photo to put it on the big screen.</p>
            <button onClick={() => onAdd(current.id)}>+ Add photos</button>
            <button className="lower" disabled={!up} onClick={onLower}>Lower the curtain</button>
          </>
        ) : <p className="muted">Tap a name to present their prize.</p>}
      </section>
    </div>
  );
}
