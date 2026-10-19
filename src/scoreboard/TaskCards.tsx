import { get, ref } from "firebase/database";
import { useState } from "react";
import fontUrl from "../assets/veteran_typewriter-webfont.woff?url";
import { db } from "../firebase";
import { Toggle } from "../Toggle";
import type { Scoreboard, Session } from "../types";
import { setupFileName } from "../setupFile";
import { sorted } from "./tasks";
import { headingOf, partsOf, tiebreakerWords } from "./TaskText";
import { buildPdf, faceOf, sfntOfWoff, type Page, type SecretLayout } from "./taskCardsPdf";

/** A page per task with words (and per part of one), the tiebreaker last; a task with no words has none. */
export function pagesOf(board: Scoreboard | undefined): Page[] {
  const words = [...sorted(board?.tasks).map(([, t]) => t), ...(board?.tiebreaker ? [tiebreakerWords(board.tiebreaker)] : [])];
  return words.flatMap((t) => partsOf(t).map((p) => ({
    heading: headingOf(p.type),
    paragraphs: p.text.split("\n").map((l) => l.trim()).filter(Boolean),
  })));
}

/**
 * "Task cards" on Plan the party: downloads the party's task text as a PDF to print, a page a task (a part), and
 * with "Include secret tasks" the pile as cards to cut (8 a sheet) or fold into envelopes (4 a sheet).
 */
export function TaskCards({ code, session }: { code: string; session: Session }) {
  const [secret, setSecret] = useState(false);
  const [layout, setLayout] = useState<SecretLayout>("cut");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();

  async function download() {
    setBusy(true); setNote(undefined);
    // Opened now, while the tap still counts, so the browser lets the PDF come up in its own tab once it's made.
    const tab = window.open("", "_blank");
    try {
      const pool = secret ? ((await get(ref(db(), `secretTasks/${code}/pool`))).val() ?? {}) as Record<string, string> : {};
      const secrets = Object.values(pool).filter((t) => t.trim());
      const pages = pagesOf(session.scoreboard);
      if (!pages.length && !secrets.length) { tab?.close(); setNote("No task has any text yet."); return; }
      const face = faceOf(await sfntOfWoff(await (await fetch(fontUrl)).arrayBuffer()));
      const pdf = await buildPdf(face, pages, secrets, layout);
      const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
      if (tab) tab.location.href = url;
      else {
        // The browser wouldn't open a tab, so it downloads instead.
        const a = Object.assign(document.createElement("a"), { href: url, download: setupFileName(session, code).replace(/\.taskmaster\.json$/, " task cards.pdf") });
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { tab?.close(); setNote("Couldn't make the PDF. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <section className="task-cards">
      <div className="summary-line">
        <span>Task cards</span>
        <button className="link" disabled={busy} onClick={() => void download()}>{busy ? "Making…" : "Download PDF"}</button>
      </div>
      <p className="muted small">{note ?? "Opens in a new tab: each task's text, a page a part, to print."}</p>
      <div className="toggles"><Toggle label="Include secret tasks" on={secret} onChange={setSecret} /></div>
      {secret && (
        <div className="choices marks" role="radiogroup" aria-label="Secret task sheets">
          <button type="button" role="radio" aria-checked={layout === "cut"} onClick={() => setLayout("cut")}>8 to cut</button>
          <button type="button" role="radio" aria-checked={layout === "fold"} onClick={() => setLayout("fold")}>4 to fold</button>
        </div>
      )}
    </section>
  );
}
