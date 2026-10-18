// An in-memory stand-in for firebase/database, so the guest screens can be drawn from the real components
// without a live party. Seeded from `window.__seed` (see shots.tsx); writes update it and its listeners.
type Tree = Record<string, unknown>;
type Listener = { path: string; cb: (s: Snapshot) => void };

const data: { root: Tree } = { root: {} };
const listeners = new Set<Listener>();

export function seed(tree: Tree) { data.root = structuredClone(tree); fire(); }

const parts = (path: string) => path.split("/").filter(Boolean);
function read(path: string): unknown {
  let at: unknown = data.root;
  for (const p of parts(path)) at = at && typeof at === "object" ? (at as Tree)[p] : undefined;
  return at ?? null;
}
function write(path: string, value: unknown) {
  const ps = parts(path);
  if (!ps.length) { data.root = (value as Tree) ?? {}; return; }
  let at = data.root;
  for (const p of ps.slice(0, -1)) at = (at[p] && typeof at[p] === "object" ? at[p] : (at[p] = {})) as Tree;
  if (value === null || value === undefined) delete at[ps.at(-1)!]; else at[ps.at(-1)!] = value;
}

class Snapshot {
  constructor(readonly key: string | null, private readonly value: unknown) {}
  exists() { return this.value !== null && this.value !== undefined; }
  val() { return this.value === undefined ? null : structuredClone(this.value); }
  forEach(cb: (s: Snapshot) => void) { Object.entries((this.value as Tree) ?? {}).forEach(([k, v]) => cb(new Snapshot(k, v))); }
}
function fire() { for (const l of listeners) l.cb(new Snapshot(parts(l.path).at(-1) ?? null, read(l.path))); }

export interface Ref { path: string; key: string | null }
export const getDatabase = () => ({});
export const ref = (_db: unknown, path = ""): Ref => ({ path, key: parts(path).at(-1) ?? null });
export const child = (r: Ref, path: string) => ref(null, `${r.path}/${path}`);
export function onValue(r: Ref, cb: (s: Snapshot) => void) {
  const l = { path: r.path, cb };
  listeners.add(l);
  queueMicrotask(() => cb(new Snapshot(r.key, read(r.path))));
  return () => listeners.delete(l);
}
export const onChildAdded = () => () => {};
export const get = async (r: Ref) => new Snapshot(r.key, read(r.path));
export const set = async (r: Ref, v: unknown) => { write(r.path, v); fire(); };
export const remove = async (r: Ref) => { write(r.path, null); fire(); };
export async function update(r: Ref, values: Tree) {
  for (const [k, v] of Object.entries(values)) write(`${r.path}/${k}`, v);
  fire();
}
let n = 0;
export function push(r: Ref, v?: unknown) {
  const key = `k${Date.now().toString(36)}${n++}`;
  const at = ref(null, `${r.path}/${key}`);
  if (v !== undefined) void set(at, v);
  return Object.assign(Promise.resolve(at), at);
}
export async function runTransaction(r: Ref, fn: (v: unknown) => unknown) {
  const v = fn(read(r.path));
  if (v !== undefined) { write(r.path, v); fire(); }
  return { committed: v !== undefined, snapshot: new Snapshot(r.key, read(r.path)) };
}
export const serverTimestamp = () => Date.now();
export const onDisconnect = () => ({ remove: async () => {}, set: async () => {}, update: async () => {}, cancel: async () => {} });
