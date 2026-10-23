// Display formatting for counts, shares, changes and Sydney dates. Every date
// input is UTC epoch ms; output is in Australia/Sydney (AGENTS.md rule 3).
import { TIME_ZONE } from "@/utils/date-buckets";
import type { Granularity } from "@/utils/granularity";

const LOCALE = "en-AU";
const MINUS = "−";
const EM_DASH = "—";

const countFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const shareFormat = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Built from parts so the output never depends on ICU punctuation, spacing or
// abbreviations (en-AU abbreviates September as "Sept").
const partsFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

type SydneyParts = { year: string; month: string; day: string; weekday: string; hour: string; minute: string; dayPeriod: string };

function sydneyParts(ms: number): SydneyParts {
  const out: Record<string, string> = {};
  for (const p of partsFormat.formatToParts(ms)) out[p.type] = p.value;
  return out as SydneyParts;
}

const short = (name: string) => name.slice(0, 3);

/** `3,369` (AC-KPI-4). */
export function formatCount(n: number): string {
  return countFormat.format(n);
}

/** A 0..1 share to one decimal: `12.3%` (AC-AGY-2). */
export function formatShare(share: number): string {
  return shareFormat.format(share);
}

/** A relative change rounded to a whole percent: `+4%`, `−3%`, `0%`; `—` when there is no previous count (AC-AGY-3). */
export function formatChange(change: number | null): string {
  if (change === null || !Number.isFinite(change)) return EM_DASH;
  const pct = Math.round(change * 100);
  if (pct === 0) return "0%";
  return `${pct > 0 ? "+" : MINUS}${countFormat.format(Math.abs(pct))}%`;
}

/** `9:00 am`. */
export function formatTime(ms: number): string {
  const p = sydneyParts(ms);
  return `${p.hour}:${p.minute} ${p.dayPeriod.toLowerCase()}`;
}

/** `24 Oct 2026`. */
export function formatDate(ms: number): string {
  const p = sydneyParts(ms);
  return `${p.day} ${short(p.month)} ${p.year}`;
}

/** `Saturday`. */
export function formatWeekday(ms: number): string {
  return sydneyParts(ms).weekday;
}

/** `September`. */
export function formatMonth(ms: number): string {
  return sydneyParts(ms).month;
}

/** Short axis label for a bucket start (intent F4): `24 Oct`, `19 Oct` or `Oct`. */
export function formatBucketLabel(start: number, granularity: Granularity): string {
  const p = sydneyParts(start);
  return granularity === "monthly" ? short(p.month) : `${p.day} ${short(p.month)}`;
}

/** Long tooltip label (intent F4), with ` (to date)` for a partial bucket (AC-TRD-2). */
export function formatBucketTooltip(start: number, granularity: Granularity, isPartial = false): string {
  const p = sydneyParts(start);
  const label =
    granularity === "daily"
      ? `${short(p.weekday)} ${p.day} ${short(p.month)} ${p.year}`
      : granularity === "weekly"
        ? `Week of ${p.day} ${short(p.month)} ${p.year}`
        : `${p.month} ${p.year}`;
  return isPartial ? `${label} (to date)` : label;
}

/** A range from the first to the last bucket start: `11 Oct to 24 Oct`, `Nov to Oct`. */
export function formatBucketRange(firstStart: number, lastStart: number, granularity: Granularity): string {
  return `${formatBucketLabel(firstStart, granularity)} to ${formatBucketLabel(lastStart, granularity)}`;
}

/** `58 agencies`, `1 agency`. */
export function formatAgencyCount(n: number): string {
  return `${formatCount(n)} ${n === 1 ? "agency" : "agencies"}`;
}
