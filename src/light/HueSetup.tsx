import { useEffect, useRef, useState } from "react";
import { HueError, type HueConfig, type HueLight, type LampState, findBridges, lampsOn, listLights, pair, reach, readLamps, restoreLamps, saveHue } from "./hue";

/**
 * Keeps the Hue lamps in step with the light: when it goes on, remembers how each lamp was and turns it
 * on (red); when it goes off, puts each lamp back as it was. Otherwise the lamps are left alone.
 * Returns what went wrong last, if anything.
 */
export function useHueLamps(config: HueConfig | undefined, lit: boolean): string | undefined {
  const [error, setError] = useState<string>();
  const saved = useRef<Record<string, LampState>>();
  // One command at a time, in order, so a restore never overtakes the flash it belongs to.
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    if (!config?.lights.length) { setError(undefined); return; }
    const job = lit
      ? async () => { saved.current = await readLamps(config); await lampsOn(config); }
      : async () => { if (!saved.current) return; const was = saved.current; saved.current = undefined; await restoreLamps(config, was); };
    queue.current = queue.current.then(job).then(() => setError(undefined), (e: unknown) => setError(e instanceof HueError ? e.message : "The Hue lamp didn't respond."));
  }, [config, lit]);
  return error;
}

/**
 * The /light page: connects a Hue Bridge and picks the lamps, once per computer. Steps: find the bridge,
 * press its button and connect, then pick lamps. `onChange` hears the new setup (undefined = none).
 */
export function HueSetup({ config, onChange, onClose }: {
  config: HueConfig | undefined; onChange: (config: HueConfig | undefined) => void; onClose: () => void;
}) {
  const [host, setHost] = useState(config?.host ?? "");
  const [found, setFound] = useState<string[]>();
  const [scheme, setScheme] = useState(config?.scheme);
  const [username, setUsername] = useState(config?.username);
  const [lights, setLights] = useState<HueLight[]>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  const bridge = scheme && username ? { host, scheme, username } : undefined;
  const chosen = config?.lights ?? [];
  const update = (next: HueConfig | undefined) => { saveHue(next); onChange(next); };

  // Once connected, list the lamps.
  useEffect(() => {
    if (!bridge) return;
    listLights(bridge).then(setLights, (e: unknown) => setError(message(e)));
  }, [bridge?.host, bridge?.scheme, bridge?.username]);

  async function run(label: string, job: () => Promise<void>) {
    setBusy(label);
    setError(undefined);
    try { await job(); } catch (e) { setError(message(e)); } finally { setBusy(undefined); }
  }

  const find = () => run("Looking…", async () => {
    const ips = await findBridges();
    setFound(ips);
    if (ips.length === 1) setHost(ips[0]!);
    if (!ips.length) throw new HueError("No bridge found. Type its address instead (it's in the Hue app under Settings → Bridges).");
  });

  const connect = () => run("Connecting…", async () => {
    const how = await reach(host.trim());
    const key = await pair(host.trim(), how);
    setHost(host.trim());
    setScheme(how);
    setUsername(key);
    update({ host: host.trim(), scheme: how, username: key, lights: [] });
  });

  const toggle = (light: HueLight) => {
    if (!bridge) return;
    const on = chosen.some((l) => l.id === light.id);
    update({ ...bridge, lights: on ? chosen.filter((l) => l.id !== light.id) : [...chosen, light] });
  };

  const test = () => run("Flashing…", async () => {
    if (!config) return;
    const was = await readLamps(config);
    await lampsOn(config);
    await new Promise((r) => window.setTimeout(r, 1000));
    await restoreLamps(config, was);
  });

  const forget = () => {
    if (!confirm("Forget this Hue Bridge? You'd need to press its button again to reconnect.")) return;
    update(undefined);
    setScheme(undefined);
    setUsername(undefined);
    setLights(undefined);
  };

  return (
    <div className="start-overlay" onClick={onClose}>
      <section className="slot hue-setup" onClick={(e) => e.stopPropagation()}>
        <h2>💡 Hue lamp</h2>
        <p className="slot-hint">A real Philips Hue lamp can flash with the light. Afterwards it goes back to exactly how it was: off, or on at the same brightness and colour.</p>

        {!bridge ? (
          <>
            <label>
              1. The Hue Bridge's address
              <div className="row">
                <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.50" inputMode="decimal" />
                <button disabled={!!busy} onClick={() => void find()}>Find it</button>
              </div>
            </label>
            {found && found.length > 1 && (
              <div className="steps two">
                {found.map((ip) => <button key={ip} className={ip === host ? "step active" : "step"} onClick={() => setHost(ip)}>{ip}</button>)}
              </div>
            )}
            <p className="slot-hint">2. Press the round button on top of the bridge, then within 30 seconds:</p>
            <button className="big" disabled={!host.trim() || !!busy} onClick={() => void connect()}>{busy ?? "Connect"}</button>
          </>
        ) : (
          <>
            <p className="slot-hint">Connected to the bridge at <strong>{bridge.host}</strong>. Which lamps go on?</p>
            {!lights && !error && <p className="slot-hint">Loading the lamps…</p>}
            {lights && lights.length === 0 && <p className="slot-hint">This bridge has no lamps yet. Add them in the Hue app.</p>}
            <div className="steps two">
              {lights?.map((l) => (
                <button key={l.id} className={chosen.some((c) => c.id === l.id) ? "step active" : "step"} onClick={() => toggle(l)}>
                  {l.name}{l.color ? " (red)" : ""}
                </button>
              ))}
            </div>
            <button className="big" disabled={!chosen.length || !!busy} onClick={() => void test()}>{busy ?? "Flash the lamp"}</button>
          </>
        )}

        {error && (
          <>
            <p className="hue-error">{error}</p>
            {error.startsWith("Couldn't reach") && (
              <p className="slot-hint">
                The computer has to be on the same network as the bridge. If Chrome asked about devices on your
                local network, allow it. If it still fails, open <strong>https://{host.trim() || "the-bridge-address"}</strong> in
                a new tab, choose Advanced → Proceed (the bridge's certificate is its own), then try again.
              </p>
            )}
          </>
        )}
        <div className="row">
          <button onClick={onClose}>Done</button>
          {config && <button className="link" onClick={forget}>Forget this bridge</button>}
        </div>
      </section>
    </div>
  );
}

const message = (e: unknown) => (e instanceof HueError ? e.message : "Something went wrong talking to the bridge.");
