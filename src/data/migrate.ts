// `npm run db:migrate`: the only place, with the seed, that opens the database read-write (AC-REL-3).
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { loadEnv } from "@/clients/env";
import { applyMigrations } from "@/data/migrator";

function main(): void {
  const { DATABASE_URL } = loadEnv();
  fs.mkdirSync(path.dirname(DATABASE_URL), { recursive: true });
  const sqlite = new Database(DATABASE_URL);
  try {
    applyMigrations(sqlite);
  } finally {
    sqlite.close();
  }
  console.log(JSON.stringify({ level: "info", msg: "Migrations applied." }));
}

main();
