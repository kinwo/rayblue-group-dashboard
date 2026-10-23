import fc from "fast-check";
import type { AgencyRecord, ListingTime } from "@/data/repository.types";
import { arbDataset, arbGranularity, DAY } from "@/test/arbitraries";
import { previousRange, trendRange } from "@/utils/date-buckets";
import { DEFAULT_FILTERS } from "@/utils/search-params";
import {
  agenciesInState,
  buildScope,
  isStale,
  rankAgencies,
  resolveFilters,
  stateRows,
  topAgencyRows,
} from "@/services/rental-analytics.aggregate";

const agencies: AgencyRecord[] = [
  { id: 1, name: "Bondi", state: "NSW", suburb: "Bondi" },
  { id: 2, name: "Albury", state: "NSW", suburb: "Albury" },
  { id: 3, name: "Carlton", state: "VIC", suburb: "Carlton" },
];

describe("resolveFilters (AC-FLT-9)", () => {
  it("keeps an agency inside the selected state", () => {
    const r = resolveFilters({ ...DEFAULT_FILTERS, state: "NSW", agencyId: 1 }, agencies);
    expect(r.filters).toEqual({ ...DEFAULT_FILTERS, state: "NSW", agencyId: 1 });
    expect(r.agency).toEqual({ id: 1, name: "Bondi", state: "NSW" });
  });

  it("drops an agency outside the selected state and keeps the state", () => {
    const r = resolveFilters({ ...DEFAULT_FILTERS, state: "VIC", agencyId: 1 }, agencies);
    expect(r.filters).toEqual({ ...DEFAULT_FILTERS, state: "VIC" });
    expect(r.agency).toBeNull();
  });

  it("drops an unknown agency", () => {
    expect(resolveFilters({ ...DEFAULT_FILTERS, agencyId: 99 }, agencies).filters.agencyId).toBeNull();
  });

  it("keeps an agency with no state, leaving the state scope null", () => {
    const r = resolveFilters({ ...DEFAULT_FILTERS, agencyId: 3 }, agencies);
    expect(r.filters.state).toBeNull();
    expect(buildScope(r.filters, r.agency)).toMatchObject({ state: null, label: "Carlton", seriesName: "Carlton" });
  });
});

describe("buildScope (AC-HDR-1, AC-TRD-4)", () => {
  it("names the group, a state or an agency", () => {
    expect(buildScope(DEFAULT_FILTERS, null)).toMatchObject({
      label: "All states and territories",
      seriesName: "All Rayblue agencies",
    });
    expect(buildScope({ ...DEFAULT_FILTERS, state: "VIC" }, null)).toMatchObject({ label: "Victoria", seriesName: "Victoria" });
  });
});

describe("agenciesInState", () => {
  it("filters by state and sorts by name", () => {
    expect(agenciesInState(agencies, "NSW").map((a) => a.name)).toEqual(["Albury", "Bondi"]);
    expect(agenciesInState(agencies, null).map((a) => a.name)).toEqual(["Albury", "Bondi", "Carlton"]);
    expect(agenciesInState(agencies, "TAS")).toEqual([]);
  });
});

describe("stateRows", () => {
  it("returns all eight states, zeros included, sorted by count", () => {
    const listings: ListingTime[] = [
      { agencyId: 3, listedDate: 10 },
      { agencyId: 3, listedDate: 11 },
      { agencyId: 1, listedDate: 12 },
      { agencyId: 1, listedDate: 1000 },
    ];
    const rows = stateRows(listings, agencies, { from: 0, to: 100 });
    expect(rows).toHaveLength(8);
    expect(rows.slice(0, 2)).toEqual([
      { state: "VIC", agencyCount: 1, count: 2 },
      { state: "NSW", agencyCount: 2, count: 1 },
    ]);
    expect(rows.slice(2).every((r) => r.count === 0 && r.agencyCount === 0)).toBe(true);
  });

  it("state totals sum to the group total (AC-STA-4)", () => {
    fc.assert(
      fc.property(arbDataset, arbGranularity, ({ asOf, agencies, listings }, g) => {
        const range = trendRange(asOf, g);
        const rows = stateRows(listings, agencies, range);
        const group = listings.filter((l) => l.listedDate >= range.from && l.listedDate < range.to).length;
        expect(rows.reduce((s, r) => s + r.count, 0)).toBe(group);
        expect(rows.reduce((s, r) => s + r.agencyCount, 0)).toBe(agencies.length);
      }),
    );
  });
});

