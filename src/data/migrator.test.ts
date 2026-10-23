import Database from "better-sqlite3";
import { appliedMigrationHashes, applyMigrations, expectedMigrationHashes } from "@/data/migrator";

describe("migrations", () => {
  let sqlite: Database.Database;
  beforeEach(() => {
    sqlite = new Database(":memory:");
  });
  afterEach(() => sqlite.close());

  it("apply to an empty in-memory database and create every table and index", () => {
    applyMigrations(sqlite);
    const names = (
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','index')").all() as { name: string }[]
    ).map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "agencies",
        "listings",
        "dataset_meta",
        "listings_agency_id_listed_date_idx",
        "listings_listed_date_idx",
      ]),
    );
  });

  it("record the committed migrations as applied, in order", () => {
    expect(appliedMigrationHashes(sqlite)).toEqual([]);
    applyMigrations(sqlite);
    expect(appliedMigrationHashes(sqlite)).toEqual(expectedMigrationHashes());
    expect(expectedMigrationHashes().length).toBeGreaterThan(0);
  });

  it("are idempotent", () => {
    applyMigrations(sqlite);
    expect(() => applyMigrations(sqlite)).not.toThrow();
    expect(appliedMigrationHashes(sqlite)).toEqual(expectedMigrationHashes());
  });
});
