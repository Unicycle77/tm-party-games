import { useRef, useState, type PointerEvent } from "react";
import frame from "../assets/frame.png";
import type { HeadshotCrop, Session } from "../types";
import { centred, clamp, cropFill, heightOf, WINDOW } from "./crop";
import { setHeadshotCrop } from "./data";

type Corner = "nw" | "ne" | "sw" | "se";
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
const place = (c: HeadshotCrop, ratio: number) => ({ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${heightOf(c.w, ratio) * 100}%` });

/**
 * A contestant's headshot, whole, with the scoreboard's window over it: drag the window onto their face, drag a
 * corner (or pinch) to resize it, and the frame beside it shows what the scoreboard will. Only the crop is
 * saved; the photo stays as it was, and every other screen still shows all of it.
 */
export function CropPage({ code, session, id, onBack }: { code: string; session: Session; id: string; onBack: () => void }) {
  const contestant = session.scoreboard?.contestants?.[id];
  const [ratio, setRatio] = useState<number>();
  const [crop, setCrop] = useState<HeadshotCrop | undefined>(contestant?.crop);
  const box = useRef<HTMLDivElement>(null);
  // Fingers down on the photo: one drags the window (or a corner of it), two pinch it.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ crop: HeadshotCrop; spread?: number; x: number; y: number; corner?: Corner }>();

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
    const corner = pointers.current.size === 1 ? (e.target as HTMLElement).dataset.corner as Corner | undefined : undefined;
    start.current = { crop: now, spread: spread(), x: e.clientX, y: e.clientY, corner };
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
    } else if (s.corner) {
      // A corner: the opposite one stays put, and the window keeps its shape, following whichever way the finger went further.
      const west = s.corner.includes("w"), north = s.corner.includes("n");
      const h0 = heightOf(s.crop.w, ratio);
      const ax = west ? s.crop.x + s.crop.w : s.crop.x, ay = north ? s.crop.y + h0 : s.crop.y;
      const px = s.crop.x + (west ? 0 : s.crop.w) + (e.clientX - s.x) / width;
      const py = s.crop.y + (north ? 0 : h0) + (e.clientY - s.y) / height;
      const room = Math.min(west ? ax : 1 - ax, ((north ? ay : 1 - ay) * WINDOW) / ratio);
      const w = Math.min(room, max, Math.max(max / 5, Math.abs(px - ax), (Math.abs(py - ay) * WINDOW) / ratio));
      const h = heightOf(w, ratio);
      setCrop({ x: west ? ax - w : ax, y: north ? ay - h : ay, w, h });
    } else {
      setCrop(clamp({ ...s.crop, x: s.crop.x + (e.clientX - s.x) / width, y: s.crop.y + (e.clientY - s.y) / height }, ratio));
    }
  };
  const end = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const [rest] = [...pointers.current.values()];
    start.current = rest && now ? { crop: now, x: rest.x, y: rest.y } : undefined;
  };
  const save = () => { if (now) void setHeadshotCrop(code, id, now); onBack(); };

  return (
    <div className="box-setup scoreboard-remote plan crop-page">
      <button className="link back" onClick={onBack}>← Plan the party</button>
      <h2>{name}'s headshot</h2>
      <p className="muted small">Drag the frame onto {name}'s face, or a corner to resize.</p>
      <div className="crop-photo" ref={box} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <img src={photo} alt={`${name}'s whole headshot`} draggable={false}
          onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />
        {now && ratio && (
          <>
            {/* the dimming is clipped to the photo; the window's corners can hang over its edge */}
            <div className="crop-shade"><div style={place(now, ratio)} /></div>
            <div className="crop-window" style={place(now, ratio)}>
              {CORNERS.map((c) => <span key={c} className={`crop-corner ${c}`} data-corner={c} />)}
            </div>
          </>
        )}
      </div>
      <div className="crop-preview">
        <div className="crop-frame">
          <div className="crop-fill" style={cropFill(photo, now)} />
          <img src={frame} alt="" />
        </div>
        <div className="crop-side">
          <span>On the scoreboard</span>
          <button className="link" disabled={!ratio} onClick={() => ratio && setCrop(centred(ratio))}>Back to the middle</button>
        </div>
      </div>
      <button className="big" disabled={!now} onClick={save}>Save</button>
      <button className="link" onClick={onBack}>Cancel</button>
    </div>
  );
}
