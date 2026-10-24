// The light run by the main screen, set up from the host phone, both on one page over the in-memory database,
// with a pretend Hue Bridge answering at 192.168.1.50. Driven by light-test.mjs.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { get, onValue, ref, seed, set } from "firebase/database";
import "../../src/styles.css";
import { db } from "../../src/firebase";
import { HostPage } from "../../src/HostPage";
import { StageLight } from "../../src/light/StageLight";
import { lightNow, releaseLight } from "../../src/light/data";
import type { Session } from "../../src/types";

const CODE = "ABCD";
(window as unknown as { __uid: string }).__uid = "tv";

// The pretend bridge: every lamp change is logged, so the test can see the flash.
const hueLog: { method: string; path: string; body?: unknown }[] = [];
// The bridge unplugged mid-party.
const bridge = { down: false };
const real = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { "Content-Type": "application/json" } });
  if (url === "https://discovery.meethue.com/") return json([{ id: "b1", internalipaddress: "192.168.1.50" }]);
  const m = url.match(/^https:\/\/192\.168\.1\.50\/api(.*)$/);
  if (!m) return real(input, init);
  if (bridge.down) throw new TypeError("Failed to fetch");
  const path = m[1]!;
  const method = init?.method ?? "GET";
  hueLog.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
  if (path === "/config") return json({ name: "Hue Bridge" });
  if (path === "" && method === "POST") return json([{ success: { username: "secret-key" } }]);
  if (path === "/secret-key/lights") return json({ 1: { name: "Living room", state: { xy: [0.3, 0.3] } }, 2: { name: "Hallway", state: {} } });
  if (/^\/secret-key\/lights\/\d+$/.test(path)) return json({ state: { on: false } });
  return json([{ success: {} }]);
};

function Both() {
  const [session, setSession] = useState<Session>();
  useEffect(() => onValue(ref(db(), `sessions/${CODE}`), (s) => setSession(s.val() as Session)), []);
  return (
    <div style={{ display: "flex", alignItems: "start" }}>
      <div id="tv" style={{ width: 400 }}>{session && <StageLight code={CODE} session={session} />}</div>
      <div id="phone" style={{ width: 390 }}><HostPage /></div>
    </div>
  );
}

Object.assign(window, {
  t: {
    // The main screen reloading with the light started: its slot gone, the rest as it was.
    restart: (light: unknown) => set(ref(db(), `sessions/${CODE}/light`), light),
    read: async (path: string) => (await get(ref(db(), path))).val(),
    flash: () => lightNow(CODE),
    stop: () => releaseLight(CODE),
    hueLog,
    bridgeDown: (down: boolean) => { bridge.down = down; },
  },
});
// The party, there before the phone looks for it (Alex, Greg, Priya, Sam and Tom are in).
const people = Object.fromEntries(["Alex", "Greg", "Priya", "Sam", "Tom"].map((name, i) => [name.toLowerCase(), { name, order: i, uid: name.toLowerCase() }]));
seed({ sessions: { [CODE]: { hostUid: "tv", controllerUid: "tv", begun: true, display: { step: "curtain" }, scoreboard: { contestants: people } } } });
localStorage.setItem("ba.remoteCode", CODE);
localStorage.setItem("ba.hostTab", JSON.stringify({ view: "light" }));
localStorage.removeItem("ba.hue");
createRoot(document.getElementById("root")!).render(<Both />);
