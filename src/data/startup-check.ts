// Start-up checks (AC-REL-5): a broken release fails at start, not on the first request.
import fs from "node:fs";
import { InvalidEnvError, loadEnv, type Env } from "@/clients/env";
import { openReadOnly } from "@/clients/db";
import { appliedMigrationHashes, expectedMigrationHashes, MIGRATIONS_FOLDER } from "@/data/migrator";

export type StartupFailureReason =
  | "invalid_env"
  | "database_missing"
  | "database_unreadable"
  | "migration_mismatch";

const MESSAGES: Record<StartupFailureReason, string> = {
  invalid_env: "Environment variables are missing or invalid.",
  database_missing: "The database file does not exist.",
  database_unreadable: "The database file cannot be opened or read.",
  migration_mismatch: "The database is on a different migration than the code expects.",
};

/** Safe to log: the message names the problem, never a path, value or SQL. */
export class StartupCheckError extends Error {
  readonly name = "StartupCheckError";
  constructor(
    readonly reason: StartupFailureReason,
    options?: { cause?: unknown },
  ) {
    const detail = options?.cause instanceof InvalidEnvError ? ` (${options.cause.variables.join(", ")})` : "";
    super(MESSAGES[reason] + detail, options);
  }
}

export function checkEnv(source: Record<string, string | undefined>): Env {
  try {
    return loadEnv(source);
  } catch (error) {
    throw new StartupCheckError("invalid_env", { cause: error });
  }
}

/** The file exists, opens read-only, and its applied migrations equal the committed ones, in order. */
export function checkDatabase(file: string, migrationsFolder = MIGRATIONS_FOLDER): void {
  if (!fs.existsSync(file)) throw new StartupCheckError("database_missing");
  let applied: string[];
  try {
    const { sqlite } = openReadOnly(file);
    try {
      applied = appliedMigrationHashes(sqlite);
    } finally {
      sqlite.close();
    }
  } catch (error) {
    throw new StartupCheckError("database_unreadable", { cause: error });
  }
  const expected = expectedMigrationHashes(migrationsFolder);
  const matches = applied.length === expected.length && applied.every((hash, i) => hash === expected[i]);
  if (!matches) throw new StartupCheckError("migration_mismatch");
}

/** Runs every check; throws `StartupCheckError` on the first failure. */
export function runStartupChecks(source: Record<string, string | undefined> = process.env): Env {
  const env = checkEnv(source);
  checkDatabase(env.DATABASE_URL);
  return env;
}
