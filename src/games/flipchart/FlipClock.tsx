import { clockText } from "./data";

/** Which of a digit's seven segments are lit, as on a clock face: a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle. */
const LIT: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg" };
const W = 60, H = 110, T = 11, GAP = 1.5, SPACE = 14;

const segment = (s: string, x: number): string => {
  const flat = (y: number) => `M${x + T / 2 + GAP},${y} l${T / 2},${-T / 2} h${W - 2 * T - 2 * GAP} l${T / 2},${T / 2} l${-T / 2},${T / 2} h${-(W - 2 * T - 2 * GAP)} z`;
  const tall = (sx: number, y: number) => `M${sx},${y + T / 2 + GAP} l${T / 2},${T / 2} v${H / 2 - 2 * T - 2 * GAP} l${-T / 2},${T / 2} l${-T / 2},${-T / 2} v${-(H / 2 - 2 * T - 2 * GAP)} z`;
  switch (s) {
    case "a": return flat(T / 2);
    case "g": return flat(H / 2);
    case "d": return flat(H - T / 2);
    case "f": return tall(x + T / 2, 0);
    case "b": return tall(x + W - T / 2, 0);
    case "e": return tall(x + T / 2, H / 2 - T / 2);
    default: return tall(x + W - T / 2, H / 2 - T / 2);
  }
};

/** "14:32" as four seven-segment digits and a colon; a minutes digit that isn't needed ("9:05") stays dark. */
function Digits({ text }: { text: string }) {
  const [minutes, seconds] = text.split(":") as [string, string];
  const slots = [minutes.padStart(2, " "), seconds];
  const parts: JSX.Element[] = [];
  let x = 0;
  slots.forEach((pair, i) => {
    for (const ch of pair) {
      for (const s of "abcdefg") parts.push(<path key={`${x}${s}`} d={segment(s, x)} className={LIT[ch]?.includes(s) ? "on" : "off"} />);
      x += W + SPACE;
    }
    if (i === 0) {
      parts.push(<circle key="c1" cx={x + 4} cy={H * 0.32} r={6} className="on" />, <circle key="c2" cx={x + 4} cy={H * 0.68} r={6} className="on" />);
      x += 26;
    }
  });
  return (
    <svg viewBox={`-10 -10 ${x - SPACE + 20} ${H + 20}`} aria-hidden="true">
      <g transform="skewX(-6)">{parts}</g>
    </svg>
  );
}

/**
 * The show's clock: red seven-segment digits on a black screen the shape of an iPad on its side, in a white matte inside a
 * thin black frame. The same on the big screen and the host's phone; `width` sets its size (the frame and matte scale with it).
 */
export function FlipClock({ ms, width, className }: { ms: number; width: string; className?: string }) {
  const text = clockText(ms);
  return (
    <div className={["fc-clock", className].filter(Boolean).join(" ")} style={{ "--w": width } as React.CSSProperties} role="timer" aria-label={`${text} left`}>
      <div className="matte"><div className="screen"><Digits text={text} /></div></div>
    </div>
  );
}
