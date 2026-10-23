import fc from "fast-check";
import { arbDataset, arbGranularity, DAY, type GeneratedAgency, type GeneratedListing } from "@/test/arbitraries";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { trendRange } from "@/utils/date-buckets";
import { DataIntegrityError, DataUnavailableError } from "@/utils/errors";
import { type AnalyticsFilters, DEFAULT_FILTERS } from "@/utils/search-params";
import { getRentalAnalytics } from "@/services/rental-analytics";
import type { RentalAnalyticsView } from "@/services/rental-analytics.types";

const utc = (iso: string) => Date.parse(iso);

let open: TestDatabase[] = [];
function db(...args: Parameters<typeof createTestDatabase>): TestDatabase {
  const d = createTestDatabase(...args);
  open.push(d);
  return d;
}
afterEach(() => {
  for (const d of open) {
    try {
      d.close();
    } catch {
      // already closed by the test
    }
  }
  open = [];
});

const view = (d: TestDatabase, filters: Partial<AnalyticsFilters> = {}, now?: number): Promise<RentalAnalyticsView> =>
  d.repo.getDatasetMeta().then((m) => getRentalAnalytics({ repo: d.repo, now: now ?? m.asOf }, { ...DEFAULT_FILTERS, ...filters }));

describe("getRentalAnalytics: known counts across a DST change and a month end (AC-KPI-3)", () => {
  // 9:00 am Tue 6 Oct 2026 AEDT. DST started Sun 4 Oct; September ended on the Wednesday before.
  const asOf = utc("2026-10-05T22:00:00Z");
  const at = (iso: string) => ({ agencyId: 1, listedDate: utc(iso) });
  const listings = [
    at("2026-10-05T13:00:00.000Z"), // a: Tue 6 Oct 00:00 AEDT - today
    at("2026-10-05T12:59:59.999Z"), // b: Mon 5 Oct 23:59 - this week
    at("2026-10-05T22:00:00.000Z"), // c: exactly as-of - today
    at("2026-10-05T22:00:00.001Z"), // d: after as-of - never counted
    at("2026-10-04T12:59:59.999Z"), // e: Sun 4 Oct 23:59 AEDT - last week, this month
    at("2026-10-03T15:30:00.000Z"), // f: Sun 4 Oct 01:30 AEST, before the jump - last week, this month
    at("2026-09-30T13:59:59.999Z"), // g: Wed 30 Sep 23:59 AEST - last week, September
    at("2026-09-28T14:00:00.000Z"), // h: Tue 29 Sep 00:00 - last Tuesday
    at("2026-09-29T13:59:59.999Z"), // i: Tue 29 Sep 23:59 - last Tuesday
    at("2026-09-29T14:00:00.000Z"), // j: Wed 30 Sep 00:00 - last week, September
    at("2026-09-27T13:59:59.999Z"), // k: Sun 27 Sep 23:59 - September only
    at("2026-08-31T14:00:00.000Z"), // l: Tue 1 Sep 00:00 - September
    at("2026-08-31T13:59:59.999Z"), // m: 31 Aug 23:59 - before every KPI period
  ];
  let d: TestDatabase;
  beforeEach(() => {
    d = db({
      agencies: [{ name: "Bondi Rentals", state: "NSW" }, { name: "Carlton Homes", state: "VIC" }],
      listings,
      meta: { asOf },
    });
  });

  it("counts today, this week and this month with their comparisons", async () => {
    const v = await view(d);
    expect(v.kpis.today).toEqual({ current: 2, previous: 2, previousStart: utc("2026-09-28T14:00:00Z") });
    expect(v.kpis.thisWeek).toEqual({ current: 3, previous: 6, previousStart: utc("2026-09-27T14:00:00Z") });
    expect(v.kpis.thisMonth).toEqual({ current: 5, previous: 6, previousStart: utc("2026-08-31T14:00:00Z") });
    expect(v.kpis.agencyCount).toBe(2);
    expect(v.kpis.stateCount).toBe(8);
  });

  it("buckets the daily trend in Sydney days, zero-filled, with a partial last day", async () => {
    const v = await view(d);
    const counts = v.trend.points.map((p) => p.count);
    // 23 Sep .. 6 Oct
    expect(counts).toEqual([0, 0, 0, 0, 1, 0, 2, 2, 0, 0, 0, 2, 1, 2]);
    expect(v.trend.points[0].start).toBe(utc("2026-09-22T14:00:00Z"));
    expect(v.trend.points.at(-1)).toEqual({ start: utc("2026-10-05T13:00:00Z"), count: 2, isPartial: true });
    expect(v.trend.points.slice(0, -1).some((p) => p.isPartial)).toBe(false);
  });

  it("buckets weeks from Monday and months from the 1st", async () => {
    const weekly = await view(d, { granularity: "weekly" });
    expect(weekly.trend.points).toHaveLength(12);
    expect(weekly.trend.points.slice(-3).map((p) => p.count)).toEqual([1, 6, 3]);
    const monthly = await view(d, { granularity: "monthly" });
    expect(monthly.trend.points).toHaveLength(12);
    expect(monthly.trend.points.slice(-3).map((p) => p.count)).toEqual([1, 6, 5]);
  });

  it("narrows to a state or agency and leaves other scopes at zero (AC-KPI-1, AC-STE-2)", async () => {
    const vic = await view(d, { state: "VIC" });
    expect(vic.scope).toMatchObject({ label: "Victoria", seriesName: "Victoria", state: "VIC", agency: null });
    expect(vic.kpis).toMatchObject({ today: { current: 0, previous: 0 }, agencyCount: 1, stateCount: 1 });
    expect(vic.trend.points.every((p) => p.count === 0)).toBe(true);
    expect(vic.trend.points).toHaveLength(14);
    expect(vic.topAgencies).toEqual({
      rows: [expect.objectContaining({ name: "Carlton Homes", count: 0, share: 0, change: null })],
      scopeTotal: 0,
    });

    const agency = await view(d, { agencyId: 1 });
    expect(agency.scope).toMatchObject({ label: "Bondi Rentals", seriesName: "Bondi Rentals", state: null });
    expect(agency.kpis.thisMonth.current).toBe(5);
    expect(agency.kpis).toMatchObject({ agencyCount: 1, stateCount: 1 });
    expect(agency.agencyOptions.map((a) => a.name)).toEqual(["Bondi Rentals", "Carlton Homes"]);
  });

  it("drops an agency outside the selected state (AC-FLT-9)", async () => {
    const v = await view(d, { state: "VIC", agencyId: 1 });
    expect(v.filters).toEqual({ ...DEFAULT_FILTERS, state: "VIC" });
    expect(v.scope.label).toBe("Victoria");
    expect(v.agencyOptions.map((a) => a.id)).toEqual([2]);
  });

  it("drops an unknown agency", async () => {
    const v = await view(d, { agencyId: 999 });
    expect(v.filters.agencyId).toBeNull();
    expect(v.scope.label).toBe("All states and territories");
  });

  it("shows group-wide state totals whatever the filters (AC-STA-1)", async () => {
    const v = await view(d, { state: "VIC" });
    expect(v.byState).toHaveLength(8);
    expect(v.byState[0]).toEqual({ state: "NSW", agencyCount: 1, count: 10 });
    expect(v.byState.find((r) => r.state === "VIC")).toEqual({ state: "VIC", agencyCount: 1, count: 0 });
  });

  it("compares top agencies with the previous equal range (AC-AGY-3)", async () => {
    const v = await view(d);
    // Previous 14 days: 9 Sep .. 22 Sep contains nothing.
    expect(v.topAgencies.rows[0]).toMatchObject({ name: "Bondi Rentals", count: 10, share: 1, previousCount: 0, change: null });
    const monthly = await view(d, { granularity: "monthly" });
    expect(monthly.topAgencies.rows[0]).toMatchObject({ count: 12, previousCount: 0 });
  });

  it("flags stale data only after 24 hours (AC-HDR-2)", async () => {
    expect((await view(d, {}, asOf + DAY)).isStale).toBe(false);
    expect((await view(d, {}, asOf + DAY + 1)).isStale).toBe(true);
    expect((await view(d)).asOf).toBe(asOf);
  });
});

