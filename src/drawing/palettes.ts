import type { Palette } from "./strokes";

/** A flipchart's set of four markers (Flipchart, Acetate, the toilet roll). */
export const MARKERS: Palette = [
  { name: "Black", colour: "#1b1b1b" },
  { name: "Red", colour: "#b3261e" },
  { name: "Blue", colour: "#1f4fa8" },
  { name: "Green", colour: "#2e7d32" },
];

/** Ten markers in rainbow order, two rows of five (the median duck): gray evens out the rows. */
export const RAINBOW: Palette = [
  { name: "Red", colour: "#b3261e" },
  { name: "Orange", colour: "#e8772e" },
  { name: "Yellow", colour: "#f2c230" },
  { name: "Green", colour: "#2e7d32" },
  { name: "Blue", colour: "#1f4fa8" },
  { name: "Purple", colour: "#6a3d9a" },
  { name: "Pink", colour: "#e889a8" },
  { name: "Brown", colour: "#7a4b26" },
  { name: "Gray", colour: "#8a8a8a" },
  { name: "Black", colour: "#1b1b1b" },
];
