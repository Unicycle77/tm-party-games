/**
 * An on/off setting: its label on the left, a switch on the right. Every toggle in the app uses this
 * (not a button whose label flips), so on and off always look the same. Stack them in a `.toggles` list.
 */
export function Toggle({ label, on, onChange, disabled, tabIndex }: {
  label: React.ReactNode; on: boolean; onChange: (on: boolean) => void; disabled?: boolean; tabIndex?: number;
}) {
  return (
    <label className={disabled ? "toggle disabled" : "toggle"}>
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={on} disabled={disabled} tabIndex={tabIndex}
        onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
