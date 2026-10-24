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

/** A filter's URL param name. */
export type FilterKey = keyof AnalyticsFilters;

/** Filters plus the params that were present but rejected, so the page can say so without echoing them. */
export type ParsedAnalyticsSearchParams = { filters: AnalyticsFilters; reset: FilterKey[] };

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

/**
 * Parses raw search params into filters, listing each filter param that was present but
 * rejected (array, oversized or failing its schema). Never throws; rejected values become defaults.
 */
export function parseAnalyticsSearchParamsDetailed(raw: RawSearchParams | null | undefined): ParsedAnalyticsSearchParams {
  const reset: FilterKey[] = [];
  function parse<K extends FilterKey>(key: K, schema: z.ZodType<AnalyticsFilters[K]>): AnalyticsFilters[K] {
    const value = raw && Object.hasOwn(raw, key) ? raw[key] : undefined;
    if (value === undefined) return DEFAULT_FILTERS[key];
    const result = typeof value === "string" && value.length <= MAX_PARAM_LENGTH ? schema.safeParse(value) : undefined;
    if (result?.success) return result.data;
    reset.push(key);
    return DEFAULT_FILTERS[key];
  }
  const filters = {
    state: parse("state", stateSchema),
    agencyId: parse("agencyId", agencyIdSchema),
    granularity: parse("granularity", granularitySchema),
  };
  return { filters, reset };
}

/** Parses raw search params into filters. Never throws; arrays, unknown and oversized values become defaults. */
export function parseAnalyticsSearchParams(raw: RawSearchParams | null | undefined): AnalyticsFilters {
  return parseAnalyticsSearchParamsDetailed(raw).filters;
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
