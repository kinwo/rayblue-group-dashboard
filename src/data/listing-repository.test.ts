import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { openReadOnly } from "@/clients/db";
import { createListingRepository } from "@/data/listing-repository";
import { applyMigrations } from "@/data/migrator";
import { createTestDatabase, type TestDatabase } from "@/test/db";
import { DataIntegrityError, DataUnavailableError } from "@/utils/errors";

const T0 = Date.UTC(2026, 9, 1);
const HOUR = 3_600_000;

describe("listing repository", () => {
  let t: TestDatabase;
  beforeEach(() => {
    t = createTestDatabase({
      agencies: [
        { id: 1, name: "Rayblue Parramatta", state: "NSW", suburb: "Parramatta" },
        { id: 2, name: "Rayblue Bondi", state: "NSW", suburb: "Bondi" },
        { id: 3, name: "Rayblue Carlton", state: "VIC", suburb: "Carlton" },
      ],
      listings: [
        { agencyId: 1, listedDate: T0 },
        { agencyId: 1, listedDate: T0 + HOUR },
        { agencyId: 2, listedDate: T0 + 2 * HOUR, status: "leased" },
        { agencyId: 3, listedDate: T0 + 3 * HOUR, status: "withdrawn" },
        { agencyId: 3, listedDate: T0 + 4 * HOUR },
      ],
      meta: { asOf: T0 + 10 * HOUR, seed: 7, generatedAt: T0 + 11 * HOUR },
    });
  });
  afterEach(() => t.close());

  it("lists agencies sorted by name with id, name, state and suburb only", async () => {
    const rows = await t.repo.listAgencies();
    expect(rows).toEqual([
      { id: 2, name: "Rayblue Bondi", state: "NSW", suburb: "Bondi" },
      { id: 3, name: "Rayblue Carlton", state: "VIC", suburb: "Carlton" },
      { id: 1, name: "Rayblue Parramatta", state: "NSW", suburb: "Parramatta" },
    ]);
  });

  it("returns listing times in the half-open range [from, to), whatever the status", async () => {
    const rows = await t.repo.listListingTimes({ from: T0 + HOUR, to: T0 + 4 * HOUR });
    expect(rows.map((r) => r.listedDate).sort()).toEqual([T0 + HOUR, T0 + 2 * HOUR, T0 + 3 * HOUR]);
  });

  it("filters by the agency's state", async () => {
    const rows = await t.repo.listListingTimes({ from: T0, to: T0 + 24 * HOUR, state: "VIC" });
    expect(rows.every((r) => r.agencyId === 3)).toBe(true);
    expect(rows).toHaveLength(2);
    expect(await t.repo.listListingTimes({ from: T0, to: T0 + 24 * HOUR, state: "WA" })).toEqual([]);
  });

  it("filters by agency, combined with state", async () => {
    const all = { from: T0, to: T0 + 24 * HOUR };
    expect(await t.repo.listListingTimes({ ...all, agencyId: 1 })).toHaveLength(2);
    expect(await t.repo.listListingTimes({ ...all, agencyId: 1, state: "NSW" })).toHaveLength(2);
    expect(await t.repo.listListingTimes({ ...all, agencyId: 1, state: "VIC" })).toEqual([]);
  });

  it("AC-PRV-1: returns no address, rent or property manager fields", async () => {
    const [row] = await t.repo.listListingTimes({ from: T0, to: T0 + 24 * HOUR });
    expect(Object.keys(row).sort()).toEqual(["agencyId", "listedDate"]);
  });

  it("reads the dataset meta row", async () => {
    expect(await t.repo.getDatasetMeta()).toEqual({ asOf: T0 + 10 * HOUR, seed: 7, generatedAt: T0 + 11 * HOUR });
  });

  it("rejects with DataIntegrityError when the meta row is missing", async () => {
    t.setMeta(null);
    await expect(t.repo.getDatasetMeta()).rejects.toBeInstanceOf(DataIntegrityError);
  });

  it("pings an open database", async () => {
    await expect(t.repo.ping()).resolves.toBeUndefined();
  });

  it("maps a closed connection to DataUnavailableError with the driver error as cause", async () => {
    const onUnavailable = jest.fn();
    const sqlite = new Database(":memory:");
    applyMigrations(sqlite);
    const repo = createListingRepository(() => drizzle(sqlite), onUnavailable);
    sqlite.close();
    for (const call of [repo.ping(), repo.listAgencies(), repo.getDatasetMeta(), repo.listListingTimes({ from: 0, to: 1 })]) {
      const error = await call.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DataUnavailableError);
      expect((error as Error).message).toBe("The data source is unavailable.");
      expect((error as Error).cause).toHaveProperty("message");
    }
    expect(onUnavailable).toHaveBeenCalledTimes(4);
  });
});

describe("read-only database file", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rayblue-db-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const repoFor = (file: string) => createListingRepository(() => openReadOnly(file).db);

  it("rejects a missing file with DataUnavailableError", async () => {
    await expect(repoFor(path.join(dir, "missing.db")).ping()).rejects.toBeInstanceOf(DataUnavailableError);
    expect(fs.existsSync(path.join(dir, "missing.db"))).toBe(false);
  });

  it("rejects a corrupt file with DataUnavailableError", async () => {
    const file = path.join(dir, "corrupt.db");
    fs.writeFileSync(file, "this is not a database ".repeat(100));
    await expect(repoFor(file).ping()).rejects.toBeInstanceOf(DataUnavailableError);
    await expect(repoFor(file).listAgencies()).rejects.toBeInstanceOf(DataUnavailableError);
  });

  it("AC-SEC-3: opens the file read-only", () => {
    const file = path.join(dir, "ok.db");
    const rw = new Database(file);
    applyMigrations(rw);
    rw.close();
    const { sqlite } = openReadOnly(file);
    expect(sqlite.readonly).toBe(true);
    expect(() => sqlite.prepare("DELETE FROM agencies").run()).toThrow(/readonly/i);
    sqlite.close();
  });
});
