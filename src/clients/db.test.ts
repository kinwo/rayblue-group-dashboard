import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";

// Matched by message: jest.resetModules() gives each test its own copy of the error class.
const UNAVAILABLE = /The data source is unavailable/;

function makeDb(file: string, marker: number): void {
  const rw = new Database(file);
  rw.exec(`CREATE TABLE marker (v INTEGER); INSERT INTO marker VALUES (${marker});`);
  rw.close();
}

describe("runtime db client", () => {
  let dir: string;
  let file: string;
  let client: typeof import("@/clients/db");

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rayblue-client-"));
    file = path.join(dir, "app.db");
    process.env.DATABASE_URL = file;
    jest.resetModules();
    client = await import("@/clients/db");
  });
  afterEach(() => {
    client.resetDb();
    delete process.env.DATABASE_URL;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const readMarker = () => client.getDb().get<{ v: number }>(sql`SELECT v FROM marker`)?.v;

  it("throws DataUnavailableError when the file is missing, without creating it", () => {
    expect(() => client.getDb()).toThrow(UNAVAILABLE);
    expect(fs.existsSync(file)).toBe(false);
  });

  it("opens lazily once and reuses the connection", () => {
    makeDb(file, 1);
    expect(client.getDb()).toBe(client.getDb());
    expect(readMarker()).toBe(1);
  });

  it("fails once the file is removed, then reconnects when it is restored", () => {
    makeDb(file, 1);
    expect(readMarker()).toBe(1);
    fs.rmSync(file);
    expect(() => client.getDb()).toThrow(UNAVAILABLE);
    makeDb(file, 2);
    expect(readMarker()).toBe(2);
  });

  it("reconnects when the file is replaced in place", () => {
    makeDb(file, 1);
    expect(readMarker()).toBe(1);
    const next = path.join(dir, "next.db");
    makeDb(next, 3);
    fs.renameSync(next, file);
    expect(readMarker()).toBe(3);
  });
});
