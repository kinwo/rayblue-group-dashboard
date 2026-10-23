import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { applyMigrations, MIGRATIONS_FOLDER } from "@/data/migrator";
import { checkDatabase, checkEnv, runStartupChecks, StartupCheckError } from "@/data/startup-check";

function reasonOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(StartupCheckError);
    return (error as StartupCheckError).reason;
  }
  return undefined;
}

describe("start-up checks (AC-REL-5)", () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rayblue-startup-"));
    file = path.join(dir, "app.db");
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const migrated = () => {
    const rw = new Database(file);
    applyMigrations(rw);
    rw.close();
  };

  it("pass for a migrated database and valid env", () => {
    migrated();
    expect(runStartupChecks({ DATABASE_URL: file }).DATABASE_URL).toBe(file);
  });

  it("fail with invalid_env for a bad variable, naming it but not its value", () => {
    expect(reasonOf(() => checkEnv({ LOG_LEVEL: "loud-secret" }))).toBe("invalid_env");
    try {
      runStartupChecks({ LOG_LEVEL: "loud-secret" });
    } catch (error) {
      expect((error as Error).message).toContain("LOG_LEVEL");
      expect((error as Error).message).not.toContain("loud-secret");
    }
  });

  it("fail with database_missing when the file does not exist, without creating it", () => {
    expect(reasonOf(() => checkDatabase(file))).toBe("database_missing");
    expect(fs.existsSync(file)).toBe(false);
  });

  it("fail with database_unreadable for a corrupt file", () => {
    fs.writeFileSync(file, "not sqlite ".repeat(200));
    expect(reasonOf(() => checkDatabase(file))).toBe("database_unreadable");
  });

  it("fail with migration_mismatch for a never-migrated database", () => {
    new Database(file).close();
    expect(reasonOf(() => checkDatabase(file))).toBe("migration_mismatch");
  });

  it("fail with migration_mismatch when the database has a different migration", () => {
    migrated();
    const rw = new Database(file);
    rw.prepare("UPDATE __drizzle_migrations SET hash = 'other'").run();
    rw.close();
    expect(reasonOf(() => checkDatabase(file))).toBe("migration_mismatch");
  });

  it("fail with migration_mismatch when the code has a migration the database lacks", () => {
    migrated();
    const folder = path.join(dir, "migrations");
    fs.cpSync(MIGRATIONS_FOLDER, folder, { recursive: true });
    const journalFile = path.join(folder, "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalFile, "utf8"));
    journal.entries.push({ idx: 1, version: "6", when: Date.UTC(2030, 0, 1), tag: "0001_next", breakpoints: true });
    fs.writeFileSync(journalFile, JSON.stringify(journal));
    fs.writeFileSync(path.join(folder, "0001_next.sql"), "CREATE TABLE extra (id integer);");
    expect(reasonOf(() => checkDatabase(file, folder))).toBe("migration_mismatch");
  });

  it("never put the database path in the error message", () => {
    for (const fn of [() => checkDatabase(file), () => checkDatabase(path.join(dir, "x", "y.db"))]) {
      try {
        fn();
      } catch (error) {
        expect((error as Error).message).not.toContain(dir);
      }
    }
  });
});
