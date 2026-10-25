// The style sheet: every piece of docs/style-guide.md on one page, drawn with the app's own CSS and components.
// See README.md here for how to re-render docs/screens/style-sheet.jpg.
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import "../../src/styles.css";
import "./sheet.css";
import { Toggle } from "../../src/Toggle";
import { TaskCard } from "../../src/TaskCard";
import { RulesCard } from "../../src/scoreboard/RulesSetup";
import { PinField } from "../../src/HostPin";
import { GuestCard, NameTag, Quote, Status, TodoList } from "../../src/guest";
import { SongStrip } from "../../src/SongStrip";
import { FlipClock } from "../../src/clock/FlipClock";
import { Portrait } from "../../src/games/flipchart/Portrait";
import { GotIt } from "../../src/light/LightRemote";
import type { Session } from "../../src/types";
import peach from "../../src/assets/box-objects/peach.svg";
import frame from "../../src/assets/frame.png";
import { cropFill } from "../../src/scoreboard/crop";
import { Mosaic } from "../../src/scoreboard/Mosaic";

const noop = () => {};
// A wide group shot cropped onto the person on the left, as on the crop page.
const group = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 200 120"><rect width="200" height="120" fill="#3a2a1c"/>${[[40, "#8a7556"], [100, "#5a4a36"], [160, "#5a4a36"]].map(([x, c]) => `<circle cx="${x}" cy="46" r="17" fill="${c}"/><path d="M${+x - 34} 120 C${+x - 30} 88 ${+x - 15} 72 ${x} 72 C${+x + 15} 72 ${+x + 30} 88 ${+x + 34} 120 Z" fill="${c}"/>`).join("")}</svg>`)}`;
const crop = { x: 0.05, y: 0.08, w: 0.27, h: 0.59 };
const headshotCrop = { left: "5%", top: "8%", width: "27%", height: "59%" };
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
  ["pen (PDF only)", "#1f389e", "the scores PDF's marks"],
];
const icons: [string, string][] = [
  ["🎮", "Host"], ["🏆", "Run of show"], ["🎵", "Jukebox"], ["✉", "Secret Tasks"], ["💡", "The light"], ["📏", "Useless conversions"], ["⏱", "The clock"], ["⏸ ▶", "Stop / start the clock"], ["🎲", "Dice preset"], ["🔊", "dB meter preset"], ["🎁", "Prizes"],
  ["☰", "Hidden menu"], ["📺", "Screen"], ["📷", "Scan a QR"], ["◫", "Side by side"], ["▶ ⏸ ↺", "Play, pause, restart"],
  ["←", "Back"], ["→", "Next thing"], ["✕ ×", "Close, remove"], ["✎", "Fix in place"], ["+", "Add"], ["≡", "Drag to reorder"],
  ["★ ☆", "Chosen photo"], ["✓", "Done"], ["🔒 🔓", "Locked, may resubmit"], ["🔇", "Sound blocked"], ["👁", "Show the pin"],
  ["🔑", "Host pin"], ["📤", "Send to yourself"], ["▾ ▸", "Folded section"], ["?", "The rules"], ["||||", "Tally points"], ["…", "In progress"],
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
              <Item cap={<>Default: paper, a plain <code>&lt;button&gt;</code></>}><button>Lower the curtain</button></Item>
              <Item cap={<><code>.active</code>: what's on screen now</>}><button className="active">Before</button></Item>
            </div>
            <Item cap={<><code>.line-chip-button</code>: a small side action by the line it's about (Run of show's "Show QR" by the code, "Show scores" and "Show rules" side by side under the big-screen line in <code>.line-chips.under</code>)</>}>
              <div style={{ display: "grid", gap: "0.8rem" }}>
                <div className="line-chip"><p className="muted small party-line">Halloween party · ABCD</p><button className="line-chip-button">Show QR</button></div>
                <p className="on-screen" style={{ margin: 0 }}>On the big screen: the curtain</p>
                <div className="line-chips under"><button className="line-chip-button">Show scores</button><button className="line-chip-button">Show rules</button></div>
              </div>
            </Item>
            <Item cap={<><code>.big</code>: the one main action. One per screen</>}><button className="big">Update the scores</button></Item>
            <Item cap={<><code>.big.pressed</code>: a gold button whose thing is on the big screen now; tap again to take it down</>}><button className="big pressed" aria-pressed>Show the task</button></Item>
            <Item cap={<><code>.button-sub</code>: a second line saying what else the tap does, only when there's something to say</>}><button className="big">Start task 6 →<span className="button-sub">♪ Task fanfare · 0:08</span></button></Item>
            <div className="pair">
              <Item cap={<><code>.steps.two</code>: what the stage shows</>}><div className="steps two"><button className="active">Before</button><button>After</button></div></Item>
              <Item cap="Disabled: 0.45, kept in place"><button disabled>Lower the curtain</button></Item>
            </div>
            <Item cap={<><code>.pressed-in</code> on a paper button: a part of a task on the big screen now (<code>Show part 2</code>), never gold</>}><div className="steps"><button>Show part 1</button><button className="pressed-in" aria-pressed>Show part 2</button></div></Item>
            <Item cap={<><code>.part-label</code>: host-only "part" label above a part of a task's text</>}><p className="part-label">Part 2</p></Item>
            <Item cap={<><code>.choices</code>: pick one setting, the chosen one gold</>}><div className="choices"><button className="active" aria-pressed>Photos</button><button aria-pressed={false}>Before &amp; After</button><button aria-pressed={false}>Noisemaster</button></div></Item>
            <Item cap={<><code>.choices.marks</code>: mark several, pressed in with ✓, never gold</>}><div className="choices marks"><button aria-pressed>✓ Sam</button><button aria-pressed={false}>Priya</button><button aria-pressed>✓ Mei</button></div></Item>
            <Item cap={<>Points rows: a small DQ chip (<code>.sb-dq</code>) by the name, then the points chips: picked pressed in; <code>.was</code> struck under a DQ; <code>.before</code> dashed, before a DQ moved them; then the bonus chip (<code>.sb-bonus</code>): +1, tapped again +2, kept through a DQ</>}>
              <ul className="sb-rows">
                <li><span className="sb-name">Sam<span className="muted small sb-now">now 5</span></span><div className="choices marks sb-dq"><button aria-pressed>DQ</button></div>
                  <div className="choices marks sb-chips"><button>1</button><button>2</button><button className="was">3</button><button>4</button><button>5</button></div>
                  <div className="choices marks sb-bonus"><button aria-pressed>+1</button></div></li>
                <li><span className="sb-name">Mei<span className="muted small sb-now">now 6</span></span><div className="choices marks sb-dq"><button>DQ</button></div>
                  <div className="choices marks sb-chips"><button>1</button><button className="before">2</button><button aria-pressed>3</button><button>4</button><button>5</button></div>
                  <div className="choices marks sb-bonus"><button aria-pressed>+2</button></div></li>
              </ul>
            </Item>
            <Item cap={<><code>.sb-lo</code>: LO for a dB meter, under the box while it's typed in</>}>
              <div className="sb-override sb-lo"><div className="choices marks sb-chips"><button>LO</button></div><span className="muted small">The meter shows LO: quieter than it can read. Everyone on LO ties.</span></div>
            </Item>
            <div className="pair">
              <Item cap={<><code>.link</code>: quiet exits; an icon in <code>.link-icon</code> isn't underlined</>}><div><button className="link">Lower the curtain</button> <button className="link"><span className="link-icon">📤</span>Send yourself the host link</button></div></Item>
              <Item cap="Icon buttons: aria-label always"><ul className="picker"><li><button>Sam</button><button className="x" aria-label="Fix">✎</button><button className="x" aria-label="Remove">×</button></li></ul></Item>
            </div>
          </Sec>
          <Sec title="Toggles &amp; inputs">
            <div className="pair">
              <Item cap={<><code>&lt;Toggle&gt;</code> in a <code>.toggles</code> list; a switch's own options hang off it in <code>.toggle-options</code></>}>
                <div>
                  <div className="toggles"><Toggle label="🔁 Repeat" on onChange={noop} /><Toggle label="Taskmaster rules" on onChange={noop} /></div>
                  <div className="toggle-options">
                    <span className="muted small">The sign and the rules print on</span>
                    <div className="choices marks" role="radiogroup"><button role="radio" aria-checked={false}>One page</button><button role="radio" aria-checked>Two pages</button></div>
                  </div>
                  <div className="toggles"><Toggle label="Light on" on={false} onChange={noop} /></div>
                </div>
              </Item>
              <div className="toggles" style={{ alignContent: "start" }}><label style={{ display: "grid", gap: 4 }}><span className="muted">Party name</span><input defaultValue="Halloween party" /></label><Cap>Inputs: paper, in a <code>&lt;label&gt;</code></Cap></div>
            </div>
            <div className="pair">
              <Item cap={<><code>&lt;PinField&gt;</code>: dots, 👁 shows them</>}><PinField value="4821" onChange={noop} /></Item>
              <Item cap="A party code, with 📷 scan"><div className="row resume" style={{ marginTop: 0, display: "flex" }}><input defaultValue="" placeholder="ABCD" maxLength={4} /><button aria-label="Scan">📷</button></div></Item>
            </div>
            <Item cap={<><code>.feet-in</code>: two boxes for ft and in (or lb and oz) at an imperial party, the number pad kept</>}><div className="converter"><div className="feet-in"><span>How much?</span><label><input inputMode="decimal" defaultValue="5" /> ft</label><label><input inputMode="decimal" defaultValue="11" /> in</label></div></div></Item>
            <Item cap={<><code>.time-limit</code>: a part's time limit in ✎, min and sec; empty, the time its words give is the greyed placeholder</>}><div className="time-limit"><span>Time limit (optional)</span><label><input inputMode="numeric" placeholder="2" /> min</label><label><input inputMode="numeric" placeholder="0" /> sec</label><p className="muted small">Empty, so ⏱ reads it from the words: 2 min, “You have 2 minutes.”</p></div></Item>
            <Item cap={<>A find box (<code>.clearable</code>): × empties it, the list under it filters as you type; here "a thing ▾" (<code>.choices.units .thing</code>) open</>}><div className="converter"><div className="choices units"><button>m</button><button>ft</button><button className="thing" aria-expanded>a thing ▴</button></div><div className="find-thing"><div className="clearable"><input defaultValue="eif" aria-label="Find a thing" /><button type="button" aria-label="Clear find a thing">×</button></div><ul className="tracklist"><li><button><span className="title">Eiffel Tower</span><span className="dur">330 m</span></button></li></ul></div></div></Item>
          </Sec>
          <Sec title="Host header" note="idle · lit (running) · open · alert (needs you) · flash (💡 for the second the light is on, in its colour) · stays at the top on its band">
            <div className="mini-phone phone host" style={{ padding: 0, margin: 0 }}>
              <header className="host-head" style={{ position: "static", margin: 0 }}>
                <button className="head-icon open lit" aria-label="Music">🎵▶</button>
                <button className="head-icon alert" aria-label="Secret Tasks">✉</button>
                <button className="head-icon flash" aria-label="Light (flashing)">💡</button>
                <button className="head-icon" aria-label="Useless conversions">📏</button>
                <button className="head-icon lit" aria-label="The clock (running)">⏱</button>
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
            <div className="mini-phone" style={{ width: "100%", marginTop: 12 }}>
              <ul className="run-list">
                <li className="done"><button><span className="n">3</span><span className="name">Hum a theme tune</span><span className="state">scored</span></button></li>
                <li className="next"><button><span className="n">4</span><span className="name">Build the tallest tower</span><span className="state">next</span></button></li>
                <li><button><span className="n">7</span><span className="name">💡 The light</span><span className="state">3 of 8 got it</span></button></li>
              </ul>
            </div>
            <Cap>Run of show's task list (<code>.run-list</code>): read-only, one short state on the right; scored quiet, next <code>--gold-bright</code>; tap opens the task</Cap>
            <div className="mini-phone" style={{ width: "100%", marginTop: 12, display: "grid", gap: 4 }}>
              <div className="summary-line"><span>Halloween party<span className="muted small"> · portrait set · pin set</span></span><button className="link">Change</button></div>
              <div className="summary-line"><span>♪ Song<span className="muted small"> · Eye of the Tiger · 4:05</span></span><button className="link">Change</button></div>
              <div className="extras"><button className="chip-add">+ Task text</button><button className="chip-add">+ 📏 Unit</button></div>
              <section className="extra-open"><span>Song (optional)</span><div className="row"><button>Done</button><button className="link"><span className="link-icon">✕</span>Remove song</button></div></section>
            </div>
            <Cap>Summary lines (<code>.summary-line</code>): what's set, with "Change" to open just that part; what isn't is a "+" chip (<code>.chip-add</code>); one part open at a time (<code>.extra-open</code>)</Cap>
            <div className="mini-phone" style={{ width: "100%", display: "grid", gap: 8, marginTop: 12 }}>
              <SongStrip code="HVQB" session={jukebox(false)} song="Entry of the Gladiators" />
              <SongStrip code="HVQB" session={jukebox(true)} song="Hall of the Mountain King" />
              <SongStrip code="HVQB" session={jukebox(false, false)} song="Hall of the Mountain King" />
            </div>
            <Cap>A task's song strip (<code>.sb-song</code>): ready · playing, pressed in with ⏸ (never gold) · can't play, disabled with the reason in words</Cap>
            <div className="mini-phone" style={{ width: "100%", marginTop: 12 }}>
              <button className="sb-song now-playing-strip"><span className="title">⏸ Eye of the Tiger</span><span className="dur">1:55 left</span></button>
            </div>
            <Cap>The now-playing strip (<code>.now-playing-strip</code>): under "On the big screen" on every page while a song plays; one tap pauses</Cap>
            <div className="clock-strip"><button className="sb-song"><span className="title">⏱ The clock →</span><span className="dur">2:31 left</span></button><button className="clock-hold" aria-label="Stop the clock">⏸</button></div>
            <Cap>The clock strip (<code>.clock-strip</code>): the same place and shape, on every page while the clock is set going, shown or Flipchart's. The strip opens ⏱ and never touches the room; the ⏸ beside it holds the clock (▶ carries on)</Cap>
            <div className="mini-phone" style={{ width: "100%", marginTop: 12 }}>
              <section className="move-request new-guest"><p><strong>Riley</strong> joined, but isn't on the scoreboard. Add them if they're playing.</p><div className="row"><button>Add Riley</button><button>Not playing</button></div></section>
            </div>
            <Cap>A new guest's card (<code>.move-request.new-guest</code>): the move-request style, on any page</Cap>
            <div className="mini-phone" style={{ width: "100%", marginTop: 12 }}>
              <section className="up-next the-finale"><p className="up-next-label">The finale</p><h3>All 8 tasks scored</h3><p className="up-next-note">One last update on the scoreboard, then the haul.</p><button className="big">🏆 Declare the winner</button></section>
            </div>
            <Cap>The finale (<code>.up-next.the-finale</code>): the Up next card once every task has points</Cap>
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
            <Item cap={<>The same at an imperial party: feet and inches to the quarter inch</>}><div className="slot conversion"><p className="lead">5 ft 11 in tall is</p><p className="main">about 1.23 Danny DeVitos</p><p className="lead">the actor</p><p className="small">5 ft 11 in · Danny DeVito is about 4 ft 9 ¾ in</p></div></Item>
            <Item cap={<>Started from a thing: named, its size left out</>}><div className="slot conversion"><p className="lead">The Eiffel Tower is</p><p className="main">about 2,165 Jimothys</p><p className="lead">the Ballard raccoon, at the shoulder</p><p className="small">1 Eiffel Tower = 330 m · Jimothy is about 15.24 cm</p></div></Item>
            <Item cap={<><code>.up-next</code>: Run of show's next task, with the night's gold button (paper while the scores are up)</>}>
              <section className="up-next">
                <p className="up-next-label">Up next · task 4 of 8 · live task</p>
                <h3>Build the tallest tower</h3>
                <p className="up-next-note">"Tallest tower of dry spaghetti and marshmallows. Ten minutes."</p>
                <button className="big">Start task 4 →</button>
              </section>
            </Item>
            <Item cap={<><code>.guest-card</code> (<code>GuestCard</code>): the guest phone's "To do now" card, the host's Up next card with a task's own controls inside; <code>Status</code> above it, <code>TodoList</code> below</>}>
              <div style={{ display: "grid", gap: 12 }}>
                <Status>1 thing left to do</Status>
                <GuestCard label="To do now · Prize task" title="Got photos of your prize?">
                  <Quote text="The most surprising quite-big thing you can conceal on your person" />
                  <button className="big">Yes, add photos →</button>
                  <button>Not now</button>
                </GuestCard>
                <TodoList rows={[{ id: "h", icon: "✓", label: "Headshot", state: "done", tone: "done" }, { id: "p", icon: "🎁", label: "Prize photos", state: "to do", tone: "next" }]} />
              </div>
            </Item>
            <Item cap={<><code>.name-tag</code> (<code>NameTag</code>): "HELLO my name is", a burgundy band over paper; scattered and tappable at check-in (faded with "✓ here" once taken), bigger and centred (<code>.mine</code>) on a waiting phone</>}>
              <div style={{ display: "grid", gap: 14, justifyItems: "center", padding: "8px 0 14px" }}>
                <NameTag name="Sam" mine />
                <div style={{ position: "relative", width: "100%", height: 90 }}>
                  <NameTag name="Mei" style={{ left: "2%", top: 0, ["--r" as string]: "-4deg" }} />
                  <NameTag name="Priya" here style={{ left: "52%", top: 6, ["--r" as string]: "4deg" }} />
                </div>
              </div>
            </Item>
            <Item cap={<><code>.stamp</code>: the one look for "done", with ✓ and words</>}><div style={{ display: "flex", gap: 16 }}><span className="stamp" style={{ fontSize: "1.2rem" }}>✓ Submitted</span><span className="stamp" style={{ fontSize: "1.2rem" }}>✓ You're in</span></div></Item>
          </Sec>
          <Sec title="Aged paper" note="a task's words, never UI">
            <TaskCard small lines={["Task 2 · Build the tallest tower", "Build the tallest tower you can out of dry spaghetti and marshmallows.", "Fastest wins. You have ten minutes. Your time starts now."]} />
            <Item cap={<><code>.task-card.centred.reading</code>: a task's text, its type centred, a step bigger for reading aloud</>}>
              <TaskCard small centred className="reading" lines={["Individual task", "Deep in the forest lives a creature nobody has ever seen up close.", "It has the body of a teapot and far too many knees."]} />
            </Item>
            <Item cap={<><code>RulesCard</code> (<code>.task-card.rules</code>): the Taskmaster rules, numbers hanging, the seal under the sign-off</>}>
              <RulesCard small rules={{ rules: ["You must remove your shoes before entering.", "You must not break the law.", "THE TASKMASTER'S WORD IS FINAL."], last: "And remember... THE TASKMASTER IS ALWAYS RIGHT.", signOff: "TASKMASTER" }} />
            </Item>
            <Item cap={<><code>.sb-won-bar</code>: the tiebreaker's "Tap who won.", fixed to the bottom of the phone</>}>
              <div className="sb-won-bar" style={{ position: "static" }}>
                <p className="muted small">Tap who won.</p>
                <ul className="picker running">
                  <li><button><span>Sam</span><span className="muted small" /></button></li>
                  <li className="up"><button aria-pressed><span>Priya</span><span className="muted small">won the tiebreaker</span></button></li>
                </ul>
              </div>
            </Item>
          </Sec>
          <Sec title="Framed media" note="the stage">
            <div className="stage-box">
              <div className="frame ready" style={{ ["--bw" as string]: "30px" } as React.CSSProperties}><img src={peach} alt="" style={{ background: "linear-gradient(135deg,#d8b6c9,#86506f)", padding: 40 }} /></div>
              <div className="stage-label"><span>Before</span> · Sam</div>
            </div>
            <Cap>Gold 9-slice frame hugging the media, never cropped; a paper <code>.stage-label</code> under it</Cap>
            <div className="pair" style={{ alignItems: "center" }}>
              <div className="crop-photo" style={{ width: 300 }}>
                <img src={group} alt="" style={{ width: 300 }} />
                <div className="crop-shade"><div style={headshotCrop} /></div>
                <div className="crop-window" style={headshotCrop}>{["nw", "ne", "sw", "se"].map((c) => <span key={c} className={`crop-corner ${c}`} />)}</div>
              </div>
              <div className="crop-frame"><div className="crop-fill" style={cropFill(group, crop)} /><img src={frame} alt="" /></div>
              <button className="sb-photo" style={{ flex: "none" }}><span className="sb-photo-fill" style={cropFill(group, crop)} /></button>
            </div>
            <Cap>Headshot crop, the one exception: the window over the whole photo (<code>.crop-window</code>, dots to resize), the scoreboard's frame, and the host's tall thumbnail (<code>.sb-photo</code>), all the same crop</Cap>
            <div className="mosaic-steps">
              {[3, 6, 12, 24, 48].map((cols) => <div key={cols} className="crop-frame"><div className="crop-fill"><Mosaic photo={group} crop={crop} cols={cols} rows={(cols * 4) / 3} /></div><img src={frame} alt="" /></div>)}
              <div className="crop-frame"><div className="crop-fill" style={cropFill(group, crop)} /><img src={frame} alt="" /></div>
            </div>
            <Cap>Not checked in yet: the scoreboard's 3 by 4 mosaic of the crop (<code>Mosaic</code>), and the reveal when they check in, a step every 400ms to the photo</Cap>
          </Sec>
          <Sec title="Flipchart clock &amp; portrait" note="the stage">
            <div className="pair" style={{ alignItems: "center" }}>
              <FlipClock ms={14 * 60_000 + 30_000} width="280px" />
              <div style={{ width: 120 }}><Portrait pages={[]} /></div>
            </div>
            <div className="pair" style={{ alignItems: "center" }}>
              <FlipClock ms={17_300} up width="200px" />
              <div className="clock-go-demo"><button className="big">▶ Start</button><button className="pressed-in clock-go">⏸ Stop</button></div>
            </div>
            <Cap>The ⏱ clock is the same object (<code>FlipClock</code>), counting down or, as a stopwatch (<code>up</code>), up with a small tenths digit. One button in one place: gold ▶ Start (and to carry on), pressed-in paper ⏸ Stop while it runs, never gold</Cap>
            <Cap>The show's clock (<code>.fc-clock</code>): red seven-segment digits on a black 4:3 screen, white matte, black frame about half the matte's width; the same on the TV and the host's phone, for the whole task. The portrait (<code>.fc-portrait</code>): sixteen pages in the show's pattern as one picture</Cap>
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
            <Cap><code>.corner-code</code>: the join address in the big screen's corner; while the host's "Show QR" is open, the player QR sits above it, with no caption</Cap>
            <div style={{ justifySelf: "start", width: 170, aspectRatio: "8.5 / 11", background: "#fff", color: "#000", fontFamily: "var(--typewriter)", display: "grid", alignContent: "center", justifyItems: "center", gap: 6, textAlign: "center" }}>
              <span style={{ fontSize: 6 }}>HALLOWEEN PARTY</span>
              <QRCodeSVG value="https://example.com/play?code=ABCD" marginSize={0} style={{ width: 80, height: 80 }} />
              <span style={{ fontSize: 6 }}>Contestants scan here</span>
              <span style={{ fontSize: 13 }}>Your time starts now.</span>
              <span style={{ fontSize: 4, color: "#444" }}>No camera? Go to example.com/play and enter ABCD</span>
            </div>
            <Cap>The printed check-in sign (Plan the party's PDF): the same join QR in black on a white Letter page, no border, with "Contestants scan here", then "Your time starts now." big</Cap>
            <div className="slot" style={{ gridTemplateColumns: "1fr auto", alignItems: "center" }}><h2>Your secret task</h2><button className="help-q" aria-expanded>?</button></div>
            <Cap><code>.help-q</code>: a circled ? that opens the rules in place, burgundy while open</Cap>
          </Sec>
        </div>
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Sheet />);
