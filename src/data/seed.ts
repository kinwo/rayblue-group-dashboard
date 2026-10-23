// `npm run db:seed`: writes the synthetic dataset into the migrated database (build time only, AC-REL-3).
import Database from "better-sqlite3";
import { loadEnv } from "@/clients/env";
import { parseSeedOptions } from "@/data/seed-config";
import { generateDataset, writeDataset } from "@/data/seed-data";

function main(): void {
  const { DATABASE_URL } = loadEnv();
  const { seed, asOf } = parseSeedOptions(process.env);
  const dataset = generateDataset(seed, asOf);
  const sqlite = new Database(DATABASE_URL, { fileMustExist: true });
  try {
    writeDataset(sqlite, dataset);
  } finally {
    sqlite.close();
  }
  console.log(
    JSON.stringify({
      level: "info",
      msg: "Dataset seeded.",
      seed,
      asOf: new Date(asOf).toISOString(),
      agencies: dataset.agencies.length,
      listings: dataset.listings.length,
    }),
  );
}

main();
