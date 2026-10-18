import { useEffect, useRef, useState } from "react";
import { GuestCard, Quote, Status } from "../../guest";
import { useKeepAwake } from "../../keepAwake";
import type { Session } from "../../types";
import { prizePhotos, presentedOf, submitPrize } from "./data";

/** The prize task's words, as the host wrote them. */
const prizeText = (session: Session) =>
  Object.values(session.scoreboard?.tasks ?? {}).find((t) => t.game === "prize")?.text?.trim() || undefined;

/**
 * The prize task on a guest's phone, from check-in until the host starts presenting their prize (keyed by
 * the scoreboard contestant they checked in as). A prize is one or more photos. It starts as a question on
 * the "To do now" card, "Got photos of your prize?": "Yes, add photos" opens the phone's own picker (which
 * already offers the library and the camera); "Not now" leaves it an optional row on the to-do list
 * (`onLater`). More photos can be added, and any removed, before submitting. Once presented the prize is
 * locked. Stays mounted while hidden (`shown` false), so a phone moving on mid-upload doesn't drop it;
 * `onBusy` says when photos are being checked or sent, which puts this card first.
 */
export function PrizeArea({ code, uid, id, session, shown, onBusy, onLater, onSent }: {
  code: string; uid: string; id: string; session: Session; shown: boolean;
  onBusy: (busy: boolean) => void; onLater: () => void; onSent: () => void;
}) {
  const saved = prizePhotos(session)[id] ?? [];
  const presented = !!presentedOf(session)[id];
  const text = prizeText(session);
  // Being changed on this phone: photos already sent (no file) and new ones, in the guest's order.
  const [picked, setPicked] = useState<Picked[]>();
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const upload = useRef<AbortController>();
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  // A phone that locks mid-upload can stall it.
  useKeepAwake(progress !== undefined);
  useEffect(() => () => { pickedRef.current?.forEach(revoke); upload.current?.abort(); }, []);
  useEffect(() => onBusy(!!picked), [!!picked]);

  function add(files: FileList | null) {
    const more = [...(files ?? [])].map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (more.length) setPicked((now) => [...(now ?? []), ...more]);
  }

  function remove(i: number) {
    revoke(picked![i]!);
    const left = picked!.filter((_, j) => j !== i);
    // Removing the last photo goes back to the question (or the receipt, if a prize was already sent).
    setPicked(left.length ? left : undefined);
    setFailed(false);
  }

  async function submit() {
    if (!picked) return;
    const ctl = new AbortController();
    upload.current = ctl;
    setFailed(false);
    setProgress(0);
    try {
      await submitPrize(code, uid, id, picked, setProgress, ctl.signal);
      picked.forEach(revoke);
      setPicked(undefined);
      onSent();
    } catch {
      // Cancelling is a choice, not a failure: back to the check state without the warning.
      if (!ctl.signal.aborted) setFailed(true);
    } finally {
      setProgress(undefined);
    }
  }

  const browse = () => input.current?.click();
  const card = !shown && !picked ? null
    : presented ? <PrizeReceipt photos={saved} text={text} locked />
    : picked ? <PrizeCheck picked={picked} text={text} progress={progress} failed={failed} onAdd={browse} onRemove={remove} onReorder={setPicked}
        onSubmit={() => void submit()} onCancel={() => upload.current?.abort()} />
    : saved.length ? <PrizeReceipt photos={saved} text={text} onChange={() => setPicked(saved.map((url) => ({ url })))} />
    : <PrizeAsk text={text} onYes={browse} onLater={onLater} />;
  return (
    <>
      {card}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    </>
  );
}

/** While the prize task is on, everyone watches; the guest's own prize is a row on their to-do list. */
export function PlayerView(_: { code: string; uid: string; session: Session }) {
  return <Status>Everyone's prizes are going up on the big screen.</Status>;
}

const revoke = (p: Picked) => { if (p.file) URL.revokeObjectURL(p.url); };

const LABEL = "To do now · Prize task";
const WHO_SEES = "Only the host sees them until your prize is presented. You can change them until then.";

/** The question: no photos yet, and the guest hasn't said "Not now". */
function PrizeAsk({ text, onYes, onLater }: { text?: string; onYes: () => void; onLater: () => void }) {
  return (
    <GuestCard label={LABEL} title="Got photos of your prize?">
      {text && <Quote text={text} />}
      <button className="big" onClick={onYes}>Yes, add photos →</button>
      <button onClick={onLater}>Not now</button>
    </GuestCard>
  );
}

/**
 * Checking the picks before submitting: every photo as a whole thumbnail (never cropped), each with ✕,
 * and "+ Add more" as the last tile, where the next photo will go. ≡ drags a photo to a new place, as on
 * the run of show; the host's previews follow this order. The first photo, starred, is the prize's photo
 * in the winner's haul at the end of the night. Only the ≡ drags, so a thumb landing on a
 * photo still scrolls the page. Removing the last photo goes back to the empty card.
 */
