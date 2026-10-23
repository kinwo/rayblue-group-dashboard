import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { getEnv } from "@/clients/env";
import { DataUnavailableError } from "@/utils/errors";

export type Db = BetterSQLite3Database;

/** How long a read waits for a lock held by another process before failing. */
export const BUSY_TIMEOUT_MS = 2000;

type Connection = { sqlite: Database.Database; db: Db; inode: number };

let connection: Connection | null = null;

/** Opens the SQLite file read-only (AC-SEC-3). Any failure becomes `DataUnavailableError`. */
export function openReadOnly(file: string): { sqlite: Database.Database; db: Db } {
  try {
    const sqlite = new Database(file, { readonly: true, fileMustExist: true, timeout: BUSY_TIMEOUT_MS });
    return { sqlite, db: drizzle(sqlite) };
  } catch (error) {
    throw new DataUnavailableError({ cause: error });
  }
}

function currentInode(file: string): number {
  try {
    return fs.statSync(file).ino;
  } catch (error) {
    resetDb();
    throw new DataUnavailableError({ cause: error });
  }
}

/**
 * The runtime database, opened lazily once per process. Reconnects when the file
 * was replaced (restored from a release) and fails when it was removed, instead of
 * reading a deleted file through a stale handle.
 */
export function getDb(): Db {
  const file = getEnv().DATABASE_URL;
  const inode = currentInode(file);
  if (connection && connection.inode !== inode) resetDb();
  if (!connection) connection = { ...openReadOnly(file), inode };
  return connection.db;
}

/** Closes the connection so the next `getDb()` reopens the file. */
export function resetDb(): void {
  const stale = connection;
  connection = null;
  try {
    stale?.sqlite.close();
  } catch {
    // Closing an already broken handle can throw; the handle is discarded either way.
  }
}
