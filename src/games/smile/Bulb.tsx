/** The light bulb: dark glass, or lit and glowing (and shaking with the buzz). Coloured from styles.css. */
export function Bulb({ lit }: { lit: boolean }) {
  return (
    <div className={lit ? "bulb on" : "bulb"} role="img" aria-label={lit ? "The light bulb is on" : "The light bulb is off"}>
      <svg viewBox="0 0 200 300" aria-hidden>
        <path className="bulb-glass" d="M100 12C46 12 18 54 18 100c0 38 26 60 42 86 8 13 10 24 10 36h60c0-12 2-23 10-36 16-26 42-48 42-86 0-46-28-88-82-88Z" />
        <path className="bulb-wire" d="M86 222V150M114 222V150" />
        <path className="bulb-filament" d="M86 150q3.5-22 7-0t7-0 7-0 7-0" />
        <g className="bulb-base">
          <rect x="66" y="222" width="68" height="14" rx="5" />
          <rect x="68" y="238" width="64" height="12" rx="5" />
          <rect x="70" y="252" width="60" height="12" rx="5" />
          <path d="M80 266h40l-10 18H90Z" />
        </g>
      </svg>
    </div>
  );
}
