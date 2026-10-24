import { get, ref } from "firebase/database";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import fontUrl from "../assets/veteran_typewriter-webfont.woff?url";
import { PUBLIC_URL, db, joinUrlFor } from "../firebase";
import { usePileCount } from "../games/secretTasks/TaskPile";
import { setupFileName } from "../setupFile";
import { store } from "../store";
import { Toggle } from "../Toggle";
import type { Scoreboard, Session } from "../types";
import { buildPrintPdf, faceOf, sfntOfWoff, type Face, type SecretLayout } from "./taskCardsPdf";
import { sorted, titleOf } from "./tasks";
import { headingOf, partsOf, tiebreakerWords } from "./TaskText";

/** The tasks with task text in running order, the tiebreaker last, each with its words and the label its chip shows. */
export function wordedTasks(board: Scoreboard | undefined) {
  return [
    ...sorted(board?.tasks).map(([id, t], i) => ({ id, label: `${i + 1} ${titleOf(t)}`, t })),
    ...(board?.tiebreaker ? [{ id: "tiebreaker", label: "Tiebreaker", t: tiebreakerWords(board.tiebreaker) }] : []),
  ].filter(({ t }) => partsOf(t).length);
}

/** The Veteran Typewriter face, read from the app's own font file, for a PDF. */
async function typewriter(): Promise<Face> {
  return faceOf(await sfntOfWoff(await (await fetch(fontUrl)).arrayBuffer()));
}

/** The PDF in `tab`, opened while the tap still counted; where the browser wouldn't open one, it downloads instead. */
function showPdf(pdf: Uint8Array, tab: Window | null, name: string) {
  const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
  if (tab) tab.location.href = url;
  else Object.assign(document.createElement("a"), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * The join QR's dark squares, row by row: the same code the big screen draws (`QRCodeSVG`), read back from its
 * path, which runs of dark squares draw as "M x y h n v1 H x z".
 */
export function qrModules(value: string): boolean[][] {
  const box = document.createElement("div");
  const root = createRoot(box);
  flushSync(() => root.render(<QRCodeSVG value={value} marginSize={0} />));
  const svg = box.querySelector("svg")!;
  const n = Number(svg.getAttribute("viewBox")!.split(" ")[2]);
  const d = svg.querySelectorAll("path")[1]!.getAttribute("d")!;
  root.unmount();
  const rows = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  for (const [, x, y, w] of d.matchAll(/M(\d+)[ ,](\d+) ?h(\d+)/g)) {
    for (let i = 0; i < +w!; i++) rows[+y!]![+x! + i] = true;
  }
  return rows;
}

/** What's switched on and which tasks are unticked (by id, so a task added later starts ticked). */
interface Picks { sign: boolean; pages: boolean; secret: boolean; layout: SecretLayout; left: string[] }
const ALL: Picks = { sign: true, pages: true, secret: true, layout: "cut", left: [] };
const picksKey = (code: string) => `ba.print.${code}`;

/** This phone's last picks for the party, or everything on. */
function keptPicks(code: string): Picks {
  try { return { ...ALL, ...JSON.parse(store.get(picksKey(code)) || "{}") as Partial<Picks> }; } catch { return ALL; }
}

/**
 * "Print" on Plan the party: one PDF of everything printed before the night. A switch per item, in the order the
 * PDF prints them (the check-in sign, the task pages, the secret tasks), each item's options under its switch, and
 * one Download PDF for whatever is on. The picks are kept on this phone for the party.
 */
export function PrintGroup({ code, session }: { code: string; session: Session }) {
  const [picks, setPicksState] = useState(() => keptPicks(code));
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const pile = usePileCount(code);
  const worded = wordedTasks(session.scoreboard);
  const n = worded.length;
  const picked = worded.filter(({ id }) => !picks.left.includes(id));
  const anything = picks.sign || picks.pages || picks.secret;

  const setPicks = (p: Partial<Picks>) => {
    const next = { ...picks, ...p };
    setPicksState(next); setNote(undefined);
    store.set(picksKey(code), JSON.stringify(next));
  };

  async function download() {
    setBusy(true); setNote(undefined);
    // Opened now, while the tap still counts, so the browser lets the PDF come up in its own tab once it's made.
    const tab = window.open("", "_blank");
    try {
      const pool = picks.secret ? ((await get(ref(db(), `secretTasks/${code}/pool`))).val() ?? {}) as Record<string, string> : {};
      const secrets = Object.values(pool).filter((t) => t.trim());
      const pages = picks.pages ? picked.flatMap(({ t }) => partsOf(t).map((p) => ({
        heading: headingOf(p.type),
        paragraphs: p.text.split("\n").map((l) => l.trim()).filter(Boolean),
      }))) : [];
      const site = PUBLIC_URL.replace(/^https?:\/\//, "");
      const sign = picks.sign
        ? { party: session.name, modules: qrModules(joinUrlFor(code)), fallback: `No camera? Go to ${site}/play and enter ${code}` }
        : undefined;
      if (!sign && !pages.length && !secrets.length) { tab?.close(); setNote("Nothing to print yet: no task text or secret tasks."); return; }
      const pdf = await buildPrintPdf(await typewriter(), { sign, pages, secrets, layout: picks.layout });
      showPdf(pdf, tab, setupFileName(session, code).replace(/\.taskmaster\.json$/, " print.pdf"));
    } catch { tab?.close(); setNote("Couldn't make the PDF. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <section className="print">
      <div className="summary-line">
        <span>Print</span>
        <button className="link" disabled={busy || !anything} onClick={() => void download()}>{busy ? "Making…" : "Download PDF"}</button>
      </div>
      <p className="muted small">{note ?? (anything ? "Opens in a new tab: one PDF of what's on, in this order, to print." : "Turn something on to print.")}</p>
      <div className="toggles">
        <Toggle label="Check-in sign" on={picks.sign} onChange={(sign) => setPicks({ sign })} />
        <Toggle label="Task pages" on={picks.pages} onChange={(pages) => setPicks({ pages })} />
      </div>
      {picks.pages && !picking && (
        <div className="summary-line">
          <span className="muted small">{!n ? "No task has task text yet" : picked.length === n ? `All ${n} with task text` : `${picked.length} of ${n} with task text`}</span>
          {n > 0 && <button type="button" className="link" onClick={() => setPicking(true)}>Change</button>}
        </div>
      )}
      {picks.pages && picking && (
        <section className="extra-open">
          <span className="muted small">{picked.length} of {n} with task text</span>
          <div className="choices two marks">
            {worded.map(({ id, label }) => {
              const on = !picks.left.includes(id);
              return (
                <button key={id} type="button" aria-pressed={on}
                  onClick={() => setPicks({ left: on ? [...picks.left, id] : picks.left.filter((x) => x !== id) })}>
                  {on ? "✓ " : ""}{label}
                </button>
              );
            })}
          </div>
          <div className="row"><button type="button" onClick={() => setPicking(false)}>Done</button></div>
        </section>
      )}
      <div className="toggles">
        <Toggle label={<>Secret tasks<span className="muted small"> · {pile ?? "…"} in the pile</span></>} on={picks.secret} onChange={(secret) => setPicks({ secret })} />
      </div>
      {picks.secret && (
        <div className="choices marks" role="radiogroup" aria-label="Secret task sheets">
          <button type="button" role="radio" aria-checked={picks.layout === "cut"} onClick={() => setPicks({ layout: "cut" })}>8 to cut</button>
          <button type="button" role="radio" aria-checked={picks.layout === "fold"} onClick={() => setPicks({ layout: "fold" })}>4 to fold</button>
        </div>
      )}
    </section>
  );
}
