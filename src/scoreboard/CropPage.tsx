import { useRef, useState, type PointerEvent } from "react";
import frame from "../assets/frame.png";
import type { HeadshotCrop, Session } from "../types";
import { centred, clamp, cropFill, heightOf } from "./crop";
import { setHeadshotCrop } from "./data";

/**
 * A contestant's headshot, whole, with the scoreboard's window over it: drag the window onto their face, pinch (or
 * the Size slider) to make it smaller, and the frame beside it shows what the scoreboard will. Only the crop is
 * saved; the photo stays as it was, and every other screen still shows all of it.
 */
export function CropPage({ code, session, id, onBack }: { code: string; session: Session; id: string; onBack: () => void }) {
  const contestant = session.scoreboard?.contestants?.[id];
  const [ratio, setRatio] = useState<number>();
  const [crop, setCrop] = useState<HeadshotCrop | undefined>(contestant?.crop);
  const box = useRef<HTMLDivElement>(null);
  // Fingers down on the photo: one drags the window, two pinch it.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ crop: HeadshotCrop; spread?: number; x: number; y: number }>();

  if (!contestant?.photo) {
    return (
      <div className="box-setup scoreboard-remote plan">
        <button className="link back" onClick={onBack}>← Plan the party</button>
        <p className="muted">{contestant ? `${contestant.name} has no headshot yet.` : "They're no longer on the scoreboard."}</p>
      </div>
    );
  }
  const { name, photo } = contestant;
  const now = ratio ? clamp(crop ?? centred(ratio), ratio) : undefined;
  const max = ratio ? centred(ratio).w : 1;

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : undefined;
  };
  const begin = (e: PointerEvent) => {
    if (!now) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start.current = { crop: now, spread: spread(), x: e.clientX, y: e.clientY };
  };
  const move = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !start.current || !ratio || !box.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const { width, height } = box.current.getBoundingClientRect();
    const s = start.current;
    const apart = spread();
    if (apart && s.spread) {
      // Pinching: the window grows or shrinks about its centre.
      const w = Math.min(max, Math.max(max / 5, s.crop.w * (apart / s.spread)));
      const cx = s.crop.x + s.crop.w / 2, cy = s.crop.y + heightOf(s.crop.w, ratio) / 2;
      setCrop(clamp({ x: cx - w / 2, y: cy - heightOf(w, ratio) / 2, w }, ratio));
    } else {
      setCrop(clamp({ ...s.crop, x: s.crop.x + (e.clientX - s.x) / width, y: s.crop.y + (e.clientY - s.y) / height }, ratio));
    }
  };
  const end = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const [rest] = [...pointers.current.values()];
    start.current = rest && now ? { crop: now, x: rest.x, y: rest.y } : undefined;
  };
  const resize = (w: number) => {
    if (!now || !ratio) return;
    const cx = now.x + now.w / 2, cy = now.y + heightOf(now.w, ratio) / 2;
    setCrop(clamp({ x: cx - w / 2, y: cy - heightOf(w, ratio) / 2, w }, ratio));
  };
  const save = () => { if (now) void setHeadshotCrop(code, id, now); onBack(); };

  return (
    <div className="box-setup scoreboard-remote plan crop-page">
      <button className="link back" onClick={onBack}>← Plan the party</button>
      <h2>{name}'s headshot</h2>
      <p className="muted small">Drag the frame onto {name}'s face. Pinch to zoom.</p>
      <div className="crop-photo" ref={box} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <img src={photo} alt={`${name}'s whole headshot`} draggable={false}
          onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />
        {now && ratio && (
          <div className="crop-window" style={{ left: `${now.x * 100}%`, top: `${now.y * 100}%`, width: `${now.w * 100}%`, height: `${heightOf(now.w, ratio) * 100}%` }} />
        )}
      </div>
      <div className="crop-preview">
        <div className="crop-frame">
          <div className="crop-fill" style={cropFill(photo, now, ratio)} />
          <img src={frame} alt="" />
        </div>
        <div className="crop-side">
          <span>On the scoreboard</span>
          <label>Size
            <input type="range" min={max / 5} max={max} step={max / 100} value={now?.w ?? max} onChange={(e) => resize(Number(e.target.value))} />
          </label>
          <button className="link" disabled={!ratio} onClick={() => ratio && setCrop(centred(ratio))}>Back to the middle</button>
        </div>
      </div>
      <button className="big" disabled={!now} onClick={save}>Save</button>
      <button className="link" onClick={onBack}>Cancel</button>
    </div>
  );
}
