// Draws the guest phone's screens (and the TV's welcome beside them) from the real components over an in-memory party (see fake-database.ts).
// Usage: npx vite --config docs/guest-shots/vite.config.ts, then node docs/guest-shots/shoot.mjs
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { Play } from "../../src/Play";
import { HostPage } from "../../src/HostPage";
import { ConverterPage } from "../../src/conversions/ConverterPage";
import { Screen } from "../../src/Screen";
import type { Session } from "../../src/types";
import { seed } from "./fake-database";
import { DEFAULT_WORDS } from "../../src/games/secretTasks/data";
import { flipchartDefaults } from "../../src/games/flipchart/data";
import { portraitPages, type Reading } from "./portraits";
import { Bulb } from "../../src/light/Bulb";
import { MODES } from "../../src/light/triggers";
import { lightNow } from "../../src/light/data";
import { registerStingPicture } from "../../src/stingPictures";
import { StageGate } from "../../src/StageGate";

const CODE = "ABCD";
const q = new URLSearchParams(location.search);
const shot = q.get("shot") ?? "home-waiting";
const who = shot.startsWith("host-") ? "host" : shot === "task-box-peek" ? "greg" : shot === "task-box-decide" ? "alex" : q.get("who") ?? "sam";
// The check-in shots and the TV's welcome are one moment of one party: everyone but Sam is already in, and he's the last to check in.
// Noisemaster mid-go: Sam has said "I am" of "I am the Noisemaster", on the board the host set up.
const BOARD = ["cheese", "I", "banana", "Noisemaster", "wobble", "am", "Greg", "sausage", "the", "trumpet", "Alex", "moist", "duck", "hello", "spoon", "yes"];
const SECRETS: Record<string, string> = { alex: "Get three people to high-five you without explaining why.", greg: "Say the word moist in every sentence for ten minutes.", mei: "Get a guest to hold your drink while you tie your shoe.", priya: "Convince someone you have met before.", sam: "Hum a tune only you know.", tom: "Leave mid-sentence and come back with a snack." };
const midGo = () => ({ player: "sam", phrase: ["I", "am", "the", "Noisemaster"], startedAt: 1, progress: 2, mistakes: 1, firstAt: Date.now() - 23400, last: { key: "k1", i: 5, ok: true } });
const arriving = shot.startsWith("checkin") || shot === "tv-welcome" || shot === "host-arrivals" || shot === "host-plan-pixel";

