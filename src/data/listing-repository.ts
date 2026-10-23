import { and, asc, eq, gte, lt, type SQL } from "drizzle-orm";
import { getDb, resetDb, type Db } from "@/clients/db";
import { agencies, datasetMeta, listings } from "@/data/schema";
import type {
  AgencyRecord,
  DatasetMeta,
  ListingRepository,
  ListingTime,
  ListingTimeQuery,
} from "@/data/repository.types";
import { DataIntegrityError, DataUnavailableError } from "@/utils/errors";

/**
 * Builds a repository over a Drizzle connection. `getConnection` is called per query so a
 * reset connection is reopened; `onUnavailable` runs after any driver failure.
 */
export function createListingRepository(
  getConnection: () => Db,
  onUnavailable: () => void = () => {},
): ListingRepository {
  async function run<T>(query: (db: Db) => T): Promise<T> {
    try {
      return query(getConnection());
    } catch (error) {
      if (error instanceof DataIntegrityError) throw error;
      onUnavailable();
      throw error instanceof DataUnavailableError ? error : new DataUnavailableError({ cause: error });
    }
  }

  return {
    listAgencies: () =>
      run(
        (db): AgencyRecord[] =>
          db
            .select({ id: agencies.id, name: agencies.name, state: agencies.state, suburb: agencies.suburb })
            .from(agencies)
            .orderBy(asc(agencies.name), asc(agencies.id))
            .all(),
      ),

    listListingTimes: (query: ListingTimeQuery) =>
      run((db): ListingTime[] => {
        const conditions: SQL[] = [gte(listings.listedDate, query.from), lt(listings.listedDate, query.to)];
        if (query.agencyId !== undefined) conditions.push(eq(listings.agencyId, query.agencyId));
        if (query.state !== undefined) conditions.push(eq(agencies.state, query.state));
        return db
          .select({ agencyId: listings.agencyId, listedDate: listings.listedDate })
          .from(listings)
          .innerJoin(agencies, eq(listings.agencyId, agencies.id))
          .where(and(...conditions))
          .all();
      }),

    getDatasetMeta: () =>
      run((db): DatasetMeta => {
        const row = db
          .select({ asOf: datasetMeta.asOf, seed: datasetMeta.seed, generatedAt: datasetMeta.generatedAt })
          .from(datasetMeta)
          .orderBy(asc(datasetMeta.id))
          .limit(1)
          .get();
        if (!row) throw new DataIntegrityError("no dataset as-of time.");
        return row;
      }),

    // Reads a real table so a missing, corrupt or unreadable file fails here.
    ping: () =>
      run((db) => {
        db.select({ id: datasetMeta.id }).from(datasetMeta).limit(1).all();
      }),
  };
}

let repository: ListingRepository | undefined;

/** The runtime repository over the read-only database file. */
export function getListingRepository(): ListingRepository {
  repository ??= createListingRepository(getDb, resetDb);
  return repository;
}