describe("rankAgencies / topAgencyRows (AC-AGY-1..4)", () => {
  const current = { from: 100, to: 200 };
  const previous = { from: 0, to: 100 };

  it("computes share and change, with null change when previous is 0", () => {
    const listings: ListingTime[] = [
      ...Array.from({ length: 3 }, () => ({ agencyId: 1, listedDate: 150 })),
      { agencyId: 2, listedDate: 150 },
      { agencyId: 1, listedDate: 50 },
      { agencyId: 1, listedDate: 60 },
    ];
    const { rows, scopeTotal } = rankAgencies(listings, agenciesInState(agencies, "NSW"), current, previous, null);
    expect(scopeTotal).toBe(4);
    expect(rows).toEqual([
      { agencyId: 1, name: "Bondi", state: "NSW", count: 3, share: 0.75, previousCount: 2, change: 0.5, isSelected: false },
      { agencyId: 2, name: "Albury", state: "NSW", count: 1, share: 0.25, previousCount: 0, change: null, isSelected: false },
    ]);
  });

  it("breaks ties by name and gives 0 share when the scope total is 0", () => {
    const { rows } = rankAgencies([], agenciesInState(agencies, null), current, previous, 3);
    expect(rows.map((r) => r.name)).toEqual(["Albury", "Bondi", "Carlton"]);
    expect(rows.every((r) => r.share === 0 && r.change === null)).toBe(true);
    expect(rows.find((r) => r.isSelected)?.agencyId).toBe(3);
  });

  it("appends the selected agency as a ninth row when outside the top 8", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `A${String(i + 1).padStart(2, "0")}`, state: "QLD" as const }));
    const listings = many.slice(0, 10).flatMap((a, i) => Array.from({ length: 20 - i }, () => ({ agencyId: a.id, listedDate: 150 })));
    const ranked = rankAgencies(listings, many, current, previous, 12).rows;
    const top = topAgencyRows(ranked);
    expect(top).toHaveLength(9);
    expect(top.at(-1)).toMatchObject({ agencyId: 12, isSelected: true });
    expect(topAgencyRows(rankAgencies(listings, many, current, previous, 2).rows)).toHaveLength(8);
  });

  it("shares across every agency in scope sum to 100% (AC-AGY-2)", () => {
    fc.assert(
      fc.property(arbDataset, arbGranularity, ({ asOf, agencies, listings }, g) => {
        const range = trendRange(asOf, g);
        const { rows, scopeTotal } = rankAgencies(listings, agenciesInState(agencies, null), range, previousRange(range), null);
        const sum = rows.reduce((s, r) => s + r.share, 0);
        if (scopeTotal === 0) expect(sum).toBe(0);
        else expect(sum).toBeCloseTo(1, 9);
        expect(rows.reduce((s, r) => s + r.count, 0)).toBe(scopeTotal);
        for (let i = 1; i < rows.length; i++) expect(rows[i - 1].count).toBeGreaterThanOrEqual(rows[i].count);
      }),
    );
  });
});

describe("isStale (AC-HDR-2)", () => {
  it("is stale only after more than 24 hours", () => {
    expect(isStale(1000 + DAY, 1000)).toBe(false);
    expect(isStale(1001 + DAY, 1000)).toBe(true);
    expect(isStale(0, 1000)).toBe(false);
  });
});
