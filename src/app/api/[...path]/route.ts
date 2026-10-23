import { jsonResponse, withRequestLog } from "@/app/api/_lib/respond";

// Unknown API paths get a JSON 404 rather than the HTML not-found page. Other methods
// never reach a handler: proxy.ts answers them with 405 (AC-SEC-1: only GET handlers exist).
export async function GET(request: Request): Promise<Response> {
  return withRequestLog("/api/[...path]", request, async () => jsonResponse({ error: "Not found" }, 404));
}
