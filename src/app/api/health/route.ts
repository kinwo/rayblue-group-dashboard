import { connection } from "next/server";
import { checkHealth } from "@/services/health";
import { jsonResponse, withRequestLog } from "@/app/api/_lib/respond";

/** AC-REL-4: 200 when the database can be read, 503 otherwise. Never cached. */
export async function GET(request: Request): Promise<Response> {
  return withRequestLog("/api/health", request, async () => {
    // Opt out of prerendering (Cache Components): health is always measured per request.
    await connection();
    const report = await checkHealth();
    return jsonResponse(report, report.status === "ok" ? 200 : 503);
  });
}
