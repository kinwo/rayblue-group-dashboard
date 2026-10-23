import type { Instrumentation } from "next";
import { logger } from "@/utils/logger";

/**
 * Runs once when a Next.js server starts. On Node it validates env, the database file
 * and its migrations, and exits non-zero with one log line on failure (AC-REL-5).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Build workers start servers too; the database is checked when the release runs.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { runStartupChecks } = await import("@/data/startup-check");
  try {
    const env = runStartupChecks();
    logger.info("startup_check_passed", { version: env.APP_VERSION });
  } catch (error) {
    const reason = (error as { reason?: unknown }).reason;
    logger.error("startup_check_failed", { reason: typeof reason === "string" ? reason : "unknown", error });
    process.exit(1);
  }
}

/** Logs every server-side request failure as one structured line, without the stack (AC-REL-7). */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest = (error as { digest?: unknown } | null)?.digest;
  logger.error("request_failed", {
    route: context.routePath,
    method: request.method,
    status: 500,
    reason: context.routeType,
    digest: typeof digest === "string" ? digest : undefined,
    error,
  });
};
