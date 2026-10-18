// Draws the guest phone's screens from the real components over an in-memory party (see fake-database.ts).
// Usage: npx vite --config docs/guest-shots/vite.config.ts, then node docs/guest-shots/shoot.mjs
import { createRoot } from "react-dom/client";
import "../../src/styles.css";
import { Play } from "../../src/Play";
import { seed } from "./fake-database";

const CODE = "HVQB";
const q = new URLSearchParams(location.search);
const shot = q.get("shot") ?? "home-waiting";
const who = q.get("who") ?? "sam";

const people: Record<string, string> = { alex: "Alex", jordan: "Jordan", mei: "Mei", priya: "Priya", sam: "Sam", tom: "Tom" };
const face = (c: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125"><rect width="100" height="125" fill="#1a0f08"/><circle cx="50" cy="48" r="22" fill="${c}"/><path d="M8 125 C12 88 32 78 50 78 C68 78 88 88 92 125 Z" fill="${c}"/></svg>`)}`;
const pic = (e: string, bg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><rect width="120" height="90" fill="${bg}"/><text x="60" y="58" font-size="40" text-anchor="middle">${e}</text></svg>`)}`;
const PRIZE = "The most surprising quite-big thing you can conceal on your person";
const HEAD = "The most unjustifiably-confident headshot";

const env = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`e${i}`, { x: 4 + (i % 3) * 30, y: 4 + Math.floor(i / 3) * 30, r: ((i * 37) % 21) - 10 }]));

function build() {
  const ids = Object.keys(people);
  const checkedIn = new Set(shot.startsWith("checkin") ? ["priya", "tom"] : ids);
  const contestants = Object.fromEntries(ids.map((id, i) => [id, {
    name: people[id], order: i,
    ...(!(shot === "checkin-headshot" && id === who) && id !== "tom" ? { photo: face("#6b5a44") } : {}),
    ...(checkedIn.has(id) && !shot.startsWith("checkin") ? { uid: id } : {}),
  }]));
  if (shot.startsWith("checkin")) { contestants.priya!.uid = "priya"; contestants.tom!.uid = "tom"; }
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
    case "checkin-rules": case "checkin-pile": break;
    case "checkin-confirm": case "checkin-headshot": case "checkin-list": break;
  }
  return { session, secret };
}

const { session, secret } = build();
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
seed({ sessions: { [CODE]: session }, secretTasks: { [CODE]: secret } });
if (shot === "checkin-list" || shot === "checkin-confirm") history.replaceState(null, "", `?code=${CODE}&shot=${shot}`);

createRoot(document.getElementById("root")!).render(<Play />);
