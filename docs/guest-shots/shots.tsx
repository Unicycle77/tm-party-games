// Draws the guest phone's screens (and the TV's welcome beside them) from the real components over an in-memory party (see fake-database.ts).
// Usage: npx vite --config docs/guest-shots/vite.config.ts, then node docs/guest-shots/shoot.mjs
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { Play } from "../../src/Play";
import { HostPage } from "../../src/HostPage";
import { Screen } from "../../src/Screen";
import type { Session } from "../../src/types";
import { seed } from "./fake-database";

const CODE = "ABCD";
const q = new URLSearchParams(location.search);
const shot = q.get("shot") ?? "home-waiting";
const who = shot.startsWith("host-") ? "host" : q.get("who") ?? "sam";
// The check-in shots and the TV's welcome are one moment of one party: everyone but Sam is already in, and he's the last to check in.
// Noisemaster mid-go: Sam has said "I am" of "I am the Noisemaster", on the board the host set up.
const BOARD = ["cheese", "I", "banana", "Noisemaster", "wobble", "am", "Greg", "sausage", "the", "trumpet", "Alex", "moist", "duck", "hello", "spoon", "yes"];
const SECRETS: Record<string, string> = { alex: "Get three people to high-five you without explaining why.", greg: "Say the word moist in every sentence for ten minutes.", mei: "Get a guest to hold your drink while you tie your shoe.", priya: "Convince someone you have met before.", sam: "Hum a tune only you know.", tom: "Leave mid-sentence and come back with a snack." };
const midGo = () => ({ player: "sam", phrase: ["I", "am", "the", "Noisemaster"], startedAt: 1, progress: 2, mistakes: 1, firstAt: Date.now() - 23400, last: { key: "k1", i: 5, ok: true } });
const arriving = shot.startsWith("checkin") || shot === "tv-welcome";

