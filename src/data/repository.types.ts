import type { StateCode } from "@/utils/states";

// The only shapes that leave src/data. They carry ids, names, states and
// timestamps; never addresses, rents or people (AC-PRV-1).

export type AgencyRecord = {
  id: number;
  name: string;
  state: StateCode;
  suburb: string;
};

/** One listing, reduced to what counting needs. `listedDate` is UTC epoch ms. */
export type ListingTime = {
  agencyId: number;
  listedDate: number;
};

/** Half-open range [from, to) in UTC epoch ms, optionally narrowed by the agency's state or by agency. */
export type ListingTimeQuery = {
  from: number;
  to: number;
  state?: StateCode;
  agencyId?: number;
};

export type DatasetMeta = {
  /** When the dataset was last refreshed, UTC epoch ms. "Today" etc. are relative to this. */
  asOf: number;
  seed: number;
  generatedAt: number;
};

/**
 * Read-only access to the dataset. Every method rejects with
 * `DataUnavailableError` when the database cannot be read, and
 * `getDatasetMeta` with `DataIntegrityError` when the meta row is missing.
 */
export interface ListingRepository {
  listAgencies(): Promise<AgencyRecord[]>;
  listListingTimes(query: ListingTimeQuery): Promise<ListingTime[]>;
  getDatasetMeta(): Promise<DatasetMeta>;
  /** Cheap read that proves the database is reachable (health check). */
  ping(): Promise<void>;
}