describe("getRentalAnalytics: empty and failing data", () => {
  it("returns zeros, not errors, for an empty dataset (AC-STE-2)", async () => {
    const v = await view(db());
    expect(v.kpis.today.current).toBe(0);
    expect(v.kpis.agencyCount).toBe(0);
    expect(v.trend.points).toHaveLength(14);
    expect(v.trend.points.every((p) => p.count === 0)).toBe(true);
    expect(v.byState.map((r) => r.count)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(v.topAgencies).toEqual({ rows: [], scopeTotal: 0 });
    expect(v.agencyOptions).toEqual([]);
  });

  it("propagates DataUnavailableError when the database cannot be read", async () => {
    const d = db({ agencies: [{ state: "NSW" }] });
    d.close();
    await expect(getRentalAnalytics({ repo: d.repo, now: 0 }, DEFAULT_FILTERS)).rejects.toBeInstanceOf(DataUnavailableError);
  });

  it("propagates DataIntegrityError when there is no as-of time", async () => {
    const d = db({ meta: null });
    await expect(getRentalAnalytics({ repo: d.repo, now: 0 }, DEFAULT_FILTERS)).rejects.toBeInstanceOf(DataIntegrityError);
  });

  it("reads one bounded window, never unbounded (AC-SEC-2)", async () => {
    const d = db();
    const spy = jest.spyOn(d.repo, "listListingTimes");
    const { asOf } = await d.repo.getDatasetMeta();
    for (const granularity of ["daily", "weekly", "monthly"] as const) {
      spy.mockClear();
      await getRentalAnalytics({ repo: d.repo, now: asOf }, { ...DEFAULT_FILTERS, granularity });
      expect(spy).toHaveBeenCalledTimes(1);
      const { from, to } = spy.mock.calls[0][0];
      expect(to).toBe(asOf + 1);
      expect(asOf - from).toBeLessThanOrEqual(2 * 366 * DAY);
    }
  });
});

describe("getRentalAnalytics: properties over generated data", () => {
  const seeded = arbDataset.filter((ds) => ds.agencies.length > 0);
  const load = (ds: { asOf: number; agencies: GeneratedAgency[]; listings: GeneratedListing[] }) =>
    db({ agencies: ds.agencies, listings: ds.listings, meta: { asOf: ds.asOf } });

  it("adding a state or agency filter never raises any count (AC-DAT-1 filter monotonicity)", async () => {
    await fc.assert(
      fc.asyncProperty(seeded, arbGranularity, fc.nat(), async (ds, granularity, pick) => {
        const d = load(ds);
        const agency = ds.agencies[pick % ds.agencies.length];
        const [group, state, single] = await Promise.all([
          view(d, { granularity }),
          view(d, { granularity, state: agency.state }),
          view(d, { granularity, state: agency.state, agencyId: agency.id }),
        ]);
        for (const [wide, narrow] of [
          [group, state],
          [state, single],
        ]) {
          narrow.trend.points.forEach((p, i) => expect(p.count).toBeLessThanOrEqual(wide.trend.points[i].count));
          for (const k of ["today", "thisWeek", "thisMonth"] as const) {
            expect(narrow.kpis[k].current).toBeLessThanOrEqual(wide.kpis[k].current);
            expect(narrow.kpis[k].previous).toBeLessThanOrEqual(wide.kpis[k].previous);
          }
        }
        d.close();
      }),
      { numRuns: 30 },
    );
  });

  it("state totals sum to the group trend total, which counts every listing in range (AC-STA-4)", async () => {
    await fc.assert(
      fc.asyncProperty(seeded, arbGranularity, async (ds, granularity) => {
        const d = load(ds);
        const v = await view(d, { granularity });
        const range = trendRange(ds.asOf, granularity);
        const expected = ds.listings.filter((l) => l.listedDate >= range.from && l.listedDate <= ds.asOf).length;
        const groupTotal = v.trend.points.reduce((s, p) => s + p.count, 0);
        expect(groupTotal).toBe(expected);
        expect(v.byState.reduce((s, r) => s + r.count, 0)).toBe(groupTotal);
        expect(v.topAgencies.scopeTotal).toBe(groupTotal);
        d.close();
      }),
      { numRuns: 30 },
    );
  });

  it("top agencies: at most 8 rows plus the selected one, highest first (AC-AGY-1, AC-AGY-4)", async () => {
    await fc.assert(
      fc.asyncProperty(seeded, fc.nat(), async (ds, pick) => {
        const d = load(ds);
        const agency = ds.agencies[pick % ds.agencies.length];
        const v = await view(d, { agencyId: agency.id });
        const rows = v.topAgencies.rows;
        expect(rows.length).toBeLessThanOrEqual(9);
        expect(rows.filter((r) => r.isSelected).map((r) => r.agencyId)).toEqual([agency.id]);
        const top = rows.slice(0, 8);
        for (let i = 1; i < top.length; i++) expect(top[i - 1].count).toBeGreaterThanOrEqual(top[i].count);
        d.close();
      }),
      { numRuns: 30 },
    );
  });
});

describe("loadRentalAnalytics", () => {
  it("rejects with DataUnavailableError when the database file is missing", async () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "./does-not-exist/rayblue.db";
    try {
      await jest.isolateModulesAsync(async () => {
        const { loadRentalAnalytics } = await import("@/services/rental-analytics");
        const errors = await import("@/utils/errors");
        await expect(loadRentalAnalytics(DEFAULT_FILTERS, 0)).rejects.toBeInstanceOf(errors.DataUnavailableError);
      });
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});
