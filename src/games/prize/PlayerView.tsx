import { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "../../keepAwake";
import type { Session } from "../../types";
import { prizePhotos, presentedOf, submitPrize } from "./data";

/**
 * The prize task's card on a guest's phone, under whatever else is on, from check-in until the host
 * starts presenting their prize (keyed by the scoreboard contestant they checked in as). A prize is one
 * or more photos. One paper "Add photos" button: the phone's own picker already offers the library and
 * the camera, so a separate camera button would only save a tap. No gold until something is picked;
 * more can be added, and any removed, before submitting. Once presented the prize is locked: the
 * receipt says so while the prize task is on, then shrinks to one line for the rest of the party.
 */
export function PrizeArea({ code, uid, id, session }: { code: string; uid: string; id: string; session: Session }) {
  const saved = prizePhotos(session)[id] ?? [];
  const presented = !!presentedOf(session)[id];
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

  function add(files: FileList | null) {
    const more = [...(files ?? [])].map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (more.length) setPicked((now) => [...(now ?? []), ...more]);
  }

  function remove(i: number) {
    revoke(picked![i]!);
    const left = picked!.filter((_, j) => j !== i);
    // Removing the last photo goes back to the empty card (or the receipt, if a prize was already sent).
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
    } catch {
      // Cancelling is a choice, not a failure: back to the check state without the warning.
      if (!ctl.signal.aborted) setFailed(true);
    } finally {
      setProgress(undefined);
    }
  }

  const browse = () => input.current?.click();
  const card = presented ? (session.game === "prize" && saved.length ? <PrizeReceipt photos={saved} locked />
      : <section className="slot"><p className="slot-hint">🎁 🔒 Your prize has been presented.</p></section>)
    : picked ? <PrizeCheck picked={picked} progress={progress} failed={failed} onAdd={browse} onRemove={remove} onReorder={setPicked}
        onSubmit={() => void submit()} onCancel={() => upload.current?.abort()} />
    : saved.length ? <PrizeReceipt photos={saved} onChange={() => setPicked(saved.map((url) => ({ url })))} />
    : <PrizeChoose onAdd={browse} />;
  return (
    <>
      {card}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    </>
  );
}

/** While the prize task is on: the guest's own prize card (from Play) sits under this. */
export function PlayerView(_: { code: string; uid: string; session: Session }) {
  return (
    <section className="slot waiting">
      <h2>Prize task</h2>
      <p className="slot-hint">Everyone's prizes are going up on the big screen.</p>
    </section>
  );
}

const revoke = (p: Picked) => { if (p.file) URL.revokeObjectURL(p.url); };

const WHO_SEES = "Only the host sees them until your prize is presented. You can change them until then.";

export function PrizeChoose({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="slot task">
      <h2>🎁 Your prize</h2>
      <div className="ph">Your prize</div>
      <p className="slot-hint">Not submitted yet. Add one or more photos of your prize.</p>
      <button onClick={onAdd}>Add photos</button>
      <p className="slot-hint">{WHO_SEES}</p>
    </section>
  );
}

/**
 * Checking the picks before submitting: every photo as a whole thumbnail (never cropped), each with ✕,
 * and "+ Add more" as the last tile, where the next photo will go. ≡ drags a photo to a new place, as on
 * the run of show; the host's previews follow this order. The first photo, starred, is the prize's photo
 * in the winner's haul at the end of the night. Only the ≡ drags, so a thumb landing on a
 * photo still scrolls the page. Removing the last photo goes back to the empty card.
 */
export function PrizeCheck({ picked, progress, failed, onAdd, onRemove, onReorder, onSubmit, onCancel }: {
  picked: Picked[];
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
    <section className="slot task">
      <h2>🎁 Your prize</h2>
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
            : <p className="slot-hint">{n} {n === 1 ? "photo" : "photos"}, not submitted yet. Are these the right ones? Drag ≡ to change the order.</p>}
          <button className="big" onClick={onSubmit}>{failed ? "Try again" : "Submit"}</button>
          <p className="slot-hint">{WHO_SEES}</p>
        </>
      )}
    </section>
  );
}

/**
 * Submitted: a still receipt, no gold button. The photos as on the check screen, in their order with the
 * ★, but with nothing to press on them. Sam can still change them until their prize is presented, so
 * "Change my photos" goes back to the check screen with these photos on it. `locked`: presented, so
 * the link gives way to the lock.
 */
export function PrizeReceipt({ photos, onChange, locked }: { photos: string[]; onChange?: () => void; locked?: boolean }) {
  const n = photos.length;
  return (
    <section className="slot task">
      <span className="stamp">✓ Submitted</span>
      <h2>🎁 Your prize</h2>
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
    </section>
  );
}

/** A photo on the check screen: a new pick (with its file), or one already sent (just its URL). */
export interface Picked { file?: File; url: string }
