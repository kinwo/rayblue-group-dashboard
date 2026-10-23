// Node-only half of instrumentation.ts, imported dynamically so the Edge bundle never sees it.
import { runStartupChecks } from "@/data/startup-check";
import { logger } from "@/utils/logger";

/** AC-REL-5: on any failed check, one JSON log line and a non-zero exit. */
export function checkStartupOrExit(): void {
  try {
    const env = runStartupChecks();
    logger.info("startup_check_passed", { version: env.APP_VERSION });
  } catch (error) {
    const reason = (error as { reason?: unknown }).reason;
    logger.error("startup_check_failed", { reason: typeof reason === "string" ? reason : "unknown", error });
    process.exit(1);
  }
}
