// In-memory SQLite with the committed migrations applied, for data and service tests.
// Real queries, no Drizzle mocks (ENGINEERING.md › Testing strategy).
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createListingRepository } from "@/data/listing-repository";
import { applyMigrations } from "@/data/migrator";
import type { DatasetMeta, ListingRepository } from "@/data/repository.types";
import { agencies, datasetMeta, listings, type ListingStatus } from "@/data/schema";
import { DEFAULT_AS_OF, DEFAULT_SEED } from "@/data/seed-config";
import type { StateCode } from "@/utils/states";

export type TestAgency = { id?: number; name?: string; state: StateCode; suburb?: string };
export type TestListing = { agencyId: number; listedDate: number; status?: ListingStatus };

export type TestFixture = {
  agencies?: TestAgency[];
  listings?: TestListing[];
  /** Meta row to insert; `null` leaves the table empty. Defaults to the seed's as-of time. */
  meta?: Partial<DatasetMeta> | null;
};

export type TestDatabase = {
  repo: ListingRepository;
  sqlite: Database.Database;
  /** Inserts agencies and returns their ids, in order. Names default to "Rayblue Agency <id>". */
  insertAgencies(rows: TestAgency[]): number[];
  insertListings(rows: TestListing[]): void;
  /** Replaces the meta row; `null` deletes it. */
  setMeta(meta: Partial<DatasetMeta> | null): void;
  close(): void;
};

export function createTestDatabase(fixture: TestFixture = {}): TestDatabase {
  const sqlite = new Database(":memory:");
  applyMigrations(sqlite);
  const db = drizzle(sqlite);
  let nextAgencyId = 1;

  const insertAgencies = (rows: TestAgency[]): number[] =>
    rows.map((row) => {
      const id = row.id ?? nextAgencyId;
      nextAgencyId = Math.max(nextAgencyId, id + 1);
      db.insert(agencies)
        .values({
          id,
          name: row.name ?? `Rayblue Agency ${id}`,
          state: row.state,
          suburb: row.suburb ?? "Testville",
          createdAt: 0,
          updatedAt: 0,
        })
        .run();
      return id;
    });

  const insertListings = (rows: TestListing[]): void => {
    if (rows.length === 0) return;
    const states = new Map(
      db.select({ id: agencies.id, state: agencies.state }).from(agencies).all().map((a) => [a.id, a.state]),
    );
    sqlite.transaction(() => {
      for (const row of rows) {
        db.insert(listings)
          .values({
            agencyId: row.agencyId,
            streetNumber: "1",
            street: "Test Street",
            suburb: "Testville",
            postcode: "2000",
            state: states.get(row.agencyId) ?? "NSW",
            propertyType: "apartment",
            beds: 2,
            baths: 1,
            rentPerWeek: 600,
            propertyManager: "Test Manager",
            status: row.status ?? "active",
            listedDate: row.listedDate,
            createdAt: row.listedDate,
            updatedAt: row.listedDate,
          })
          .run();
      }
    })();
  };

  const setMeta = (meta: Partial<DatasetMeta> | null): void => {
    db.delete(datasetMeta).run();
    if (meta === null) return;
    const asOf = meta.asOf ?? DEFAULT_AS_OF;
    db.insert(datasetMeta)
      .values({ id: 1, asOf, seed: meta.seed ?? DEFAULT_SEED, generatedAt: meta.generatedAt ?? asOf })
      .run();
  };

  insertAgencies(fixture.agencies ?? []);
  insertListings(fixture.listings ?? []);
  setMeta(fixture.meta === undefined ? {} : fixture.meta);

  return {
    repo: createListingRepository(() => db),
    sqlite,
    insertAgencies,
    insertListings,
    setMeta,
    close: () => sqlite.close(),
  };
}

/** Shorthand when a test only needs the repository. Call `close()` in `afterEach`. */
export function createTestRepository(fixture: TestFixture = {}): { repo: ListingRepository; close(): void } {
  const { repo, close } = createTestDatabase(fixture);
  return { repo, close };
}
