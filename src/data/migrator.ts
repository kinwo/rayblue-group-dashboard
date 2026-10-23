import path from "node:path";
import type Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

/** Committed migrations, resolved from the project root (where `next`, `tsx` and Jest run). */
export const MIGRATIONS_FOLDER = path.join(process.cwd(), "src", "data", "migrations");

const MIGRATIONS_TABLE = "__drizzle_migrations";

/** Applies every committed migration. Needs a read-write connection. */
export function applyMigrations(sqlite: Database.Database, migrationsFolder = MIGRATIONS_FOLDER): void {
  migrate(drizzle(sqlite), { migrationsFolder });
}

/** Hashes of the migrations committed with the code, oldest first. */
export function expectedMigrationHashes(migrationsFolder = MIGRATIONS_FOLDER): string[] {
  return readMigrationFiles({ migrationsFolder }).map((m) => m.hash);
}

/** Hashes recorded as applied in the database, oldest first; empty when never migrated. */
export function appliedMigrationHashes(sqlite: Database.Database): string[] {
  const table = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(MIGRATIONS_TABLE);
  if (!table) return [];
  const rows = sqlite
    .prepare(`SELECT hash FROM ${MIGRATIONS_TABLE} ORDER BY created_at, id`)
    .all() as { hash: string }[];
  return rows.map((r) => r.hash);
}
