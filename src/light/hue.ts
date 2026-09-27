import { store } from "../session";

/*
 * A real Philips Hue lamp that goes on and off with the light bulb on the screen. The main screen talks
 * straight to the Hue Bridge on the local network (its v1 REST API). The bridge's key is a password to
 * the house's lights, so it stays in this browser's storage and never goes into the session.
 */

export interface HueLight { id: string; name: string; color: boolean }
export interface HueConfig {
  host: string;
  /** The bridge answers on https (a certificate the browser has to be told to trust) and on http. */
  scheme: "https" | "http";
  username: string;
  /** The lamps that flash; colour lamps flash red, like the original. */
  lights: HueLight[];
}

const KEY = "ba.hue";

export function loadHue(): HueConfig | undefined {
  try { return (JSON.parse(store.get(KEY)) as HueConfig) || undefined; } catch { return undefined; }
}
export const saveHue = (config: HueConfig | undefined) => store.set(KEY, config ? JSON.stringify(config) : "");

export class HueError extends Error {}

async function call<T>(bridge: { scheme: string; host: string }, path: string, method = "GET", body?: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${bridge.scheme}://${bridge.host}/api${path}`, { method, body: body && JSON.stringify(body) });
  } catch {
    throw new HueError("Couldn't reach the bridge.");
  }
  const data = (await res.json().catch(() => undefined)) as T | undefined;
  if (!res.ok || data === undefined) throw new HueError(`The bridge answered with an error (${res.status}).`);
  // The bridge reports problems inside a 200 response: [{ error: { type, description } }].
  const first = Array.isArray(data) ? (data[0] as { error?: { type: number; description: string } } | undefined) : undefined;
  if (first?.error) throw new HueError(first.error.type === 101 ? "The bridge's button wasn't pressed." : `Bridge: ${first.error.description}.`);
  return data;
}

/** Bridges on this network, from Philips' discovery service (it matches them by your internet address). */
export async function findBridges(): Promise<string[]> {
  try {
    const res = await fetch("https://discovery.meethue.com/");
    const found = (await res.json()) as { internalipaddress?: string }[];
    return found.map((b) => b.internalipaddress).filter((ip): ip is string => !!ip);
  } catch {
    return [];
  }
}

/** Which way the browser can talk to the bridge (https first); throws if neither works. */
export async function reach(host: string): Promise<HueConfig["scheme"]> {
  for (const scheme of ["https", "http"] as const) {
    try { await call({ scheme, host }, "/config"); return scheme; } catch { /* try the next */ }
  }
  throw new HueError("Couldn't reach the bridge.");
}

/** Asks the bridge for a key. Works for 30 seconds after its round button is pressed. */
export async function pair(host: string, scheme: HueConfig["scheme"]): Promise<string> {
  const res = await call<{ success?: { username?: string } }[]>({ scheme, host }, "", "POST", { devicetype: "tm_party_games#main_screen" });
  const username = res[0]?.success?.username;
  if (!username) throw new HueError("The bridge didn't hand over a key.");
  return username;
}

export async function listLights(bridge: Omit<HueConfig, "lights">): Promise<HueLight[]> {
  const lights = await call<Record<string, { name: string; type?: string; state?: { xy?: number[] } }>>(bridge, `/${bridge.username}/lights`);
  return Object.entries(lights)
    .map(([id, l]) => ({ id, name: l.name, color: !!l.state?.xy || /color/i.test(l.type ?? "") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** How a lamp was before a flash, so it can go back to exactly that. */
export interface LampState {
  on: boolean;
  bri?: number;
  /** Which of the colour settings below the lamp was using (absent on white-only lamps). */
  colormode?: "xy" | "ct" | "hs";
  xy?: [number, number];
  ct?: number;
  hue?: number;
  sat?: number;
}

/** The lamps' red (in Hue's colour space). */
const RED: [number, number] = [0.675, 0.322];

/** Reads how each lamp is right now (on or off, brightness, colour), by lamp id. */
export async function readLamps(config: HueConfig): Promise<Record<string, LampState>> {
  const states = await Promise.all(config.lights.map((l) =>
    call<{ state: LampState }>(config, `/${config.username}/lights/${l.id}`).then((r) => [l.id, r.state] as const)));
  return Object.fromEntries(states);
}

/** Switches the lamps on: full brightness, instantly, red on colour lamps. */
export async function lampsOn(config: HueConfig) {
  await Promise.all(config.lights.map((l) =>
    call(config, `/${config.username}/lights/${l.id}/state`, "PUT", { on: true, bri: 254, transitiontime: 0, ...(l.color ? { xy: RED } : {}) })));
}

/** Puts the lamps back exactly as `readLamps` found them (off, or on at the same brightness and colour). */
export async function restoreLamps(config: HueConfig, saved: Record<string, LampState>) {
  await Promise.all(config.lights.map((l) => {
    const was = saved[l.id];
    if (!was) return undefined;
    const colour = was.colormode === "ct" ? { ct: was.ct } : was.colormode === "hs" ? { hue: was.hue, sat: was.sat } : was.colormode === "xy" ? { xy: was.xy } : {};
    const state = `/${config.username}/lights/${l.id}/state`;
    if (was.on) return call(config, state, "PUT", { on: true, bri: was.bri, transitiontime: 0, ...colour });
    // It was off: put its brightness and colour back while it's still on (a lamp that's off won't take them),
    // then switch it off, so it comes on as before next time.
    return call(config, state, "PUT", { bri: was.bri, transitiontime: 0, ...colour })
      .then(() => call(config, state, "PUT", { on: false, transitiontime: 0 }));
  }));
}
