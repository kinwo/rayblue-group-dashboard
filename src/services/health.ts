import { getListingRepository } from "@/data/listing-repository";
import { getAppVersion } from "@/data/release";
import type { ListingRepository } from "@/data/repository.types";
import { logger } from "@/utils/logger";

/** The `/api/health` body (AC-REL-4). Nothing else is ever exposed. */
export type HealthReport =
  | { status: "ok"; version: string; database: "ok" }
  | { status: "error"; version: string; database: "unavailable" };

export type HealthDeps = { repo: ListingRepository; version: string };

/** Pings the database; any failure reports "unavailable" and is logged without detail. */
export async function checkHealth(
  deps: HealthDeps = { repo: getListingRepository(), version: getAppVersion() },
): Promise<HealthReport> {
  try {
    await deps.repo.ping();
    return { status: "ok", version: deps.version, database: "ok" };
  } catch (error) {
    logger.warn("health_check_failed", { error });
    return { status: "error", version: deps.version, database: "unavailable" };
  }
}
