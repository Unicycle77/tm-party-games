/**
 * The PDF from Print on Plan the party, built here (no library) so the Veteran Typewriter font goes in as it is:
 * plain black text on white Letter pages, 12 pt, nothing of the card's parchment, edges or seal. The check-in sign
 * for the door first; then a page per task, or per part of one, text centred down the page; then the secret tasks
 * as cards: eight to a sheet (2 × 4, to cut) or four (2 × 2, to fold into envelopes), each headed SECRET TASK, with
 * faint cut lines and no fold lines. Any of the three can be left out.
 */

export type Page = { heading: string; paragraphs: string[] };
export type SecretLayout = "cut" | "fold";

const PT = 72;
const PAGE_W = 8.5 * PT;
const PAGE_H = 11 * PT;
const SIZE = 12;
const LEADING = 1.35;
const GAP = 1.1; // between paragraphs, in lines
const MARGIN = 1 * PT;

/** What the font gives the layout: advance widths (per 1000 em) for the characters a PDF text string can hold. */
export interface Face {
  sfnt: Uint8Array;
  widths: Record<number, number>;
  ascent: number;
  descent: number;
  bbox: [number, number, number, number];
}

const u16 = (d: DataView, o: number) => d.getUint16(o);
const i16 = (d: DataView, o: number) => d.getInt16(o);

/** A WOFF file's tables, inflated and put back into a plain sfnt (TrueType) file. */
export async function sfntOfWoff(woff: ArrayBuffer): Promise<Uint8Array> {
  const d = new DataView(woff);
  if (d.getUint32(0) !== 0x774f4646) throw new Error("Not a WOFF font");
  const flavor = d.getUint32(4), n = u16(d, 12);
  const tables: { tag: number; sum: number; data: Uint8Array }[] = [];
  for (let i = 0; i < n; i++) {
    const e = 44 + i * 20;
    const tag = d.getUint32(e), off = d.getUint32(e + 4), comp = d.getUint32(e + 8), orig = d.getUint32(e + 12), sum = d.getUint32(e + 16);
    const raw = new Uint8Array(woff, off, comp);
    tables.push({ tag, sum, data: comp < orig ? await inflate(raw) : raw });
  }
  tables.sort((a, b) => a.tag - b.tag);
  const head = 12 + n * 16;
  const total = tables.reduce((t, x) => t + ((x.data.length + 3) & ~3), head);
  const out = new Uint8Array(total), o = new DataView(out.buffer);
  o.setUint32(0, flavor); o.setUint16(4, n);
  const pow = 2 ** Math.floor(Math.log2(n));
  o.setUint16(6, pow * 16); o.setUint16(8, Math.log2(pow)); o.setUint16(10, n * 16 - pow * 16);
  let at = head;
  tables.forEach((t, i) => {
    const e = 12 + i * 16;
    o.setUint32(e, t.tag); o.setUint32(e + 4, t.sum); o.setUint32(e + 8, at); o.setUint32(e + 12, t.data.length);
    out.set(t.data, at);
    at += (t.data.length + 3) & ~3;
  });
  return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** The Windows-1252 characters above 0x7F that aren't Latin-1, which is what a PDF's WinAnsi text holds. */
const WIN_ANSI: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x2c6, 0x89: 0x2030,
  0x8a: 0x160, 0x8b: 0x2039, 0x8c: 0x152, 0x8e: 0x17d, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022,
  0x96: 0x2013, 0x97: 0x2014, 0x98: 0x2dc, 0x99: 0x2122, 0x9a: 0x161, 0x9b: 0x203a, 0x9c: 0x153, 0x9e: 0x17e, 0x9f: 0x178,
};
const unicodeOf = (code: number) => WIN_ANSI[code] ?? code;

