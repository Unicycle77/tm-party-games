// The style sheet: every piece of docs/style-guide.md on one page, drawn with the app's own CSS and components.
// See README.md here for how to re-render docs/screens/style-sheet.jpg.
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import "../../src/styles.css";
import "./sheet.css";
import { Toggle } from "../../src/Toggle";
import { TaskCard } from "../../src/TaskCard";
import { PinField } from "../../src/HostPin";
import { SongStrip } from "../../src/SongStrip";
import { GotIt } from "../../src/light/LightRemote";
import type { Session } from "../../src/types";
import peach from "../../src/assets/box-objects/peach.svg";
import frame from "../../src/assets/frame.png";

const noop = () => {};
// A task's song strip, idle, playing and unable to play, drawn by the real component from a pretend jukebox.
const jukebox = (playing: boolean, open = true) => ({
  jukebox: { tracks: ["Entry of the Gladiators", "Hall of the Mountain King"], durations: [160, 151], open: open || undefined, state: { current: 1, playing } },
}) as unknown as Session;
const Sec = ({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) => (
  <section className="sec"><h2>{title}{note && <small>{note}</small>}</h2>{children}</section>
);
const Cap = ({ children }: { children: React.ReactNode }) => <p className="cap">{children}</p>;
const Item = ({ cap, children }: { cap: React.ReactNode; children: React.ReactNode }) => <div className="item">{children}<Cap>{cap}</Cap></div>;

const tokens: [string, string, string][] = [
  ["--burgundy-deep", "#2a0807", "backdrop fallback"], ["--burgundy", "#580f0d", "accent on paper"],
  ["--gold", "#d9b24c", "h2, borders"], ["--gold-bright", "#f3d37a", "h1, codes"],
  ["--gold-dark", "#8a6a1f", "paper border"], ["--gold-edge", "#7a5a14", "gold button border"],
  ["--gold-gradient", "var(--gold-gradient)", "gold fill"], ["--paper", "#efe6d2", "surfaces"],
  ["--ink", "#2b1d12", "text on paper"], ["--fg", "#f6ecd6", "text on curtain"],
  ["--muted", "#c9b48f", "secondary on curtain"], ["--stamp-red", "#a8201a", "the stamp only"],
  ["--bulb-red", "#e8412e", "the light's bulb"], ["--wood", "#9a6634", "the bulb's box"],
  ["--tm-red", "#c8102e", "Noisemaster"], ["--key", "#1e1d1c", "soundboard keys"],
];
const icons: [string, string][] = [
  ["🎮", "Host"], ["🏆", "Run of show"], ["🎵", "Jukebox"], ["✉", "Secret Tasks"], ["💡", "The light"], ["📏", "Useless conversions"], ["🎲", "Dice preset"], ["🔊", "dB meter preset"], ["🎁", "Prizes"],
  ["☰", "Hidden menu"], ["📺", "Screen"], ["📷", "Scan a QR"], ["◫", "Side by side"], ["▶ ⏸ ↺", "Play, pause, restart"],
  ["←", "Back"], ["→", "Next thing"], ["✕ ×", "Close, remove"], ["✎", "Fix in place"], ["+", "Add"], ["≡", "Drag to reorder"],
  ["★ ☆", "Chosen photo"], ["✓", "Done"], ["🔒 🔓", "Locked, may resubmit"], ["🔇", "Sound blocked"], ["👁", "Show the pin"],
  ["🔑", "Host pin"], ["▾ ▸", "Folded section"], ["?", "The rules"], ["||||", "Tally points"], ["…", "In progress"],
];

function Sheet() {
  return (
    <main className="sheet">
      <header><h1>Style sheet</h1><p>Taskmaster Party Games: every piece from <code>docs/style-guide.md</code>, drawn with the app's own <code>src/styles.css</code>.</p></header>
      <div className="cols">
        {/* ---- column 1: materials, colour, type, icons ---- */}
        <div className="col">
          <Sec title="1 · Materials" note="every element is made of one">
            <div className="mat">
              <Item cap="Curtain: the backdrop"><div className="sw" style={{ background: "linear-gradient(rgba(20,0,0,.25),rgba(20,0,0,.45)), var(--bg-image) center/cover", border: "2px solid var(--gold-dark)" }} /></Item>
              <Item cap="Paper: buttons, cards, inputs"><div className="sw" style={{ background: "var(--paper)", color: "var(--ink)", border: "2px solid var(--gold-dark)", boxShadow: "0 3px 0 #0006" }}>Paper</div></Item>
              <Item cap="Gold: the one main action"><div className="sw" style={{ background: "var(--gold-gradient)", color: "#2a1a05", border: "2px solid var(--gold-edge)", fontWeight: "bold" }}>GOLD</div></Item>
              <Item cap="Gold frame: media on the stage"><div className="sw" style={{ border: "26px solid transparent", borderImage: `url(${frame}) 100 / 26px round`, background: "#1a0f08", backgroundClip: "padding-box" }} /></Item>
              <Item cap="Ink on curtain: headings, text"><div className="sw" style={{ display: "grid", gap: 2, alignContent: "center", border: "1px dashed var(--gold-dark)" }}><span style={{ color: "var(--gold-bright)", fontSize: "1.4rem" }}>Heading</span><span style={{ color: "var(--fg)", fontFamily: "system-ui", fontSize: ".85rem" }}>Body · <span className="muted">muted</span></span></div></Item>
              <Item cap="Aged paper: a task's words"><div className="sw" style={{ background: "radial-gradient(ellipse at 30% 20%, #f4ecd6, #e9dcbc 60%, #d9c79c)", color: "#1f1a14", clipPath: "polygon(0 4%,8% 0,20% 3%,35% 0,52% 4%,70% 1%,85% 4%,100% 0,98% 50%,100% 100%,80% 96%,60% 100%,40% 97%,20% 100%,0 96%,2% 50%)" }}>Task</div></Item>
            </div>
          </Sec>
          <Sec title="2 · Colour tokens" note="use the token, never a new hex">
            <div className="tokens">
              {tokens.map(([name, v, use]) => (
                <div className="tok" key={name}><i style={{ background: v.startsWith("var") ? v : `var(${name})` }} /><b>{name}</b><span>{use}</span></div>
              ))}
            </div>
            <Cap>Not tokens yet: <code>#7a6a55</code> muted on paper · <code>#e6d6b0</code> pressed in · <code>#ff9c8a</code> error on curtain · <code>#1a0f08</code> the mat behind media</Cap>
          </Sec>
          <Sec title="4 · Type">
            <div className="item"><h1 style={{ margin: 0, fontSize: "2.4rem" }}>h1 · Run of show</h1><Cap>Typewriter, <code>--gold-bright</code>, a 2px shadow</Cap></div>
            <div className="item"><h2 style={{ margin: 0 }}>h2 · Tasks (3)</h2><Cap>Typewriter, <code>--gold</code></Cap></div>
            <div className="item"><p className="code" style={{ fontSize: "4rem" }}>HVQB</p><Cap>A code: huge, 0.3em tracking, a gold glow, readable from the back of the room</Cap></div>
            <div className="item"><p style={{ margin: 0 }}>System sans for body text, hints and form labels. <span className="muted small">.muted.small for a one-line hint.</span></p><p className="error" style={{ margin: 0 }}>Upload failed. Try again.</p><Cap>Errors: plain <code>.error</code> text, never a stamp</Cap></div>
          </Sec>
          <Sec title="7 · Icons" note="emoji and Unicode, each with one meaning">
            <div className="icons">{icons.map(([g, m]) => <div key={m}><span>{g}</span>{m}</div>)}</div>
          </Sec>
        </div>

        {/* ---- column 2: controls ---- */}
        <div className="col">
          <Sec title="3 · Buttons">
            <div className="pair">
              <Item cap={<>Default: paper, a plain <code>&lt;button&gt;</code></>}><button>Show the scoreboard</button></Item>
              <Item cap={<><code>.active</code>: what's on screen now</>}><button className="active">Before</button></Item>
            </div>
            <Item cap={<><code>.big</code>: the one main action. One per screen</>}><button className="big">Update the scores · 2 new tasks</button></Item>
            <div className="pair">
              <Item cap={<><code>.steps.two</code>: what the stage shows</>}><div className="steps two"><button className="active">Before</button><button>After</button></div></Item>
              <Item cap="Disabled: 0.45, kept in place"><button disabled>Lower the curtain</button></Item>
            </div>
            <Item cap={<><code>.choices</code>: pick one setting, the chosen one gold</>}><div className="choices"><button className="active" aria-pressed>Photos</button><button aria-pressed={false}>Before &amp; After</button><button aria-pressed={false}>Noisemaster</button></div></Item>
            <Item cap={<><code>.choices.marks</code>: mark several, pressed in with ✓, never gold</>}><div className="choices marks"><button aria-pressed>✓ Sam</button><button aria-pressed={false}>Priya</button><button aria-pressed>✓ Mei</button></div></Item>
            <Item cap={<>Points rows: a small DQ chip (<code>.sb-dq</code>) by the name, then the points chips: picked pressed in; <code>.was</code> struck under a DQ; <code>.before</code> dashed, before a DQ moved them; then the +1 bonus chip (<code>.sb-bonus</code>), kept through a DQ</>}>
              <ul className="sb-rows">
                <li><span className="sb-name">Sam<span className="muted small sb-now">now 5</span></span><div className="choices marks sb-dq"><button aria-pressed>DQ</button></div>
                  <div className="choices marks sb-chips"><button>1</button><button>2</button><button className="was">3</button><button>4</button><button>5</button></div>
                  <div className="choices marks sb-bonus"><button aria-pressed>+1</button></div></li>
                <li><span className="sb-name">Mei<span className="muted small sb-now">now 6</span></span><div className="choices marks sb-dq"><button>DQ</button></div>
                  <div className="choices marks sb-chips"><button>1</button><button className="before">2</button><button aria-pressed>3</button><button>4</button><button>5</button></div>
                  <div className="choices marks sb-bonus"><button>+1</button></div></li>
              </ul>
            </Item>
            <Item cap={<><code>.sb-lo</code>: LO for a dB meter, under the box while it's typed in</>}>
              <div className="sb-override sb-lo"><div className="choices marks sb-chips"><button>LO</button></div><span className="muted small">The meter shows LO: quieter than it can read. Everyone on LO ties.</span></div>
            </Item>
            <div className="pair">
              <Item cap={<><code>.link</code>: quiet exits</>}><div><button className="link">Lower the curtain</button> <button className="link">Party settings</button></div></Item>
              <Item cap="Icon buttons: aria-label always"><ul className="picker"><li><button>Sam</button><button className="x" aria-label="Fix">✎</button><button className="x" aria-label="Remove">×</button></li></ul></Item>
            </div>
          </Sec>
          <Sec title="Toggles &amp; inputs">
            <div className="pair">
              <Item cap={<><code>&lt;Toggle&gt;</code> in a <code>.toggles</code> list</>}><div className="toggles"><Toggle label="🔁 Repeat" on onChange={noop} /><Toggle label="Light on" on={false} onChange={noop} /></div></Item>
              <div className="toggles" style={{ alignContent: "start" }}><label style={{ display: "grid", gap: 4 }}><span className="muted">Party name</span><input defaultValue="Halloween party" /></label><Cap>Inputs: paper, in a <code>&lt;label&gt;</code></Cap></div>
            </div>
            <div className="pair">
              <Item cap={<><code>&lt;PinField&gt;</code>: dots, 👁 shows them</>}><PinField value="4821" onChange={noop} /></Item>
              <Item cap="A game code, with 📷 scan"><div className="row resume" style={{ marginTop: 0, display: "flex" }}><input defaultValue="" placeholder="ABCD" maxLength={4} /><button aria-label="Scan">📷</button></div></Item>
            </div>
          </Sec>
          <Sec title="Host header" note="idle · lit (running) · open · alert (needs you)">
            <div className="mini-phone phone host" style={{ padding: 0, margin: 0 }}>
              <header className="host-head"><span><strong>🎮 Host</strong><span className="muted"> · Halloween party · HVQB</span></span>
                <button className="head-icon open lit" aria-label="Run of show">🏆</button>
                <button className="head-icon lit" aria-label="Music">🎵▶</button>
                <button className="head-icon alert" aria-label="Secret Tasks">✉</button>
                <button className="head-icon" aria-label="Light">💡</button>
                <button className="head-icon" aria-label="Useless conversions">📏</button>
              </header>
            </div>
            <p className="on-screen">On the big screen: the scoreboard</p>
            <Cap><code>.on-screen</code>: one line saying what the big screen shows</Cap>
          </Sec>
          <Sec title="Row states" note="always with words, never colour alone">
            <ul className="picker running mini-phone" style={{ width: "100%" }}>
              <li className="shown"><button><span>Alex</span><span className="muted small">shown</span></button></li>
              <li className="up"><button><span>Sam</span><span className="muted small">on the big screen</span></button></li>
              <li className="next"><button><span>Priya</span><span className="muted small">← next</span></button></li>
              <li><button><span>Mei</span><span className="stamp">✓ Submitted</span></button><button className="lock" aria-label="Lock">🔓</button></li>
              <li><button disabled><span>Tiebreaker task <span className="muted small">· only if there's a tie</span></span></button><button className="x" aria-label="Fix">✎</button></li>
            </ul>
            <Cap>Shown: dimmed · On the big screen: pressed in · Next: gold outline · Done: the stamp · Not yet available: disabled, its ✎ still works</Cap>
            <div className="mini-phone" style={{ width: "100%", display: "grid", gap: 8, marginTop: 12 }}>
              <SongStrip code="HVQB" session={jukebox(false)} song="Entry of the Gladiators" />
              <SongStrip code="HVQB" session={jukebox(true)} song="Hall of the Mountain King" />
              <SongStrip code="HVQB" session={jukebox(false, false)} song="Hall of the Mountain King" />
            </div>
            <Cap>A task's song strip (<code>.sb-song</code>): ready · playing, gold with ⏸ · can't play, disabled with the reason in words</Cap>
            <div className="mini-phone" style={{ width: "100%", marginTop: 12 }}>
              <GotIt code="HVQB" session={{ hostUid: "", light: { got: { sam: 1, priya: 2 } }, scoreboard: { contestants: Object.fromEntries(
                ["Sam", "Priya", "Mei", "Alex", "Jo"].map((name, order) => [name.toLowerCase(), { name, order }])) } }} />
            </div>
            <Cap>The light's "Got it" list (<code>.light-got</code>): a row per guesser (place, name, points); everyone keeps a chip in place, dimmed with ✓ once on the list</Cap>
          </Sec>
        </div>

        {/* ---- column 3: surfaces ---- */}
        <div className="col">
          <Sec title="Cards &amp; panels">
            <div className="pair">
              <Item cap={<><code>.tile</code>: an index card, slightly askew</>}><ul className="tiles" style={{ gridTemplateColumns: "1fr", paddingTop: 0 }}><li><button className="tile static"><span className="name">Priya</span><span className="stamp">✓ You're in</span></button></li></ul></Item>
              <Item cap={<><code>.slot</code>: the phone's paper panel</>}><div className="slot"><h2>🎁 Your prize</h2><p className="slot-hint">Add photos of what you brought.</p><button className="big" style={{ fontSize: "1rem", padding: ".7rem" }}>Add photos</button></div></Item>
            </div>
            <Item cap={<><code>.slot.conversion</code>: a result to read aloud (<code>.conversion-card</code> on the big screen)</>}><div className="slot conversion"><p className="lead">39 dice tall is</p><p className="main">65 LEGO bricks</p><p className="lead">a 2×4 brick, without its studs</p><p className="small">39 dice = 62.4 cm · a LEGO brick is 9.6 mm</p></div></Item>
            <Item cap={<><code>.stamp</code>: the one look for "done", with ✓ and words</>}><div style={{ display: "flex", gap: 16 }}><span className="stamp" style={{ fontSize: "1.2rem" }}>✓ Submitted</span><span className="stamp" style={{ fontSize: "1.2rem" }}>✓ You're in</span></div></Item>
          </Sec>
          <Sec title="Aged paper" note="a task's words, never UI">
            <TaskCard small lines={["Task 2 · Build the tallest tower", "Build the tallest tower you can out of dry spaghetti and marshmallows.", "Fastest wins. You have ten minutes. Your time starts now."]} />
          </Sec>
          <Sec title="Framed media" note="the stage">
            <div className="stage-box">
              <div className="frame ready" style={{ ["--bw" as string]: "30px" } as React.CSSProperties}><img src={peach} alt="" style={{ background: "linear-gradient(135deg,#d8b6c9,#86506f)", padding: 40 }} /></div>
              <div className="stage-label"><span>Before</span> · Sam</div>
            </div>
            <Cap>Gold 9-slice frame hugging the media, never cropped; a paper <code>.stage-label</code> under it</Cap>
          </Sec>
          <Sec title="QR codes &amp; help">
            <div className="pair" style={{ alignItems: "end" }}>
              <figure className="join-qr"><QRCodeSVG value="https://example.com/play" style={{ width: 150, height: 150 }} /><figcaption style={{ fontSize: "1.1rem" }}>Players scan here</figcaption></figure>
              <figure className="host-qr"><QRCodeSVG value="https://example.com/host" style={{ width: 120, height: 120 }} /><figcaption>Host scans here</figcaption></figure>
            </div>
            <Cap>Players: <code>--gold</code> border · Host: <code>--paper</code> border, so the two can't be confused</Cap>
            <div className="corner-code" style={{ position: "static", justifySelf: "end" }}>
              <QRCodeSVG value="https://example.com/play?code=ABCD" bgColor="#fff" marginSize={2} style={{ width: 110, height: 110 }} />
              <p>example.com/play · <strong>ABCD</strong></p>
            </div>
            <Cap><code>.corner-code</code>: the join address in the big screen's corner; while the host's "Show QR code" is open, the player QR sits above it, with no caption</Cap>
            <div className="slot" style={{ gridTemplateColumns: "1fr auto", alignItems: "center" }}><h2>Your secret task</h2><button className="help-q" aria-expanded>?</button></div>
            <Cap><code>.help-q</code>: a circled ? that opens the rules in place, burgundy while open</Cap>
          </Sec>
        </div>
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Sheet />);
