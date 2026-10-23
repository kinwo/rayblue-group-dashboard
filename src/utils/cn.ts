import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The Cirrus type-scale utilities (`text-display`, `text-caption`, …).
 * Keep in sync with the `--text-*` tokens in src/app/globals.css and DESIGN.md §3.
 * Registering them as font sizes stops tailwind-merge from treating them as
 * text colours and dropping `text-ink-muted` (or vice versa).
 */
export const TYPE_SCALE = [
  "display",
  "title",
  "heading",
  "subheading",
  "body-lg",
  "body",
  "label",
  "caption",
  "caption-strong",
  "overline",
  "code",
] as const;

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: [...TYPE_SCALE] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
