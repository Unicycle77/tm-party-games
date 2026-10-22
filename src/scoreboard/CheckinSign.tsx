import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { PUBLIC_URL, joinUrlFor } from "../firebase";
import type { Session } from "../types";
import { pdfName, showPdf, typewriter } from "./TaskCards";
import { buildSignPdf } from "./taskCardsPdf";

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

/**
 * "Check-in sign" on Plan the party: downloads one page to print and tape by the door, the join QR under the party's
 * name, "Your time starts now." and the address and code for a phone that can't scan.
 */
export function CheckinSign({ code, session }: { code: string; session: Session }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();

  async function download() {
    setBusy(true); setNote(undefined);
    // Opened now, while the tap still counts, so the browser lets the PDF come up in its own tab once it's made.
    const tab = window.open("", "_blank");
    try {
      const site = PUBLIC_URL.replace(/^https?:\/\//, "");
      const pdf = await buildSignPdf(await typewriter(), {
        party: session.name, modules: qrModules(joinUrlFor(code)), fallback: `No camera? Go to ${site}/play and enter ${code}`,
      });
      showPdf(pdf, tab, pdfName(session, code, "check-in sign"));
    } catch { tab?.close(); setNote("Couldn't make the PDF. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <section className="task-cards">
      <div className="summary-line">
        <span>Check-in sign</span>
        <button className="link" disabled={busy} onClick={() => void download()}>{busy ? "Making…" : "Download PDF"}</button>
      </div>
      <p className="muted small">{note ?? "Opens in a new tab: the join QR for the door, to print."}</p>
    </section>
  );
}