// Alex and Greg are always guests, as a nod to the show.
const people: Record<string, string> = { alex: "Alex", greg: "Greg", mei: "Mei", priya: "Priya", sam: "Sam", tom: "Tom" };
const face = (c: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125"><rect width="100" height="125" fill="#1a0f08"/><circle cx="50" cy="48" r="22" fill="${c}"/><path d="M8 125 C12 88 32 78 50 78 C68 78 88 88 92 125 Z" fill="${c}"/></svg>`)}`;
const pic = (e: string, bg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><rect width="120" height="90" fill="${bg}"/><text x="60" y="58" font-size="40" text-anchor="middle">${e}</text></svg>`)}`;
// Prize photos as stand-in pictures: an emoji on a cream card, 4:3, so the frame on the big screen hangs them as photos.
const prizePic = (e: string, bg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="${bg}"/><rect x="170" y="70" width="460" height="460" rx="8" fill="#f3ead7"/><text x="400" y="400" font-size="300" text-anchor="middle">${e}</text></svg>`)}`;
const PRIZE_PHOTOS: Record<string, string[]> = {
  sam: [prizePic("🍑", "#8a6a45"), prizePic("🥕", "#a98660"), prizePic("🐱", "#7d8f6f")],
  priya: [prizePic("🎺", "#6b4a2a"), prizePic("🧦", "#3d4a5a")],
  alex: [prizePic("🥒", "#5f7a4f")],
  greg: [prizePic("🦆", "#8a6a45")],
};
const PRIZE = "The most surprising quite-big thing you can conceal on your person";
const HEAD = "The most unjustifiably-confident headshot";

// Where the envelopes fall: the same spread as the real pile (secretTasks/data.ts), from a fixed seed so shots repeat.
const env = (n: number) => {
  let a = 20261018;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 2 ** 32; };
  return Object.fromEntries(Array.from({ length: n }, (_, i) => [`e${i}`, { x: 6 + rnd() * 78, y: 4 + rnd() * 76, r: Math.round(rnd() * 70 - 35) }]));
};

function build() {
  const ids = Object.keys(people);
  const checkedIn = new Set(arriving ? ids.filter((id) => id !== "sam") : ids);
  const contestants = Object.fromEntries(ids.map((id, i) => [id, {
    name: people[id], order: i,
    ...(!(shot === "checkin-headshot" && id === who) && id !== "tom" ? { photo: face("#6b5a44") } : {}),
    ...(checkedIn.has(id) && !arriving ? { uid: id } : {}),
  }]));
  if (arriving) for (const id of checkedIn) contestants[id]!.uid = id;
  const tasks: Record<string, unknown> = {
    t1: { order: 1, game: "headshots", text: HEAD },
    t2: { order: 2, game: "photos", name: "best costume", text: "Take a photo of the best costume in the room that isn't yours." },
    t3: { order: 3, game: "prize", text: PRIZE },
    t4: { order: 4, game: "secretTasks" },
    t5: { order: 5, game: "noisemaster" },
  };
  for (let i = 6; i <= 8; i++) tasks[`t${i}`] = { order: i, name: `Live task ${i}` };
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
    case "tv-noisemaster": case "host-noisemaster":
      picked(); task("noisemaster"); g.noisemaster = { round: midGo() }; set("display", { step: "soundboard" }); set("begun", true);
      break;
    // Secret Tasks: Sam's secret is up on the big screen; on the host's phone, everyone has theirs and Tom hasn't looked yet.
    case "tv-secret":
      picked(); task("secretTasks"); set("display", { step: "envelopes" }); set("begun", true);
      g.secretTasks!.reveal = { order: ["sam", "alex", "greg", "mei", "priya", "tom"], index: 0, task: "Hum a tune only you know.", startedAt: 1 };
      break;
    case "host-secret":
      picked(); task("secretTasks"); set("display", { step: "envelopes" }); set("begun", true);
      Object.assign(assigned, SECRETS); secret.seen = Object.fromEntries(Object.keys(people).filter((id) => id !== "tom").map((id) => [id, true]));
      break;
    // The prize task: Sam's prize, photo 2, is on the big screen; on the host's phone he's presenting and the others have photos in (Mei and Tom not yet).
    case "tv-prize": case "host-prize":
      picked(); task("prize"); set("display", { step: "photo", contestant: "sam", index: 1 }); set("begun", true);
      // No words on the task here, so the host's page is the prizes: who has photos in, and Sam's on the big screen.
      if (shot === "host-prize") delete (tasks.t3 as { text?: string }).text;
      g.prize = { photos: PRIZE_PHOTOS, presented: { sam: true } };
      break;
    case "checkin-rules": case "checkin-pile": break;
    case "checkin-confirm": case "checkin-headshot": case "checkin-list": break;
  }
  return { session, secret };
}

const { session, secret } = build();
if (shot.startsWith("host-")) { (session as Record<string, unknown>).controllerUid = "host"; (session as Record<string, unknown>).hostUid = "owner"; }
// On the noisemaster host page everyone has their secret task, and has looked, so the ✉ has no dot.
if (shot === "host-noisemaster" || shot === "host-prize") { Object.assign(secret.assigned as object, SECRETS); secret.seen = Object.fromEntries(Object.keys(people).map((id) => [id, true])); }
(window as unknown as { __uid: string }).__uid = who;
const joined = shot !== "checkin-list";
localStorage.clear();
if (q.get("later")) localStorage.setItem(`ba.prizeLater.${CODE}`, "1");
if (joined) localStorage.setItem("ba.playCode", CODE);
if (joined && shot.startsWith("checkin")) {
  localStorage.setItem("ba.checkin", JSON.stringify({ code: CODE, confirmed: true, headshot: shot === "checkin-headshot", envelope: true }));
  (session.players as Record<string, unknown>)[who] = { name: people[who], joinedAt: 9, contestant: who };
  (session.scoreboard as { contestants: Record<string, { uid?: string }> }).contestants[who]!.uid = who;
}
if (shot === "checkin-list" || shot === "checkin-confirm") localStorage.setItem("ba.playCode", shot === "checkin-list" ? "" : "");
if (shot.startsWith("host-")) { localStorage.setItem("ba.remoteCode", CODE); localStorage.setItem("ba.hostTab", JSON.stringify(shot === "host-secret" ? { view: "tasks" } : shot === "host-prize" ? { view: "task", task: "t3" } : { view: "task", task: "t5" })); }
seed({ sessions: { [CODE]: session }, secretTasks: { [CODE]: secret }, noisemasterSecrets: { [CODE]: { board: BOARD } } });
if (shot === "checkin-list" || shot === "checkin-confirm") history.replaceState(null, "", `?code=${CODE}&shot=${shot}`);

createRoot(document.getElementById("root")!).render(shot.startsWith("tv-") ? <Screen code={CODE} session={session as unknown as Session} viewOnly /> : shot.startsWith("host-") ? <HostPage /> : <Play />);
