// URL search params for the Rental analytics page (AGENTS.md rule 4, AC-FLT-8, AC-SEC-2).
// Each param is validated on its own; anything unexpected falls back to its default.
import { z } from "zod";
import { DEFAULT_GRANULARITY, GRANULARITIES, type Granularity } from "@/utils/granularity";
import { STATE_CODES, type StateCode } from "@/utils/states";

/** Validated filters, as parsed from the URL at the page boundary. */
export type AnalyticsFilters = {
  state: StateCode | null;
  agencyId: number | null;
  granularity: Granularity;
};

export const DEFAULT_FILTERS: AnalyticsFilters = Object.freeze({
  state: null,
  agencyId: null,
  granularity: DEFAULT_GRANULARITY,
});

/** What Next.js hands a page as `await searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Longest value worth parsing; anything longer is rejected before any work (AC-SEC-2). */
const MAX_PARAM_LENGTH = 16;

const stateSchema = z.enum(STATE_CODES as [StateCode, ...StateCode[]]);
const granularitySchema = z.enum(GRANULARITIES);
const agencyIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,8}$/)
  .transform(Number);

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length <= MAX_PARAM_LENGTH ? value : undefined;
}

function parseOr<T>(schema: z.ZodType<T>, value: string | undefined, fallback: T): T {
  if (value === undefined) return fallback;
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

/** Parses raw search params into filters. Never throws; arrays, unknown and oversized values become defaults. */
export function parseAnalyticsSearchParams(raw: RawSearchParams | null | undefined): AnalyticsFilters {
  const get = (key: string) => (raw && Object.hasOwn(raw, key) ? single(raw[key]) : undefined);
  return {
    state: parseOr<StateCode | null>(stateSchema, get("state"), DEFAULT_FILTERS.state),
    agencyId: parseOr<number | null>(agencyIdSchema, get("agencyId"), DEFAULT_FILTERS.agencyId),
    granularity: parseOr<Granularity>(granularitySchema, get("granularity"), DEFAULT_FILTERS.granularity),
  };
}

/** Search params for a view, omitting defaults, in the order state, agencyId, granularity. */
export function toSearchParams(filters: Partial<AnalyticsFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.state) params.set("state", filters.state);
  if (filters.agencyId) params.set("agencyId", String(filters.agencyId));
  if (filters.granularity && filters.granularity !== DEFAULT_GRANULARITY) params.set("granularity", filters.granularity);
  return params;
}

/** `""` for the default view, otherwise `"?state=NSW&granularity=weekly"`. */
export function toQueryString(filters: Partial<AnalyticsFilters>): string {
  const query = toSearchParams(filters).toString();
  return query ? `?${query}` : "";
}
