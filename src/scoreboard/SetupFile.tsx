import { get, ref } from "firebase/database";
import { useRef, useState } from "react";
import { db } from "../firebase";
import { exportSetup } from "../setupFile";
import { applyImport, parseSetup, planImport, type ImportPlan } from "../setupImport";
import type { SecretTasks, Session } from "../types";
import { list, plural } from "./tasks";

/**
 * "Setup file" on Plan the party: Export hands over the party's tasks, tiebreaker, secret tasks and light as a file;
 * Import reads one and, after showing what would change, makes the party match it. Nothing the night produced is in the file.
 */
export function SetupFile({ code, session }: { code: string; session: Session }) {
  const picker = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string>();
  const [check, setCheck] = useState<{ plan: ImportPlan } | { error: string }>();
  const [busy, setBusy] = useState(false);

  const exportIt = () => { setNote(undefined); exportSetup(code, session).catch(() => setNote("Couldn't make the file. Try again.")); };

  async function read(file: File | undefined) {
    if (!file) return;
    setNote(undefined);
    const parsed = parseSetup(await file.text());
    if ("error" in parsed) { setCheck({ error: parsed.error }); return; }
    // The dealt secret tasks are the host phone's to read, and decide who gets theirs back.
    const secret = parsed.setup.secretTasks ? ((await get(ref(db(), `secretTasks/${code}`))).val() as SecretTasks | null) : null;
    setCheck({ plan: planImport(parsed.setup, parsed.warnings, session, secret) });
  }

  async function confirm(plan: ImportPlan) {
    setBusy(true);
    try { await applyImport(code, session, plan.setup); setCheck(undefined); setNote(`Imported ${plural(plan.setup.tasks.length, "task")}.`); }
    catch { setNote("Couldn't import the file. Nothing may have changed; check the task list."); }
    finally { setBusy(false); }
  }

  return (
    <section className="setup-file">
      <div className="summary-line">
        <span>Setup file</span>
        <span className="summary-links">
          <button className="link" onClick={() => picker.current?.click()}>Import</button>
          <button className="link" onClick={exportIt}>Export</button>
        </span>
      </div>
      <input ref={picker} type="file" accept=".json,application/json" hidden
        onChange={(e) => { void read(e.target.files?.[0]); e.target.value = ""; }} />
      <p className="muted small">{note ?? "Tasks, tiebreaker, secret tasks and the light. Not guests or points."}</p>
      {check && ("error" in check ? (
        <div className="sb-add">
          <p>{check.error}</p>
          <button className="link" onClick={() => setCheck(undefined)}>Cancel</button>
        </div>
      ) : <ImportCheck plan={check.plan} busy={busy} onImport={() => void confirm(check.plan)} onCancel={() => setCheck(undefined)} />)}
    </section>
  );
}

/** What importing would do, before it does it: the task list as it will be, what goes, and the other parts the file brings. */
export function ImportCheck({ plan, busy, onImport, onCancel }: { plan: ImportPlan; busy: boolean; onImport: () => void; onCancel: () => void }) {
  const { setup, secret } = plan;
  return (
    <div className="sb-add">
      <h3>{setup.name ? `Import "${setup.name}"?` : "Import this setup?"}</h3>
      <p className="muted small">Nothing changes until you tap Import.</p>
      <p className="small">Tasks, as they'll be</p>
      <ul className="run-list">
        {plan.rows.map((r, i) => (
          <li key={i}><button disabled><span className="n">{i + 1}</span><span className="name">{r.title}</span><span className="state">{r.state === "kept" ? "kept: has points" : r.state}</span></button></li>
        ))}
      </ul>
      {plan.removed.length > 0 && <p className="small">Removed: <span className="muted">{plan.removed.join(", ")}</span></p>}
      {plan.tiebreaker && <p className="small">Tiebreaker: <span className="muted">{plan.tiebreaker}</span></p>}
      {secret && (
        <p className="small">Secret tasks: <span className="muted">{secret.count} in the pile</span>
          {secret.takenBack.length > 0 && <span className="muted">. {list(secret.takenBack)}: dealt {secret.takenBack.length === 1 ? "task isn't" : "tasks aren't"} in the file, so they pick again.</span>}
        </p>
      )}
      {plan.light && <p className="small">The light: <span className="muted">{plan.light}</span></p>}
      {plan.missingSongs.length > 0 && <p className="small">Not in this party's music folder: <span className="muted">{plan.missingSongs.join(", ")}. They'll show as missing until the folder has them.</span></p>}
      {plan.warnings.map((w) => <p key={w} className="small muted">{w}</p>)}
      <button className="big" disabled={busy || setup.tasks.length === 0} onClick={onImport}>{busy ? "Importing…" : `Import ${plural(setup.tasks.length, "task")}`}</button>
      <button className="link" disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  );
}
