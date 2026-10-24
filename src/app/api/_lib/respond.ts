import { unstable_rethrow } from "next/navigation";
import { logger } from "@/utils/logger";

/** Every API response is computed per request and never stored by a cache. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** JSON bodies for the HTTP interrupts a handler may throw (`unauthorized()`, `forbidden()`, `notFound()`). */
const INTERRUPT_BODIES: Record<number, string> = { 401: "Unauthorized", 403: "Forbidden", 404: "Not found" };

/**
 * The status of a Next HTTP interrupt, or null. `forbidden()` and friends throw an error whose
 * digest is `NEXT_HTTP_ERROR_FALLBACK;<status>` (documented in next/dist/docs › forbidden).
 */
export function httpInterruptStatus(error: unknown): number | null {
  const digest = (error as { digest?: unknown } | null)?.digest;
  const match = typeof digest === "string" ? /^NEXT_HTTP_ERROR_FALLBACK;(\d{3})$/.exec(digest) : null;
  return match && Number(match[1]) in INTERRUPT_BODIES ? Number(match[1]) : null;
}

/**
 * Runs an API handler and logs one line with route, method, status and duration (AC-REL-7).
 * `unauthorized()` / `forbidden()` / `notFound()` become JSON 401/403/404 (ADR 0006); other
 * framework interrupts (redirects) pass through to Next. Any other throw becomes a plain JSON
 * 500; details stay in the server log (AC-SEC-5).
 */
export async function withRequestLog(
  route: string,
  request: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  const started = performance.now();
  let response: Response;
  let error: unknown;
  try {
    response = await handler();
  } catch (caught) {
    const status = httpInterruptStatus(caught);
    if (status !== null) {
      response = jsonResponse({ error: INTERRUPT_BODIES[status] }, status);
    } else {
      unstable_rethrow(caught);
      error = caught;
      response = jsonResponse({ error: "Internal server error" }, 500);
    }
  }
  const fields = { route, method: request.method, status: response.status, durationMs: performance.now() - started };
  if (error === undefined) logger.info("request", fields);
  else logger.error("request", { ...fields, error });
  return response;
}