// Alex and Greg are always guests, as a nod to the show.
const people: Record<string, string> = { alex: "Alex", greg: "Greg", mei: "Mei", priya: "Priya", sam: "Sam", tom: "Tom" };
const face = (c: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125"><rect width="100" height="125" fill="#1a0f08"/><circle cx="50" cy="48" r="22" fill="${c}"/><path d="M8 125 C12 88 32 78 50 78 C68 78 88 88 92 125 Z" fill="${c}"/></svg>`)}`;
// For the pixelate shots, faces that differ (backdrop, hair, skin, top), so each one's mosaic is its own.
const portrait = ([bg, hair, skin, top]: string[]) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 100 125"><rect width="100" height="125" fill="${bg}"/><ellipse cx="50" cy="44" rx="27" ry="30" fill="${hair}"/><path d="M6 125 C10 92 30 82 50 82 C70 82 90 92 94 125 Z" fill="${top}"/><rect x="42" y="62" width="16" height="22" fill="${skin}"/><ellipse cx="50" cy="52" rx="20" ry="24" fill="${skin}"/><circle cx="42" cy="50" r="2.4" fill="#1a0f08"/><circle cx="58" cy="50" r="2.4" fill="#1a0f08"/><path d="M42 64 Q50 70 58 64" stroke="#5a2a1c" stroke-width="2.4" fill="none"/></svg>`)}`;
const PORTRAITS: Record<string, string> = {
  alex: portrait(["#4a78b0", "#e0b030", "#e8b49a", "#2c3e50"]),
  greg: portrait(["#d8d0c0", "#6a4a2a", "#c89070", "#8a2a1c"]),
  mei: portrait(["#7a2a6a", "#1a1010", "#d9a07a", "#c0603a"]),
  priya: portrait(["#5a6a7a", "#2a1a10", "#a87050", "#3a4a5a"]),
  sam: portrait(["#c8d0d8", "#3a2418", "#d8a890", "#3a4a8a"]),
};
const TOM = portrait(["#3a5a3a", "#b04a20", "#e0b090", "#d8c070"]);
// A wide group shot, Greg on the left: centred in the scoreboard's tall window, he'd be cut in half.
const group = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 200 120"><rect width="200" height="120" fill="#3a2a1c"/>${[[40, "#8a7556"], [100, "#5a4a36"], [160, "#5a4a36"]].map(([x, c]) => `<circle cx="${x}" cy="46" r="17" fill="${c}"/><path d="M${+x - 34} 120 C${+x - 30} 88 ${+x - 15} 72 ${x} 72 C${+x + 15} 72 ${+x + 30} 88 ${+x + 34} 120 Z" fill="${c}"/>`).join("")}</svg>`)}`;
const pic = (e: string, bg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><rect width="120" height="90" fill="${bg}"/><text x="60" y="58" font-size="40" text-anchor="middle">${e}</text></svg>`)}`;
// Prize photos from earlier parties (docs/guest-shots/prizes), one prize each: Sam's sock puppet is on the big screen.
const prize = (name: string) => `/docs/guest-shots/prizes/${name}.jpg`;
const PRIZE_PHOTOS: Record<string, string[]> = {
  sam: [prize("sock-puppet")],
  priya: [prize("voltron")],
  alex: [prize("jerky-flowers")],
  greg: [prize("goat")],
};
const PRIZE = "The most unusual thing to bring on a first date";
const HEAD = "The most unjustifiably-confident headshot";

// Where the envelopes fall: the same spread as the real pile (secretTasks/data.ts), from a fixed seed so shots repeat.
const env = (n: number) => {
  let a = 20261018;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 2 ** 32; };
  return Object.fromEntries(Array.from({ length: n }, (_, i) => [`e${i}`, { x: 6 + rnd() * 78, y: 4 + rnd() * 76, r: Math.round(rnd() * 70 - 35) }]));
};

function build() {
  const ids = Object.keys(people);
  // Mid-arrival for the pixelate shots: Alex, Greg and Priya are in; Mei, Sam and Tom (no headshot yet) aren't.
  const checkedIn = new Set(shot.includes("pixel") ? ["alex", "greg", "priya"] : arriving ? ids.filter((id) => id !== "sam") : ids);
  const contestants = Object.fromEntries(ids.map((id, i) => [id, {
    name: people[id], order: i,
    ...(shot.endsWith("haul") ? { photo: "/docs/guest-shots/faces/silhouette.jpg" } : !(shot === "checkin-headshot" && id === who) && (id !== "tom" || shot.includes("scores") || shot.endsWith("haul")) ? { photo: face("#6b5a44") } : {}),
    ...(checkedIn.has(id) && !arriving ? { uid: id } : {}),
  }]));
  if (shot.includes("pixel")) for (const [id, src] of Object.entries(PORTRAITS)) contestants[id]!.photo = src;
  // The task pages' Headshot shots: everyone's own face.
  if (shot.includes("headshot")) for (const [id, src] of Object.entries({ ...PORTRAITS, tom: TOM })) contestants[id]!.photo = src;
  if (shot.startsWith("host-plan-crop") || shot === "host-crop") contestants.greg!.photo = group;
  // Back on the list after Save: the window the crop page shot left on Greg.
  if (shot === "host-plan-cropped" || shot === "tv-scores-cropped" || shot === "host-arrivals") Object.assign(contestants.greg!, { photo: group, crop: { x: 0.05, y: 0.08, w: 0.27, h: 0.59 } });
  if (arriving) for (const id of checkedIn) contestants[id]!.uid = id;
  const tasks: Record<string, unknown> = {
    t1: { order: 1, game: "headshots", text: HEAD },
    t2: { order: 2, game: "photos", name: "best costume", text: "Take a photo of the best costume in the room that isn't yours." },
    t3: { order: 3, game: "prize", text: PRIZE },
    t4: { order: 4, game: "secretTasks" },
    t5: { order: 5, game: "noisemaster" },
  };
  for (let i = 6; i <= 8; i++) tasks[`t${i}`] = { order: i, name: `Live task ${i}` };
  // Plan the party shows the lineup to a friend, so its live tasks have real names: the ones played elsewhere tonight.
  if (shot.startsWith("host-plan")) {
    tasks.t6 = { order: 6, name: "Dice tower", type: "Individual", text: "Build the tallest tower out of dice.\n\nYou have exactly 3 minutes. Tallest standing tower wins." };
    tasks.t7 = { order: 7, name: "Five socks", type: "Individual", text: "Put on five socks, a sock at a time, as fast as you can. Fastest wins." };
    tasks.t8 = { order: 8, name: "Hum a theme tune" };
  }
  // A live task with two parts: an Individual one, then a Team one.
  if (shot.includes("parts")) tasks.t6 = {
    order: 6, name: "Dice tower", type: "Individual",
    text: "Build the tallest tower out of dice.\n\nYou have exactly 3 minutes. Tallest standing tower wins.",
    parts: [{ type: "Team", text: "Now join forces.\n\nBuild one tower together from every die you have. You have 2 minutes." }],
  };
  // A live task with one part.
  if (shot.includes("onepart")) tasks.t7 = {
    order: 7, name: "Sock puppet show", type: "Team",
    text: "Make a puppet from one sock and put on a show.\n\nYou have 5 minutes. Best show wins.",
  };
  // Flipchart takes the eighth task's place, so the party still has eight; its clock has 14:30 or so to go in the live shots.
  if (shot.includes("flipchart")) tasks.t8 = { order: 8, game: "flipchart", ...flipchartDefaults() };
  // The task pages' shots of Before & After, [BLANK] in a Box and the light.
  // They take the place of a live task, so the party still has eight.
  if (shot.includes("beforeafter")) tasks.t6 = { order: 6, game: "beforeAfter", text: "Film the most satisfying before and after." };
  if (shot.includes("box")) tasks.t7 = { order: 7, game: "box" };
  if (shot.includes("light")) tasks.t8 = { order: 8, game: "light", results: { sam: 1, priya: 2 } };
  const session: Record<string, unknown> = {
    hostUid: "host", name: "Halloween party",
    players: Object.fromEntries(ids.filter((id) => checkedIn.has(id)).map((id, i) => [id, { name: people[id], joinedAt: i, contestant: id }])),
    scoreboard: { contestants, tasks },
    games: { secretTasks: { pile: env(10) }, prize: { photos: {} }, photos: { media: {} } },
  };
  const g = session.games as Record<string, Record<string, unknown>>;
  const secret: Record<string, unknown> = { assigned: {} };
  const set = (k: string, v: unknown) => { (session as Record<string, unknown>)[k] = v; };
  const task = (name: string) => set("game", name);
  const assigned = secret.assigned as Record<string, string>;
  const picked = () => { assigned[who] = "Hum a tune only you know."; g.secretTasks!.seen = { [who]: true } ; };
  switch (shot) {
    case "home-todo": picked(); delete tasks.t3; break;
    case "home-todo-envelope": delete tasks.t3; break;
    case "home-prize-ask": picked(); break;
    case "home-waiting": picked(); q.set("later", "1"); break;
    case "task-photos": picked(); q.set("later", "1"); task("photos"); g.photos!.task = "t2"; break;
    case "task-photos-sent": picked(); q.set("later", "1"); task("photos"); g.photos!.task = "t2"; (g.photos!.media as Record<string, unknown>)[who] = { photo: pic("👑", "#3a2a1c") }; break;
    case "prize-check": picked(); q.set("pick", "1"); break;
    case "noisemaster-up": picked(); q.set("later", "1"); task("noisemaster"); g.noisemaster = { round: { player: who, phrase: ["I", "am", "the", "Noisemaster"], startedAt: 1 } }; break;
    case "noisemaster-watch": picked(); q.set("later", "1"); task("noisemaster"); g.noisemaster = { round: { player: "alex", phrase: ["I", "am"], startedAt: 1 } }; break;
    // Noisemaster finished: Sam's same go, all four words said and the clock stopped.
    case "tv-noisemaster-done":
      picked(); task("noisemaster"); g.noisemaster = { round: { ...midGo(), progress: 4, mistakes: 2, doneAt: Date.now() - 400, firstAt: Date.now() - 41700, last: { key: "k3", i: 3, ok: true } } }; set("display", { step: "soundboard" }); set("begun", true);
      break;
    // Noisemaster before a go: the host's setup, Sam picked and the phrase and decoys typed in (no sound files).
    case "host-noisemaster-setup": picked(); task("noisemaster"); set("begun", true); break;
    case "tv-noisemaster": case "host-noisemaster": case "host-run":
      picked(); task("noisemaster"); g.noisemaster = { round: midGo() }; set("display", { step: "soundboard" }); set("begun", true);
      break;
    // Secret Tasks: Sam's secret is up on the big screen; on the host's phone, everyone has theirs and Tom hasn't looked yet.
    case "tv-secret": case "tv-secret-sealed":
      picked(); task("secretTasks"); set("display", { step: "envelopes" }); set("begun", true);
      g.secretTasks!.reveal = { order: ["sam", "alex", "greg", "mei", "priya", "tom"], index: 0, ...(shot === "tv-secret" ? { task: "Hum a tune only you know." } : {}), startedAt: 1 };
      break;
    // Secret Tasks as the last task, with the built-in Part 1 and Part 2: the reveal's title card is up (or Part 2 is, on the big screen).
    case "host-secret-title": case "tv-secret-part2": case "host-secret-edit":
      picked(); set("begun", true);
      Object.assign(assigned, SECRETS); secret.seen = Object.fromEntries(Object.keys(people).map((id) => [id, true]));
      Object.assign(tasks.t4 as object, { order: 9, ...DEFAULT_WORDS });
      if (shot !== "host-secret-edit") {
        task("secretTasks");
        set("display", shot === "tv-secret-part2" ? { step: "tasktext", task: "t4", part: 1 } : { step: "envelopes" });
        g.secretTasks!.reveal = { order: ["sam", "alex", "greg", "mei", "priya", "tom"], index: 0, title: true, startedAt: 1 };
      }
      break;
    case "host-secret":
      picked(); task("secretTasks"); set("display", { step: "envelopes" }); set("begun", true);
      Object.assign(assigned, SECRETS); secret.seen = Object.fromEntries(Object.keys(people).filter((id) => id !== "tom").map((id) => [id, true]));
      break;
    // The prize task: Sam's prize, photo 1, is on the big screen; on the host's phone he's presenting and the others have photos in (Mei and Tom not yet).
    case "tv-prize": case "host-prize": case "host-points":
      picked(); task("prize"); set("display", { step: "photo", contestant: "sam", index: 0 }); set("begun", true);
      // No words on the task here, so the host's page is the prizes: who has photos in, and Sam's on the big screen.
      if (shot === "host-prize" || shot === "host-points") delete (tasks.t3 as { text?: string }).text;
      if (shot === "host-points") (tasks.t3 as { scores?: Record<string, number> }).scores = { alex: 3, greg: 4, priya: 5, sam: 5 };
      g.prize = { photos: PRIZE_PHOTOS, presented: { sam: true } };
      break;
    // The scoreboard on the big screen as guests arrive, before any points: Mei and Sam, not in yet, are mosaics.
    case "tv-pixel-arriving": picked(); set("display", { step: "scoreboard" }); break;
    // The scoreboard on the big screen, before and after the host updates it with the prize task's points.
    case "tv-scores-before": case "tv-scores": case "tv-scores-cropped": case "tv-haul": case "host-haul": {
      picked(); set("display", { step: shot.endsWith("haul") ? "haul" : "scoreboard" }); set("begun", true);
      const t1 = { alex: 4, greg: 2, mei: 3, priya: 5, sam: 3, tom: 1 }, t2 = { alex: 5, greg: 3, mei: 2, priya: 2, sam: 4, tom: 3 }, t3 = { alex: 5, greg: 4, mei: 2, priya: 4, sam: 5, tom: 1 };
      Object.assign(tasks.t1 as object, { scores: t1 }); Object.assign(tasks.t2 as object, { scores: t2 }); Object.assign(tasks.t3 as object, { scores: t3 });
      (session.scoreboard as { shown?: unknown }).shown = shot === "tv-scores-before" ? { t1, t2 } : { t1, t2, t3 };
      if (shot.endsWith("haul")) { (session.scoreboard as { final?: boolean }).final = true; g.prize = { photos: PRIZE_PHOTOS, presented: { sam: true, alex: true, greg: true, priya: true } }; }
      break;
    }
    // A task with two parts: on the host's phone with nothing up, with the second part up, and with it on the big screen; and its ✎ page.
    case "host-parts-up": case "tv-parts": set("display", { step: "tasktext", task: "t6", part: 1 }); set("begun", true); break;
    case "host-parts": case "host-parts-edit": set("begun", true); break;
    case "tv-rules": set("display", { step: "rules" }); set("begun", true); break;
    // The host put part 2 on every phone while part 1 is still on the big screen: the two are separate.
    case "host-parts-phones": set("display", { step: "tasktext", task: "t6" }); set("phoneText", { task: "t6", part: 1 }); set("begun", true); break;
    case "task-parts-phone": picked(); q.set("later", "1"); set("phoneText", { task: "t6", part: 1 }); set("begun", true); break;
    // A live task with one part: the same two rows, "The task" in place of Part 1.
    case "host-plan": case "host-plan-crop": case "host-plan-cropped": case "host-crop": case "host-plan-add": case "host-plan-ipad": case "host-plan-edit": case "host-plan-pile": case "host-adhoc": set("begun", true); break;
    case "host-plan-pin": set("hostPin", true); break;
    // Photos: best costume is on, and three entries are in.
    case "host-app-game":
      picked(); task("photos"); g.photos!.task = "t2"; set("begun", true);
      for (const [id, e] of [["alex", "🧛"], ["greg", "🎃"], ["mei", "👻"]]) (g.photos!.media as Record<string, unknown>)[id!] = { photo: pic(e!, "#3a2a1c") };
      break;
    // Up next is a live task that opens with a sting: tasks 1 to 5 scored, the main screen's Transitions list published.
    // The gate after a refresh mid-party, the music folder (Party) already allowed: songs and each transition folder counted.
    case "tv-gate": {
      picked(); set("begun", true); set("controllerUid", "host");
      const dir = { kind: "directory", name: "Party", values: async function* () {}, queryPermission: async () => "granted" };
      if (!("showDirectoryPicker" in window)) (window as unknown as Record<string, unknown>).showDirectoryPicker = () => Promise.resolve(dir);
      const get = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function (this: IDBObjectStore, key: IDBValidKey) {
        if (key !== "musicFolder") return get.call(this, key);
        const req = { result: dir } as unknown as IDBRequest;
        window.setTimeout(() => (req.onsuccess as (() => void) | null)?.());
        return req;
      } as typeof get;
      session.jukebox = {
        tracks: Array.from({ length: 42 }, (_, i) => `Song ${i + 1}`), transitions: ["Drumroll", "Task fanfare", "Whoosh"],
        transitionPictures: ["Dice tower.jpg", "Halloween title.png", "Sock puppets.jpg"], transitionVideos: [], open: true, state: {},
      };
      break;
    }
    case "host-run-transition": case "host-run-transition-missing": case "tv-sting": case "host-sting": case "host-sting-held": case "host-replay": case "host-edit-transition": case "host-edit-transition-try": {
      picked(); set("begun", true);
      const s = { alex: 3, greg: 4, mei: 2, priya: 5, sam: 3, tom: 1 };
      for (const id of ["t1", "t2", "t3", "t4", "t5"]) Object.assign(tasks[id] as object, { scores: s });
      tasks.t6 = { order: 6, name: "Dice tower", description: "Tallest wins. Dice are in the blue tin.", transition: "Task fanfare", transitionImage: "Dice tower.jpg" };
      registerStingPicture("Dice tower.jpg", "/docs/guest-shots/stings/dice-tower.jpg");
      // The host tapped Start: the scores came down and the sting's picture is up.
      if (shot === "tv-sting") set("sting", { task: "t6" });
      // The sting's file was renamed since the task was planned: the picture is there, the music isn't.
      if (shot === "host-run-transition-missing") Object.assign(tasks.t6 as object, { transition: "Fanfare (old)" });
      // On the host's phone, two seconds into the sting: Dice tower's page, the scores down.
      if (shot === "host-sting") { set("sting", { task: "t6", at: Date.now() - 2000 }); set("display", { step: "curtain" }); Object.assign(tasks.t6 as object, { song: "Eye of the Tiger" }); }
      // Long after Start: nothing on, the transition strip waiting on the task's page above its song.
      if (shot === "host-edit-transition-try") set("sting", { task: "t6", at: Date.now() - 2000, draft: { music: "Task fanfare", picture: "Dice tower.jpg" } });
      if (shot === "host-sting-held") { set("sting", { task: "t6", at: Date.now() - 20000, held: true }); set("display", { step: "curtain" }); Object.assign(tasks.t6 as object, { song: "Eye of the Tiger", transition: null, transitionImage: null, transitionVideo: "Spooky intro.mp4" }); }
      if (shot === "host-replay") { set("display", { step: "curtain" }); Object.assign(tasks.t6 as object, { song: "Eye of the Tiger" }); }
      session.jukebox = { tracks: ["Think music", "Eye of the Tiger"], durations: [32, 245], transitions: ["Drumroll", "Task fanfare", "Whoosh"], transitionDurations: [5, 8, 2], transitionPictures: ["Dice tower.jpg", "Halloween title.png", "Sock puppets.jpg"], transitionVideos: ["Drumroll cam.mp4", "Spooky intro.mp4"], transitionVideoDurations: [12, 9], tracksAt: new Date(2026, 9, 21).getTime(), open: true, state: {} };
      break;
    }
    case "host-reset": picked(); set("begun", true); Object.assign(tasks.t1 as object, { scores: { alex: 4, greg: 2, mei: 3, priya: 5, sam: 3, tom: 1 } }); break;
    case "host-onepart": set("begun", true); break;
    // 📏 started from a thing: the Eiffel Tower in Jimothys
    case "host-convert": set("begun", true); break;
    case "tv-convert": set("conversion", { lead: "The Eiffel Tower is", main: "about 2,165 Jimothys", how: "the Ballard raccoon, at the shoulder" }); set("begun", true); break;
    case "host-onepart-up": set("display", { step: "tasktext", task: "t7" }); set("begun", true); break;
    // Flipchart: before the clock starts (words and the front page), mid-drawing (page 7 of Sam's, see below), on the last page asking to send, sent;
    // on the big screen the clock, one finished portrait, and everyone's; on the host's phone before the start and while it runs, and its ✎ page.
    case "task-flipchart-front": case "task-flipchart-drawing": case "task-flipchart-send": case "task-flipchart-sent":
    case "tv-flipchart-clock": case "tv-flipchart-portrait": case "tv-flipchart-everyone": case "tv-flipchart-task":
    case "host-flipchart": case "host-flipchart-live": case "host-flipchart-edit": {
      picked(); q.set("later", "1"); task("flipchart"); set("begun", true);
      const now = Date.now();
      const live = shot.includes("drawing") || shot.includes("send") || shot.includes("sent") || shot.includes("clock") || shot === "host-flipchart-live";
      const over = shot.includes("portrait") || shot.includes("everyone") || shot === "tv-flipchart-task";
      const fc: Record<string, unknown> = {};
      if (live || over) Object.assign(fc, { startedAt: now - 5.5 * 60_000, endsAt: now + 14.5 * 60_000 });
      if (over) Object.assign(fc, { startedAt: now - 20 * 60_000, endsAt: now - 1000, closed: true });
      const drawers = shot.includes("drawing") || shot.includes("send") || shot.includes("sent") ? ["sam"] : over ? Object.keys(people) : [];
      // Mostly in pieces, as at a real party: only Greg followed the front page and Mei forgot to turn the upside-down pages; Sam and Alex
      // drew in reading order, Priya down the columns, and Tom started from 16.
      const reading: Record<string, Reading> = { greg: "pattern", mei: "upright", alex: "reading", sam: "reading", priya: "columns", tom: "backwards" };
      fc.pages = Object.fromEntries(drawers.map((id) => [id, portraitPages(Object.keys(people).indexOf(id), reading[id])]));
      if (shot.includes("sent")) fc.submitted = { sam: true };
      if (over) fc.submitted = Object.fromEntries(drawers.map((id) => [id, true]));
      g.flipchart = fc;
      if (shot === "tv-flipchart-portrait") set("display", { step: "portrait", uid: "sam", settled: true });
      if (shot === "tv-flipchart-everyone") set("display", { step: "portraits" });
      break;
    }
    // The ⏱ clock: set from a task's time limit (Dice tower, part 1 on the big screen), with a song that ends on 0:00, counting, on the task page
    // with its strip, beside Flipchart's own clock; and as a stopwatch (Five socks, Alex timed, Greg going); and on the big screen.
    // The limit shots: part 1's words give no time, so the host set 4 minutes on it in ✎ (open, then closed); ⏱ offers it.
    case "host-cd-limit-edit": case "host-cd-limit-summary": case "host-cd-limit-set":
    case "host-cd-set": case "host-cd-song": case "host-cd-running": case "host-cd-task": case "host-cd-flipchart": case "host-sw-running": case "tv-cd": case "tv-sw": {
      picked(); set("begun", true);
      Object.assign(assigned, SECRETS); secret.seen = Object.fromEntries(Object.keys(people).map((id) => [id, true]));
      const now = Date.now();
      tasks.t6 = {
        order: 6, name: "Dice tower", type: "Individual",
        text: "Build the tallest tower out of dice.\n\nYou have exactly 3 minutes. Tallest standing tower wins.",
        parts: [{ type: "Team", text: "Now join forces.\n\nBuild one tower together from every die you have. You have 2 minutes." }],
      };
      if (shot.startsWith("host-cd-limit")) Object.assign(tasks.t6 as object, { text: "Build the tallest tower out of dice.\n\nYour time starts now. Tallest standing tower wins.", limit: 240_000 });
      tasks.t7 = { order: 7, name: "Five socks", type: "Individual", text: "Put on five socks, a sock at a time, as fast as you can. Fastest wins.", scoring: "lowest", results: { alex: 41.3 } };
      session.jukebox = {
        tracks: ["Think music", "Eye of the Tiger", "Final countdown"], durations: [32, 245, 190], open: true, state: {},
      };
      const stopwatch = shot.includes("-sw");
      if (stopwatch) set("display", { step: "list" });
      else if (shot !== "host-cd-flipchart") set("display", { step: "tasktext", task: "t6", part: 0 });
      if (shot === "host-cd-set") set("clock", { set: 180_000, ms: 180_000, task: "t6" });
      if (shot === "host-cd-limit-set") set("clock", { set: 240_000, ms: 240_000, task: "t6" });
      if (shot === "host-cd-song") set("clock", { set: 180_000, ms: 180_000, task: "t6", song: "Think music" });
      if (shot === "host-cd-running" || shot === "host-cd-task") set("clock", { set: 180_000, ms: 180_000, task: "t6", begun: true, at: now + 167_000 });
      if (shot === "tv-cd") set("clock", { set: 180_000, ms: 180_000, task: "t6", begun: true, at: now + 167_000, shown: true });
      if (stopwatch) set("clock", { mode: "up", ms: 0, task: "t7", begun: true, at: now - 17_300, going: { greg: true }, shown: true });
      if (shot === "host-cd-flipchart") {
        task("flipchart"); tasks.t9 = { order: 9, game: "flipchart", ...flipchartDefaults() };
        g.flipchart = { startedAt: now - 5.5 * 60_000, endsAt: now + 14.5 * 60_000 };
      }
      break;
    }
    // Photos: best costume. Mei's photo on the big screen, everyone's at once, and the host's page with all six in.
    case "tv-photos": case "tv-photos-grid": case "host-photos": {
      picked(); task("photos"); g.photos!.task = "t2"; set("begun", true);
      const costumes: [string, string, string][] = [["alex", "🧛", "#2a1a2a"], ["greg", "🎃", "#3a2410"], ["mei", "🦖", "#1a2a1a"], ["priya", "👻", "#2a2a3a"], ["sam", "🧙", "#2a1a10"], ["tom", "🤖", "#1a2430"]];
      for (const [id, e, bg] of costumes) (g.photos!.media as Record<string, unknown>)[id] = { photo: pic(e, bg) };
      if (shot === "tv-photos") set("display", { step: "photo", uid: "mei" });
      if (shot === "tv-photos-grid") set("display", { step: "grid" });
      if (shot === "host-photos") set("display", { step: "photo", uid: "mei" });
      break;
    }
    // Headshot: Sam's on the big screen, everyone's at once, and the host's page with Sam up.
    case "tv-headshot": case "tv-headshot-grid": case "host-headshot":
      picked(); task("headshots"); set("begun", true);
      set("display", shot === "tv-headshot-grid" ? { step: "grid" } : { step: "photo", contestant: "sam" });
      g.headshots = { shown: { alex: true, greg: true, mei: true, priya: true, sam: true } };
      break;
    // Before & After: Sam's before and after side by side on the big screen, his phone sending them, and the host's page.
    case "tv-beforeafter": case "tv-beforeafter-review": case "task-beforeafter": case "host-beforeafter": {
      picked(); q.set("later", "1"); task("beforeAfter"); set("begun", true);
      const ba: Record<string, unknown> = {};
      for (const [id, b, a] of [["alex", "🧶", "🧣"], ["greg", "🥚", "🍳"], ["priya", "🌱", "🌻"], ["sam", "🍝", "🍽️"]]) ba[id!] = { before: pic(b!, "#2a1a10"), after: pic(a!, "#2a1a10") };
      if (shot === "task-beforeafter") delete ba.sam;
      g.beforeAfter = { media: ba };
      if (shot !== "task-beforeafter") set("display", shot === "tv-beforeafter-review" ? { step: "review" } : { step: "both", uid: "sam" });
      break;
    }
    // [BLANK] in a Box: Alex and Greg, Greg peeked, Alex has to choose; the big screen, both phones and the host's.
    case "tv-box": case "tv-box-open": case "task-box-peek": case "task-box-decide": case "host-box": {
      picked(); q.set("later", "1"); task("box"); set("begun", true);
      const round: Record<string, unknown> = { object: "eggplant", players: { a: "alex", b: "greg" }, peeker: "greg", startedAt: 1 };
      if (shot === "tv-box-open") Object.assign(round, { decision: "swap", revealed: { L: "empty", R: "object" } });
      g.box = { round, played: { alex: true, greg: true } };
      set("display", { step: "boxes" });
      break;
    }
    // The light: the bulb lit on the light computer, and the host's 💡 page with Sam and Priya already got it.
    case "tv-light": case "tv-light-all": case "host-light": case "host-light-change":
      picked(); set("begun", true);
      set("lightUid", "light-pc");
      set("light", { armed: true, trigger: "stop-smiling", litAt: 1, got: { sam: 1, priya: 2 }, camera: { people: 6, each: { "stop-smiling": 2 } } });
      break;
    // The light run by the big screen, set up from the host's 💡 page: not started, the camera and lamp checklist, then ready.
    case "host-light-start": case "host-light-camera": case "host-light-lamp": case "host-light-ready": case "host-light-flash": case "host-light-trouble": case "host-light-trouble-fix":
      picked(); set("begun", true);
      if (shot === "host-light-start") break;
      const trouble = shot.startsWith("host-light-trouble");
      set("lightUid", "owner");
      set("light", {
        onStage: true, trigger: "stop-smiling", ...((shot === "host-light-flash" || trouble) && { armed: true }),
        ...((shot === "host-light-camera" || shot === "host-light-lamp" || shot === "host-light-trouble-fix") && { setup: true }),
        // Mid-game, the lamp dropped: Sam and Priya already got it, as on the light's other shots.
        ...(trouble && { got: { sam: 1, priya: 2 } }),
        camera: shot === "host-light-ready" ? { off: true } : shot === "host-light-flash" || trouble ? { people: 6, each: { "stop-smiling": 1 } } : { people: 1, each: { "stop-smiling": 0 } },
        stage: {
          cameras: [{ id: "c920", label: "Logitech C920" }, { id: "facetime", label: "FaceTime HD Camera" }], cameraId: "c920",
          ...(shot === "host-light-camera" && { heads: [{ x: 0.44, y: 0.22, w: 0.11, h: 0.24, read: true }] }),
          hue: { bridge: "192.168.1.50", lamps: [{ id: "1", name: "Living room", color: true }, { id: "2", name: "Hallway", color: false }, { id: "3", name: "Kitchen strip", color: true }], chosen: { 1: true }, ...(trouble && { error: "Couldn't reach the bridge." }) },
        },
      });
      break;
    case "checkin-rules": case "checkin-pile": case "checkin-house-rules": break;
    case "checkin-confirm": case "checkin-headshot": case "checkin-list": break;
  }
  return { session, secret };
}

const { session, secret } = build();
if (shot.startsWith("host-")) { (session as Record<string, unknown>).controllerUid = "host"; (session as Record<string, unknown>).hostUid = "owner"; }
// On the noisemaster host page everyone has their secret task, and has looked, so the ✉ has no dot.
if (shot.startsWith("host-parts") || shot.startsWith("host-onepart") || shot.startsWith("host-plan") || shot === "host-crop" || shot === "host-app-game" || shot === "host-adhoc" || shot === "host-reset" || shot.startsWith("host-flipchart") || shot === "host-noisemaster" || shot === "host-noisemaster-setup" || shot === "host-prize" || shot === "host-points" || shot === "host-run" || shot === "host-haul" || ["host-photos", "host-headshot", "host-beforeafter", "host-box"].includes(shot) || shot.startsWith("host-light")) { Object.assign(secret.assigned as object, SECRETS); secret.seen = Object.fromEntries(Object.keys(people).map((id) => [id, true])); }
// Loading the pile before the night: nobody has an envelope yet, and the pile holds the six that get picked plus four more.
if (shot === "host-plan-pile") {
  secret.assigned = {}; secret.seen = {};
  const more = ["Wear your jacket inside out and wait for someone to notice.", "Compliment the host's shoes three times.", "Get everyone to clink glasses with you.", "Start a slow clap and see who joins in."];
  secret.pool = Object.fromEntries([...Object.values(SECRETS), ...more].map((t, i) => [`s${i}`, t]));
}
(window as unknown as { __uid: string }).__uid = who;
const joined = shot !== "checkin-list" && shot !== "join-code";
localStorage.clear();
if (shot.includes("drawing")) localStorage.setItem(`ba.flipchart.page.${CODE}`, "7");
if (shot.includes("send")) localStorage.setItem(`ba.flipchart.page.${CODE}`, "16");
if (q.get("later")) localStorage.setItem(`ba.prizeLater.${CODE}`, "1");
if (joined) localStorage.setItem("ba.playCode", CODE);
if (joined && shot.startsWith("checkin")) {
  localStorage.setItem("ba.checkin", JSON.stringify({ code: CODE, confirmed: true, rules: shot === "checkin-house-rules", headshot: shot === "checkin-headshot", envelope: true }));
  (session.players as Record<string, unknown>)[who] = { name: people[who], joinedAt: 9, contestant: who };
  (session.scoreboard as { contestants: Record<string, { uid?: string }> }).contestants[who]!.uid = who;
}
if (shot === "checkin-list" || shot === "checkin-confirm") localStorage.setItem("ba.playCode", shot === "checkin-list" ? "" : "");
if (shot.startsWith("host-")) { localStorage.setItem("ba.remoteCode", CODE); localStorage.setItem("ba.hostTab", JSON.stringify(shot === "host-run" || shot === "host-run-transition" || shot === "host-run-transition-missing" || shot === "host-haul" || shot === "host-arrivals" || shot === "host-reset" ? { view: "show" } : shot === "host-app-game" ? { view: "task", task: "t2" } : shot === "host-sting" || shot === "host-sting-held" || shot === "host-replay" ? { view: "task", task: "t6" } : shot === "host-edit-transition" || shot === "host-edit-transition-try" ? { view: "edit", task: "t6" } : shot === "host-adhoc" ? { view: "task", task: "adhoc" } : shot === "host-secret" ? { view: "tasks" } : shot === "host-secret-title" ? { view: "task", task: "t4" } : shot === "host-secret-edit" ? { view: "edit", task: "t4" } : shot === "host-flipchart-edit" ? { view: "edit", task: "t8" } : shot.startsWith("host-flipchart") ? { view: "task", task: "t8" } : shot === "host-parts-edit" ? { view: "edit", task: "t6" } : shot.startsWith("host-parts") ? { view: "task", task: "t6" } : shot.startsWith("host-onepart") ? { view: "task", task: "t7" } : shot === "host-plan-edit" ? { view: "edit", task: "t8" } : shot.startsWith("host-plan") ? { view: "plan" } : shot === "host-crop" ? { view: "crop", contestant: "greg" } : shot === "host-prize" || shot === "host-points" ? { view: "task", task: "t3" } : shot === "host-photos" ? { view: "task", task: "t2" } : shot === "host-headshot" ? { view: "task", task: "t1" } : shot === "host-beforeafter" ? { view: "task", task: "t6" } : shot === "host-box" ? { view: "task", task: "t7" } : shot === "host-light-flash" ? { view: "show" } : shot.startsWith("host-light") ? { view: "light" } : { view: "task", task: "t5" })); }
// The ⏱ clock's shots open on ⏱ (the task page for one), with the task they came from behind it.
if (/^host-(cd|sw)-/.test(shot)) {
  localStorage.setItem("ba.hostTab", JSON.stringify(shot === "host-cd-task" ? { view: "task", task: "t6" } : shot === "host-cd-limit-edit" || shot === "host-cd-limit-summary" ? { view: "edit", task: "t6" } : { view: "clock" }));
  localStorage.setItem("ba.hostBack", JSON.stringify({ view: "task", task: shot.startsWith("host-sw") ? "t7" : shot === "host-cd-flipchart" ? "t9" : "t6" }));
}
// 📏 on its own at /convert, in US units; the host remote's start page, with the party in its recent list.
if (shot === "alone-convert") localStorage.setItem("ba.convertSystem", "imperial");
if (shot.startsWith("start-host")) localStorage.setItem("ba.recentRemote", JSON.stringify([{ code: CODE, at: Date.now() - 2 * 86400000, name: "Halloween party" }]));
// The iPad at home after the host's iPhone took the remote, in the car, with the pin.
if (shot === "start-host-taken") localStorage.setItem("ba.remoteTakenOver", JSON.stringify({ code: CODE, name: "Halloween party" }));
seed({ ...(shot === "host-plan-pin" ? { pins: { [CODE]: "4821" } } : {}), sessions: { [CODE]: session }, secretTasks: { [CODE]: secret }, noisemasterSecrets: { [CODE]: { board: BOARD } }, boxSecrets: { [CODE]: { inBox: "R" } } });
if (shot === "checkin-list" || shot === "checkin-confirm") history.replaceState(null, "", `?code=${CODE}&shot=${shot}`);

const root = createRoot(document.getElementById("root")!);
// For the reveal: checks a guest in on the big screen, so the shot can catch their face sharpening.
(window as unknown as { checkIn: (id: string) => void }).checkIn = (id) => {
  ((session.scoreboard as { contestants: Record<string, { uid?: string }> }).contestants[id]!).uid = id;
  (session.players as Record<string, unknown>)[id] = { name: people[id], joinedAt: 9, contestant: id };
  root.render(<Screen code={CODE} session={structuredClone(session) as unknown as Session} viewOnly />);
};
// "All at once": every trigger's bulb in its own colour, two of them just gone on.
const allBulbs = MODES.find((m) => m.id === "all")!.bulbs;
// The 💡 pulse: a flash a moment after the page is up (one already there when it opens is old).
if (shot === "host-light-flash") window.setTimeout(() => void lightNow(CODE), 1200);
root.render(shot === "tv-light" ? <main className="stage light-stage"><div className="light-show"><Bulb lit /></div></main> :
  shot === "tv-light-all" ? <main className="stage light-stage"><div className="light-show"><div className="light-bulbs" style={{ gridTemplateColumns: "repeat(3, auto)" }}>
    {allBulbs.map((b) => <Bulb key={b.trigger.id} lit={b.trigger.id === "stop-smiling" || b.trigger.id === "arm-up"} colour={b.colour} />)}</div></div></main> : shot === "tv-gate" ? <StageGate code={CODE} session={session as unknown as Session} onRaised={() => {}} onEnd={() => {}} /> : shot.startsWith("tv-") ? <Screen code={CODE} session={session as unknown as Session} viewOnly /> : shot.startsWith("host-") || shot.startsWith("start-host") ? <HostPage /> :
  shot === "alone-convert" ? <ConverterPage /> : <Play />);