/** The font's table data: widths of every WinAnsi code it has a glyph for, its vertical size and its box. */
export function faceOf(sfnt: Uint8Array): Face {
  const d = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
  const dir: Record<string, number> = {};
  for (let i = 0; i < u16(d, 4); i++) {
    const e = 12 + i * 16;
    dir[String.fromCharCode(...sfnt.subarray(e, e + 4))] = d.getUint32(e + 8);
  }
  const em = u16(d, dir.head! + 18);
  const k = 1000 / em;
  const bbox = [i16(d, dir.head! + 36), i16(d, dir.head! + 38), i16(d, dir.head! + 40), i16(d, dir.head! + 42)].map((v) => Math.round(v * k)) as Face["bbox"];
  const ascent = Math.round(i16(d, dir.hhea! + 4) * k), descent = Math.round(i16(d, dir.hhea! + 6) * k);
  const metrics = u16(d, dir.hhea! + 34);
  const advance = (g: number) => u16(d, dir.hmtx! + Math.min(g, metrics - 1) * 4);

  // The Windows Unicode cmap (format 4): which glyph draws each character.
  const cm = dir.cmap!;
  let sub = -1;
  for (let i = 0; i < u16(d, cm + 2); i++) {
    const e = cm + 4 + i * 8;
    if (u16(d, e) === 3 && u16(d, e + 2) === 1) sub = cm + d.getUint32(e + 4);
  }
  if (sub < 0 || u16(d, sub) !== 4) throw new Error("The font has no Unicode map");
  const segs = u16(d, sub + 6) / 2;
  const glyphOf = (c: number) => {
    for (let s = 0; s < segs; s++) {
      const end = u16(d, sub + 14 + s * 2);
      if (c > end) continue;
      const start = u16(d, sub + 16 + segs * 2 + s * 2);
      if (c < start) return 0;
      const delta = i16(d, sub + 16 + segs * 4 + s * 2);
      const rangeAt = sub + 16 + segs * 6 + s * 2, range = u16(d, rangeAt);
      if (!range) return (c + delta) & 0xffff;
      const g = u16(d, rangeAt + range + (c - start) * 2);
      return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };
  const widths: Record<number, number> = {};
  for (let code = 32; code < 256; code++) {
    const g = glyphOf(unicodeOf(code));
    if (g) widths[code] = Math.round(advance(g) * k);
  }
  return { sfnt, widths, ascent, descent, bbox };
}

/** Characters the font can't draw become something it can: curly quotes straighten, dashes shorten, an ellipsis is three dots. */
const SWAPS: Record<string, string> = { "…": "...", "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", " ": " ", "\t": " " };

/** The text as WinAnsi codes the face has a glyph for, anything else a "?". */
export function codesOf(face: Face, text: string): number[] {
  const out: number[] = [];
  for (const ch of text.replace(/[…‘’“”–— \t]/g, (c) => SWAPS[c]!)) {
    const u = ch.codePointAt(0)!;
    const code = u < 256 && !(u >= 0x80 && u < 0xa0) ? u : Number(Object.keys(WIN_ANSI).find((c) => WIN_ANSI[+c] === u) ?? 0);
    out.push(code && face.widths[code] !== undefined ? code : 63);
  }
  return out;
}

const widthOf = (face: Face, codes: number[], size: number) => codes.reduce((w, c) => w + (face.widths[c] ?? 0), 0) * size / 1000;

/** A paragraph broken into lines no wider than `max` (a word wider than that is cut where it runs out). */
function wrap(face: Face, text: string, size: number, max: number): number[][] {
  const lines: number[][] = [];
  let line: number[] = [];
  const space = codesOf(face, " ");
  for (const word of text.split(/ +/).filter(Boolean)) {
    let w = codesOf(face, word);
    const joined = line.length ? [...line, ...space, ...w] : w;
    if (widthOf(face, joined, size) <= max) { line = joined; continue; }
    if (line.length) { lines.push(line); line = []; }
    while (widthOf(face, w, size) > max) {
      let n = w.length - 1;
      while (n > 1 && widthOf(face, w.slice(0, n), size) > max) n--;
      lines.push(w.slice(0, n)); w = w.slice(n);
    }
    line = w;
  }
  if (line.length) lines.push(line);
  return lines;
}

/** A line of text where it goes; `grey` (0 black … 1 white) for a quieter line. */
interface Placed { x: number; y: number; codes: number[]; size: number; grey?: number }

/**
 * One card's text laid out inside a box: the heading centred in capitals, then a paragraph a line, the block centred
 * down the box. Text too long for the box is set a little smaller until it fits.
 */
function layCard(face: Face, p: Page, box: { x: number; y: number; w: number; h: number }, pad: number): Placed[] {
  const max = box.w - pad * 2;
  const maxH = box.h - pad * 2;
  let size = SIZE;
  for (;;) {
    const lead = size * LEADING;
    const blocks: { lines: number[][]; centred: boolean }[] = [];
    if (p.heading) blocks.push({ lines: [codesOf(face, p.heading.toUpperCase())], centred: true });
    for (const para of p.paragraphs) blocks.push({ lines: wrap(face, para, size, max), centred: false });
    const rows = blocks.reduce((n, b) => n + b.lines.length, 0);
    const gap = GAP * size;
    const height = rows * lead + Math.max(0, blocks.length - 1) * gap;
    if (height > maxH && size > 6) { size -= 0.5; continue; }
    const out: Placed[] = [];
    // The first baseline sits half the leading's slack and an ascent below the block's top.
    const top = height > maxH ? box.y + box.h - pad : box.y + box.h / 2 + height / 2;
    let y = top - (lead - size) / 2 - size * 0.8;
    for (const b of blocks) {
      for (const codes of b.lines) {
        const x = b.centred ? box.x + (box.w - widthOf(face, codes, size)) / 2 : box.x + pad;
        out.push({ x, y, codes, size });
        y -= lead;
      }
      y -= gap;
    }
    return out;
  }
}

const hex = (codes: number[]) => "<" + codes.map((c) => c.toString(16).padStart(2, "0")).join("") + ">";
const num = (n: number) => String(Math.round(n * 100) / 100);

function stream(placed: Placed[], lines: string[] = []): string {
  const ops = [...lines];
  ops.push("BT");
  for (const t of placed) ops.push(`${num(t.grey ?? 0)} g /F1 ${num(t.size)} Tf 1 0 0 1 ${num(t.x)} ${num(t.y)} Tm ${hex(t.codes)} Tj`);
  ops.push("ET");
  return ops.join("\n");
}

/** Faint cut lines across a sheet cut into `cols` × `rows`, between the cards only. */
function cutLines(cols: number, rows: number): string[] {
  const ops = ["0.8 G", "0.5 w"];
  for (let c = 1; c < cols; c++) ops.push(`${num(PAGE_W * c / cols)} 0 m ${num(PAGE_W * c / cols)} ${PAGE_H} l S`);
  for (let r = 1; r < rows; r++) ops.push(`0 ${num(PAGE_H * r / rows)} m ${PAGE_W} ${num(PAGE_H * r / rows)} l S`);
  return ops;
}

/** A page per entry of `pages`: the task's words, heading centred in capitals, the block centred down the page. */
function taskPages(face: Face, pages: Page[]): string[] {
  return pages.map((p) => stream(layCard(face, p, { x: 0, y: 0, w: PAGE_W, h: PAGE_H }, MARGIN)));
}

/** `secrets` as sheets of cards headed SECRET TASK, 8 (2 × 4) to cut or 4 (2 × 2) to fold a sheet. */
function secretSheets(face: Face, secrets: string[], layout: SecretLayout): string[] {
  const content: string[] = [];
  const cols = 2, rows = layout === "cut" ? 4 : 2, per = cols * rows;
  const w = PAGE_W / cols, h = PAGE_H / rows;
  for (let i = 0; i < secrets.length; i += per) {
    const placed: Placed[] = [];
    secrets.slice(i, i + per).forEach((text, j) => {
      const col = j % cols, row = Math.floor(j / cols);
      placed.push(...layCard(face, { heading: "Secret task", paragraphs: text.split("\n").map((l) => l.trim()).filter(Boolean) }, { x: col * w, y: PAGE_H - (row + 1) * h, w, h }, 0.4 * PT));
    });
    content.push(stream(placed, cutLines(cols, rows)));
  }
  return content;
}

export interface Sign { party?: string; modules: boolean[][]; fallback: string }

/**
 * The check-in sign: one Letter page to tape by the door. The party's name small on top, the join QR (`modules`,
 * its dark squares, about 3¾ in) with "Contestants scan here", "Your time starts now." big, and the address and code
 * small at the bottom for a phone that can't scan.
 */
function signPage(face: Face, sign: Sign): string {
  const centred = (text: string, size: number, y: number, grey?: number): Placed => {
    const codes = codesOf(face, text);
    return { x: (PAGE_W - widthOf(face, codes, size)) / 2, y, codes, size, grey };
  };
  const side = 3.75 * PT, cell = side / sign.modules.length;
  const qrTop = PAGE_H / 2 + 2.7 * PT, left = (PAGE_W - side) / 2;
  const squares: string[] = ["0 g"];
  sign.modules.forEach((row, r) => row.forEach((dark, c) => {
    if (dark) squares.push(`${num(left + c * cell)} ${num(qrTop - (r + 1) * cell)} ${num(cell)} ${num(cell)} re`);
  }));
  squares.push("f");
  const placed = [
    ...(sign.party ? [centred(sign.party.toUpperCase(), 16, qrTop + 0.55 * PT)] : []),
    centred("Contestants scan here", 16, qrTop - side - 0.35 * PT),
    centred("Your time starts now.", 40, qrTop - side - 1.45 * PT),
    centred(sign.fallback, 11, qrTop - side - 2.25 * PT, 0.27),
  ];
  return stream(placed, squares);
}

export interface Rules { rules: string[]; last: string; signOff: string }

/**
 * The Taskmaster rules: one Letter page for the door. TASKMASTER RULES big on top, the rules numbered with the
 * number hanging in the margin, the last paragraph, and the sign-off on the right with room under it for a real wax
 * seal (no seal is printed: a real one is in colour). Long rules are set a little smaller until they fit.
 */
export function rulesPage(face: Face, r: Rules): string {
  const left = MARGIN, w = PAGE_W - 2 * MARGIN, hang = 0.45 * PT;
  for (let size = 18; ; size -= 0.5) {
    const lead = size * LEADING, gap = size * 0.9;
    const placed: Placed[] = [];
    const title = codesOf(face, "TASKMASTER RULES");
    let y = PAGE_H - MARGIN - 32;
    placed.push({ x: (PAGE_W - widthOf(face, title, 32)) / 2, y, codes: title, size: 32 });
    y -= 32 * 1.6;
    r.rules.forEach((rule, i) => {
      placed.push({ x: left, y, codes: codesOf(face, `${i + 1}.`), size });
      for (const codes of wrap(face, rule, size, w - hang)) { placed.push({ x: left + hang, y, codes, size }); y -= lead; }
      y -= gap;
    });
    y -= gap;
    for (const codes of wrap(face, r.last, size, w)) { placed.push({ x: left, y, codes, size }); y -= lead; }
    // Room under the sign-off for a real wax seal (about 1¼ in), pressed on by hand: no seal is printed.
    const sy = y - 0.7 * PT;
    if (sy - 1.25 * PT < MARGIN && size > 9) continue;
    const sign = codesOf(face, r.signOff.toUpperCase());
    placed.push({ x: PAGE_W - MARGIN - widthOf(face, sign, 22), y: sy, codes: sign, size: 22 });
    return stream(placed);
  }
}

/**
 * The one PDF from Print on Plan the party, in the order it lists them: the check-in sign (when there is one), a
 * page per entry of `pages`, then `secrets` as sheets in `layout`. Each starts on its own page.
 */
export async function buildPrintPdf(face: Face, what: { sign?: Sign; rules?: Rules; pages: Page[]; secrets: string[]; layout: SecretLayout }): Promise<Uint8Array> {
  const content = [...(what.sign ? [signPage(face, what.sign)] : []), ...(what.rules ? [rulesPage(face, what.rules)] : []), ...taskPages(face, what.pages), ...secretSheets(face, what.secrets, what.layout)];
  if (!content.length) throw new Error("Nothing to print");
  return writePdf(face, content);
}

/** The PDF file around `content`, a content stream a page, with the face embedded once as F1. */
async function writePdf(face: Face, content: string[]): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (b: Uint8Array | string) => { const u = typeof b === "string" ? enc.encode(b) : b; chunks.push(u); size += u.length; };
  const obj = (n: number, body: string | (Uint8Array | string)[]) => {
    offsets[n] = size;
    push(`${n} 0 obj\n`);
    for (const b of Array.isArray(body) ? body : [body]) push(b);
    push("\nendobj\n");
  };
  // 1 catalog, 2 pages, 3 font, 4 descriptor, 5 font file, then a page and its content each.
  const kids = content.map((_, i) => `${6 + i * 2} 0 R`);
  push("%PDF-1.4\n%âãÏÓ\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Count ${content.length} /Kids [${kids.join(" ")}] >>`);
  const first = 32, last = 255;
  const wlist = Array.from({ length: last - first + 1 }, (_, i) => face.widths[first + i] ?? 0).join(" ");
  obj(3, `<< /Type /Font /Subtype /TrueType /BaseFont /VeteranTypewriter /FirstChar ${first} /LastChar ${last} /Widths [${wlist}] /Encoding /WinAnsiEncoding /FontDescriptor 4 0 R >>`);
  obj(4, `<< /Type /FontDescriptor /FontName /VeteranTypewriter /Flags 32 /FontBBox [${face.bbox.join(" ")}] /ItalicAngle 0 /Ascent ${face.ascent} /Descent ${face.descent} /CapHeight ${Math.round(face.ascent * 0.7)} /StemV 80 /FontFile2 5 0 R >>`);
  const font = await deflate(face.sfnt);
  obj(5, [`<< /Length ${font.length} /Length1 ${face.sfnt.length} /Filter /FlateDecode >>\nstream\n`, font, "\nendstream"]);
  content.forEach((c, i) => {
    const bytes = enc.encode(c);
    obj(6 + i * 2, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${7 + i * 2} 0 R >>`);
    obj(7 + i * 2, [`<< /Length ${bytes.length} >>\nstream\n`, bytes, "\nendstream"]);
  });
  const count = 6 + content.length * 2;
  const xref = size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}
