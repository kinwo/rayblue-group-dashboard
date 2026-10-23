import { STATE_CODES, type StateCode } from "@/utils/states";

// The one home for chart series colours (DESIGN.md §2 › Chart palette).
// Values are CSS variables from src/app/globals.css, so themes swap them.

/** Categorical series colours, in palette order. */
export const CATEGORICAL_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

/** Colour of a single-series chart (trend line, by-state bars). */
export const SINGLE_SERIES_COLOR = CATEGORICAL_COLORS[0];

/** Colour of an "Other" bucket. */
export const OTHER_SERIES_COLOR = "var(--chart-other)";

/** A state's colour, fixed by its code (not render order) so it is stable across filters. */
export function stateColor(code: StateCode): string {
  return CATEGORICAL_COLORS[STATE_CODES.indexOf(code) % CATEGORICAL_COLORS.length];
}
