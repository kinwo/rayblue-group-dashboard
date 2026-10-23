// Pure aggregation for the Rental analytics view: plain arrays in, view pieces out.
// No I/O, no clock; the service wires these to the repository.
import type { AgencyRecord, ListingTime } from "@/data/repository.types";
import { countInRange, type TimeRange } from "@/utils/date-buckets";
import type { AnalyticsFilters } from "@/utils/search-params";
import { ALL_STATES_LABEL, STATE_CODES, stateName } from "@/utils/states";
import type { AgencyOption, AgencyRow, PeriodCount, Scope, StateRow } from "@/services/rental-analytics.types";

export const GROUP_SERIES_NAME = "All Rayblue agencies";
export const TOP_AGENCY_LIMIT = 8;
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function compareByName(a: { name: string; id: number }, b: { name: string; id: number }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : a.id - b.id;
}

const toOption = (a: AgencyRecord): AgencyOption => ({ id: a.id, name: a.name, state: a.state });

/**
 * Drops an agency that does not exist or is outside the selected state, keeping the state (AC-FLT-9).
 * Returns the cleaned filters and the selected agency, if any.
 */
export function resolveFilters(
  filters: AnalyticsFilters,
  agencies: readonly AgencyRecord[],
): { filters: AnalyticsFilters; agency: AgencyOption | null } {
  const found = filters.agencyId === null ? undefined : agencies.find((a) => a.id === filters.agencyId);
  const valid = found !== undefined && (filters.state === null || found.state === filters.state);
  return {
    filters: { ...filters, agencyId: valid ? found.id : null },
    agency: valid ? toOption(found) : null,
  };
}

/** Labels for the current scope (AC-HDR-1, AC-TRD-4). */
export function buildScope(filters: AnalyticsFilters, agency: AgencyOption | null): Scope {
  const label = agency ? agency.name : filters.state ? stateName(filters.state) : ALL_STATES_LABEL;
  const seriesName = agency ? agency.name : filters.state ? stateName(filters.state) : GROUP_SERIES_NAME;
  return { label, seriesName, state: filters.state, agency };
}

/** Agencies in a state (or all), sorted by name. */
export function agenciesInState(agencies: readonly AgencyRecord[], state: AnalyticsFilters["state"]): AgencyOption[] {
  return agencies
    .filter((a) => state === null || a.state === state)
    .map(toOption)
    .sort(compareByName);
}

/** A predicate selecting the listings in scope: the agency if selected, else the state, else everything. */
export function scopePredicate(
  scope: Pick<Scope, "state" | "agency">,
  agencyState: ReadonlyMap<number, string>,
): (l: ListingTime) => boolean {
  if (scope.agency) {
    const id = scope.agency.id;
    return (l) => l.agencyId === id;
  }
  if (scope.state) {
    const state = scope.state;
    return (l) => agencyState.get(l.agencyId) === state;
  }
  return () => true;
}

export function periodCount(timestamps: readonly number[], period: { current: TimeRange; previous: TimeRange }): PeriodCount {
  return {
    current: countInRange(timestamps, period.current),
    previous: countInRange(timestamps, period.previous),
    previousStart: period.previous.from,
  };
}

/** All eight states with group-wide counts in `range`, highest first; ties keep the STATES order (AC-STA-1). */
export function stateRows(
  listings: readonly ListingTime[],
  agencies: readonly AgencyRecord[],
  range: TimeRange,
): StateRow[] {
  const agencyState = new Map(agencies.map((a) => [a.id, a.state]));
  const rows = new Map<string, StateRow>(STATE_CODES.map((state) => [state, { state, agencyCount: 0, count: 0 }]));
  for (const a of agencies) rows.get(a.state)!.agencyCount += 1;
  for (const l of listings) {
    if (l.listedDate < range.from || l.listedDate >= range.to) continue;
    const state = agencyState.get(l.agencyId);
    if (state !== undefined) rows.get(state)!.count += 1;
  }
  return [...rows.values()].sort((a, b) => b.count - a.count);
}

/**
 * Every agency in `scopeAgencies`, ranked by count over `current` (ties by name), with share of the
 * scope total and change against `previous` (AC-AGY-1..3). Not truncated; see `topAgencyRows`.
 */
export function rankAgencies(
  listings: readonly ListingTime[],
  scopeAgencies: readonly AgencyOption[],
  current: TimeRange,
  previous: TimeRange,
  selectedId: number | null,
): { rows: AgencyRow[]; scopeTotal: number } {
  const counts = new Map(scopeAgencies.map((a) => [a.id, { count: 0, previousCount: 0 }]));
  for (const l of listings) {
    const c = counts.get(l.agencyId);
    if (!c) continue;
    if (l.listedDate >= current.from && l.listedDate < current.to) c.count += 1;
    else if (l.listedDate >= previous.from && l.listedDate < previous.to) c.previousCount += 1;
  }
  let scopeTotal = 0;
  for (const c of counts.values()) scopeTotal += c.count;
  const rows = scopeAgencies.map((a): AgencyRow => {
    const { count, previousCount } = counts.get(a.id)!;
    return {
      agencyId: a.id,
      name: a.name,
      state: a.state,
      count,
      share: scopeTotal === 0 ? 0 : count / scopeTotal,
      previousCount,
      change: previousCount === 0 ? null : (count - previousCount) / previousCount,
      isSelected: a.id === selectedId,
    };
  });
  rows.sort((a, b) => b.count - a.count || compareByName({ name: a.name, id: a.agencyId }, { name: b.name, id: b.agencyId }));
  return { rows, scopeTotal };
}

/** The top N rows, plus the selected agency as an extra row when it falls outside them (AC-AGY-4). */
export function topAgencyRows(ranked: readonly AgencyRow[], limit = TOP_AGENCY_LIMIT): AgencyRow[] {
  const top = ranked.slice(0, limit);
  const selected = ranked.slice(limit).find((r) => r.isSelected);
  return selected ? [...top, selected] : top;
}

export function isStale(now: number, asOf: number): boolean {
  return now - asOf > STALE_AFTER_MS;
}
