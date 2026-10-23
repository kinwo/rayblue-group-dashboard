import { logger } from "@/utils/logger";

/** Every API response is computed per request and never stored by a cache. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/**
 * Runs an API handler and logs one line with route, method, status and duration (AC-REL-7).
 * An unexpected throw becomes a plain JSON 500; details stay in the server log (AC-SEC-5).
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
    error = caught;
    response = jsonResponse({ error: "Internal server error" }, 500);
  }
  const fields = { route, method: request.method, status: response.status, durationMs: performance.now() - started };
  if (error === undefined) logger.info("request", fields);
  else logger.error("request", { ...fields, error });
  return response;
}