export function PrizeCheck({ picked, text, progress, failed, onAdd, onRemove, onReorder, onSubmit, onCancel }: {
  picked: Picked[];
  text?: string;
  /** Sending, as a fraction sent: Photos' sending state, and nothing on the photos to press. */
  progress?: number;
  failed?: boolean;
  onAdd: () => void; onRemove: (i: number) => void; onReorder: (picked: Picked[]) => void; onSubmit: () => void; onCancel?: () => void;
}) {
  const sending = progress !== undefined;
  const [dragging, setDragging] = useState<{ url: string; order: Picked[] }>();
  const tiles = useRef<Record<string, HTMLLIElement | null>>({});
  const order = dragging?.order ?? picked;
  const n = picked.length;

  const drag = {
    start(e: React.PointerEvent, url: string) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging({ url, order: picked });
    },
    // Takes the place of the tile under the finger, so it works across the grid's rows.
    move(e: React.PointerEvent) {
      if (!dragging) return;
      const over = order.findIndex((p) => {
        const r = tiles.current[p.url]?.getBoundingClientRect();
        return r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      });
      if (over < 0 || order[over]!.url === dragging.url) return;
      const moving = order.find((p) => p.url === dragging.url)!;
      const others = order.filter((p) => p.url !== dragging.url);
      setDragging({ ...dragging, order: [...others.slice(0, over), moving, ...others.slice(over)] });
    },
    end() {
      if (dragging) onReorder(dragging.order);
      setDragging(undefined);
    },
  };

  return (
    <GuestCard label={LABEL} title="Your prize photos">
      {text && <Quote text={text} />}
      <ul className="prize-picks">
        {order.map((p, i) => (
          <li key={p.url} ref={(el) => { tiles.current[p.url] = el; }} className={dragging?.url === p.url ? "dragging" : undefined}>
            <img src={p.url} alt={`Photo ${i + 1}`} />
            {!sending && (
              <>
                <button className="handle" aria-label={`Move photo ${i + 1}`}
                  onPointerDown={(e) => drag.start(e, p.url)} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end}>≡</button>
                <button className="x" aria-label={`Remove photo ${i + 1}`} onClick={() => onRemove(i)}>✕</button>
              </>
            )}
            {i === 0 && <span className="star" role="img" aria-label="Main photo">★</span>}
          </li>
        ))}
        {!sending && <li><button className="prize-add" onClick={onAdd}>+ Add more</button></li>}
      </ul>
      {sending ? (
        <>
          <div className="sending">
            <progress value={progress} max={1} />
            <span>Submitting… {Math.round(progress * 100)}%</span>
          </div>
          <p className="slot-hint">Keep this screen open until it's done.</p>
          {onCancel && <button className="link" onClick={onCancel}>Cancel</button>}
        </>
      ) : (
        <>
          {failed
            ? <p className="error">Your photos didn't finish sending. Nothing was submitted. Check your Wi-Fi and try again.</p>
            : <p className="slot-hint">★ The first photo is the one on the big screen at the end. Drag ≡ to change the order.</p>}
          <button className="big" onClick={onSubmit}>{failed ? "Try again" : `Submit ${n} ${n === 1 ? "photo" : "photos"}`}</button>
          <p className="slot-hint">{WHO_SEES}</p>
        </>
      )}
    </GuestCard>
  );
}

/**
 * Submitted: a still receipt, no gold button. The photos as on the check screen, in their order with the
 * ★, but with nothing to press on them. Sam can still change them until their prize is presented, so
 * "Change my photos" goes back to the check screen with these photos on it. `locked`: presented, so
 * the link gives way to the lock.
 */
export function PrizeReceipt({ photos, text, onChange, locked }: { photos: string[]; text?: string; onChange?: () => void; locked?: boolean }) {
  const n = photos.length;
  return (
    <GuestCard label="Prize task" title="Your prize photos">
      {text && <Quote text={text} />}
      <span className="stamp">✓ Submitted</span>
      <ul className="prize-picks">
        {photos.map((url, i) => (
          <li key={url}>
            <img src={url} alt={`Photo ${i + 1}`} />
            {i === 0 && <span className="star" role="img" aria-label="Main photo">★</span>}
          </li>
        ))}
      </ul>
      {locked ? <p className="slot-hint">{n ? `${n} ${n === 1 ? "photo" : "photos"}. ` : ""}🔒 Your prize has been presented.</p> : (
        <>
          <p className="slot-hint">{n} {n === 1 ? "photo" : "photos"}. {WHO_SEES}</p>
          <button className="link" onClick={onChange}>Change my photos</button>
        </>
      )}
    </GuestCard>
  );
}

/** A photo on the check screen: a new pick (with its file), or one already sent (just its URL). */
export interface Picked { file?: File; url: string }
