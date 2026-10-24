import { forbidden, notFound, redirect, unauthorized } from "next/navigation";
import { httpInterruptStatus, withRequestLog } from "@/app/api/_lib/respond";

const request = new Request("http://localhost/api/thing");
const run = (handler: () => never) => withRequestLog("/api/thing", request, async () => handler());

let lines: string[];
beforeAll(() => {
  process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";
});
afterAll(() => {
  delete process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS;
});
beforeEach(() => {
  lines = [];
  jest.spyOn(console, "log").mockImplementation((line: unknown) => {
    lines.push(String(line));
  });
});
afterEach(() => jest.restoreAllMocks());

describe("withRequestLog: HTTP interrupts (ADR 0006)", () => {
  it.each([
    [unauthorized, 401, "Unauthorized"],
    [forbidden, 403, "Forbidden"],
    [notFound, 404, "Not found"],
  ] as const)("turns %p into JSON %i, not a 500", async (interrupt, status, error) => {
    const response = await run(interrupt);
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error });
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: "info", msg: "request", status });
  });

  it("lets other framework interrupts through to Next", async () => {
    await expect(run(() => redirect("/rental-analytics"))).rejects.toHaveProperty("digest", expect.stringMatching(/^NEXT_REDIRECT/));
  });

  it("still turns an ordinary error into a logged JSON 500", async () => {
    const response = await run(() => {
      throw new Error("boom");
    });
    expect(response.status).toBe(500);
    expect(JSON.parse(lines[0])).toMatchObject({ level: "error", status: 500 });
  });

  it("recognises only the documented digest shape", () => {
    expect(httpInterruptStatus({ digest: "NEXT_HTTP_ERROR_FALLBACK;403" })).toBe(403);
    for (const value of [null, undefined, new Error("x"), { digest: "NEXT_HTTP_ERROR_FALLBACK;500" }, { digest: "403" }]) {
      expect(httpInterruptStatus(value)).toBeNull();
    }
  });
});
