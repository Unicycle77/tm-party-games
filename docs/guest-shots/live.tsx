import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { get, onValue, ref, seed } from "firebase/database";
import "../../src/styles.css";
import { db } from "../../src/firebase";
import { Screen } from "../../src/Screen";
import { StingDriver } from "../../src/StingDriver";
import { setTransitionFiles, warmFor } from "../../src/stingPictures";
import { startSting } from "../../src/scoreboard/data";
import { setDisplay } from "../../src/session";
import type { Session } from "../../src/types";

const CODE = "ABCD";
function wav(seconds: number) {
  const rate = 8000, n = rate * seconds, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128 + Math.round(40 * Math.sin(i / 8)));
  return new Blob([buf], { type: "audio/wav" });
}
const handle = (name: string, blob: Blob) => ({ kind: "file" as const, name, getFile: async () => new File([blob], name, { type: blob.type }) });
async function webm(seconds: number): Promise<Blob> {
  const c = document.createElement("canvas"); c.width = 160; c.height = 90;
  const g = c.getContext("2d")!; const stream = c.captureStream(15);
  const rec = new MediaRecorder(stream, { mimeType: "video/webm" }); const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise<Blob>((r) => { rec.onstop = () => r(new Blob(chunks, { type: "video/webm" })); });
  rec.start(); const t0 = performance.now();
  await new Promise<void>((res) => { const f = () => { g.fillStyle = `hsl(${(performance.now() - t0) / 5},70%,50%)`; g.fillRect(0, 0, 160, 90); if (performance.now() - t0 < seconds * 1000) requestAnimationFrame(f); else res(); }; f(); });
  rec.stop(); return done;
}
const png = () => { const c = document.createElement("canvas"); c.width = 16; c.height = 9; c.getContext("2d")!.fillRect(0, 0, 16, 9); return new Promise<string>((r) => c.toBlob((b) => r(URL.createObjectURL(b!)))); };

function Live() {
  const [session, setSession] = useState<Session>();
  useEffect(() => onValue(ref(db(), `sessions/${CODE}`), (s) => setSession(s.val() as Session)), []);
  if (!session) return null;
  return <><Screen code={CODE} session={session} /><StingDriver code={CODE} session={session} /></>;
}

Object.assign(window, {
  t: {
    seed: (tree: unknown) => seed(tree as Record<string, unknown>),
    files: async (opts: { music?: number; video?: number }) => {
      setTransitionFiles({
        music: new Map(opts.music ? [["Fanfare", handle("Fanfare.wav", wav(opts.music))]] : []),
        videos: new Map(opts.video ? [["Intro.webm", handle("Intro.webm", await webm(opts.video))]] : []),
        pictures: new Map([["Slide.png", await png()]]),
      });
      await warmFor({ music: ["Fanfare"], video: ["Intro.webm"] });
    },
    startSting, setDisplay,
    read: async (path: string) => (await get(ref(db(), path))).val(),
  },
});
createRoot(document.getElementById("root")!).render(<Live />);
