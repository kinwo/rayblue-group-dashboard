import Database from "better-sqlite3";
import fc from "fast-check";
import { applyMigrations } from "@/data/migrator";
import { DEFAULT_AS_OF, DEFAULT_SEED, parseSeedOptions } from "@/data/seed-config";
import { generateDataset, SEED_DAYS, writeDataset } from "@/data/seed-data";
import { addSydneyDays, startOfSydneyDay, sydneyWeekday } from "@/utils/date-buckets";

const dataset = generateDataset(DEFAULT_SEED, DEFAULT_AS_OF);

function dump(sqlite: Database.Database): unknown {
  return ["agencies", "listings", "dataset_meta"].map((table) =>
    sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all(),
  );
}

describe("generateDataset", () => {
  it("AC-DAT-2: the same seed and as-of time give an identical dataset", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        expect(generateDataset(seed, DEFAULT_AS_OF)).toEqual(generateDataset(seed, DEFAULT_AS_OF));
      }),
      { numRuns: 5 },
    );
    expect(generateDataset(1, DEFAULT_AS_OF)).not.toEqual(generateDataset(2, DEFAULT_AS_OF));
  });

  it("AC-DAT-3: has about 30 agencies, in NSW, VIC and QLD only, each with listings", () => {
    expect(dataset.agencies.length).toBeGreaterThanOrEqual(25);
    expect(dataset.agencies.length).toBeLessThanOrEqual(35);
    expect(new Set(dataset.agencies.map((a) => a.state))).toEqual(new Set(["NSW", "VIC", "QLD"]));
    const withListings = new Set(dataset.listings.map((l) => l.agencyId));
    for (const agency of dataset.agencies) expect(withListings.has(agency.id!)).toBe(true);
  });

  it("AC-PRV-3: agency names are 'Rayblue <suburb>' and unique", () => {
    for (const agency of dataset.agencies) expect(agency.name).toBe(`Rayblue ${agency.suburb}`);
    expect(new Set(dataset.agencies.map((a) => a.name)).size).toBe(dataset.agencies.length);
  });

  it("puts every listing in its agency's state", () => {
    const stateOf = new Map(dataset.agencies.map((a) => [a.id, a.state]));
    for (const listing of dataset.listings) expect(listing.state).toBe(stateOf.get(listing.agencyId));
  });

  it("has listings only in the 30 Sydney days ending at the as-of time, none after it", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: Date.UTC(2024, 0, 1), max: Date.UTC(2028, 0, 1) }),
        (seed, asOf) => {
          const firstDay = addSydneyDays(startOfSydneyDay(asOf), -(SEED_DAYS - 1));
          for (const { listedDate } of generateDataset(seed, asOf).listings) {
            expect(listedDate).toBeLessThanOrEqual(asOf);
            expect(listedDate).toBeGreaterThanOrEqual(firstDay);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("lists fewer properties on weekend days than on weekdays", () => {
    const perDay = new Map<number, number>();
    for (const { listedDate } of dataset.listings) {
      const day = startOfSydneyDay(listedDate);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const today = startOfSydneyDay(DEFAULT_AS_OF);
    const average = (weekend: boolean) => {
      const counts = [...perDay].filter(([day]) => day !== today && [0, 6].includes(sydneyWeekday(day)) === weekend);
      return counts.reduce((sum, [, n]) => sum + n, 0) / counts.length;
    };
    expect(average(true)).toBeLessThan(average(false) * 0.6);
  });

  it("has ids in listed-date order and status, timestamps consistent with the as-of time", () => {
    dataset.listings.forEach((listing, i) => {
      expect(listing.id).toBe(i + 1);
      if (i > 0) expect(listing.listedDate).toBeGreaterThanOrEqual(dataset.listings[i - 1].listedDate);
      expect(listing.updatedAt).toBeGreaterThanOrEqual(listing.listedDate);
      expect(listing.updatedAt).toBeLessThanOrEqual(DEFAULT_AS_OF);
    });
    expect(dataset.meta).toEqual({ id: 1, asOf: DEFAULT_AS_OF, seed: DEFAULT_SEED, generatedAt: DEFAULT_AS_OF });
  });
});

describe("writeDataset", () => {
  it("AC-DAT-2: seeding twice writes identical rows, replacing what was there", () => {
    const a = new Database(":memory:");
    const b = new Database(":memory:");
    applyMigrations(a);
    applyMigrations(b);
    writeDataset(a, generateDataset(99, DEFAULT_AS_OF));
    writeDataset(a, dataset);
    writeDataset(b, dataset);
    expect(dump(a)).toEqual(dump(b));
    expect((a.prepare("SELECT COUNT(*) AS n FROM listings").get() as { n: number }).n).toBe(dataset.listings.length);
    a.close();
    b.close();
  });
});

describe("parseSeedOptions", () => {
  it("defaults to the fixed seed and 9:00 am Sat 24 Oct 2026 Sydney", () => {
    expect(parseSeedOptions({})).toEqual({ seed: DEFAULT_SEED, asOf: DEFAULT_AS_OF });
    expect(parseSeedOptions({ SEED: "", SEED_AS_OF: "" })).toEqual({ seed: DEFAULT_SEED, asOf: DEFAULT_AS_OF });
    expect(DEFAULT_AS_OF).toBe(Date.parse("2026-10-24T09:00:00+11:00"));
  });

  it("reads SEED and an ISO SEED_AS_OF with offset", () => {
    expect(parseSeedOptions({ SEED: "42", SEED_AS_OF: "2026-11-01T08:30:00+11:00" })).toEqual({
      seed: 42,
      asOf: Date.parse("2026-10-31T21:30:00Z"),
    });
  });

  it("rejects invalid values", () => {
    expect(() => parseSeedOptions({ SEED: "abc" })).toThrow("SEED");
    expect(() => parseSeedOptions({ SEED: "-1" })).toThrow("SEED");
    expect(() => parseSeedOptions({ SEED_AS_OF: "2026-10-24" })).toThrow("SEED_AS_OF");
    expect(() => parseSeedOptions({ SEED_AS_OF: "2026-10-24T09:00:00" })).toThrow("SEED_AS_OF");
  });
});
