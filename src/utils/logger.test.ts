import { createLogger, toSafeError, type LogEntry } from "@/utils/logger";
import { DataIntegrityError, DataUnavailableError } from "@/utils/errors";

const NOW = Date.UTC(2026, 9, 23, 22, 0, 0);

function capture(level?: "debug" | "info" | "warn" | "error") {
  const lines: string[] = [];
  const logger = createLogger({ level, write: (line) => lines.push(line), now: () => NOW });
  return { logger, lines, entries: () => lines.map((l) => JSON.parse(l) as LogEntry) };
}

describe("logger (AC-REL-7)", () => {
  it("writes one JSON object per line with time, level, msg, route, status and duration", () => {
    const { logger, lines, entries } = capture();
    logger.info("request", { route: "/api/health", method: "GET", status: 200, durationMs: 3.6 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain("\n");
    expect(entries()[0]).toEqual({
      time: "2026-10-23T22:00:00.000Z",
      level: "info",
      msg: "request",
      route: "/api/health",
      method: "GET",
      status: 200,
      durationMs: 4,
    });
  });

  it("drops fields it does not know, so bodies, cookies and headers cannot be logged", () => {
    const { logger, lines } = capture();
    logger.info("request", { route: "/", cookie: "sid=abc", body: "secret" } as never);
    expect(lines[0]).not.toContain("sid=abc");
    expect(lines[0]).not.toContain("secret");
  });

  it("keeps a message on one line", () => {
    const { logger, lines } = capture();
    logger.warn("a\nb\r\nc");
    expect(JSON.parse(lines[0]).msg).toBe("a b c");
  });

  it("filters by level", () => {
    const { logger, entries } = capture("warn");
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(entries().map((e) => e.level)).toEqual(["warn", "error"]);
  });

  it("AC-SEC-5: logs errors as name, safe message and code, never a stack, SQL or path", () => {
    const { logger, lines } = capture();
    const driver = Object.assign(new Error("near \"SELEC\": syntax error in /srv/data/app.db"), {
      code: "SQLITE_ERROR",
    });
    logger.error("request_failed", { error: new DataUnavailableError({ cause: driver }) });
    logger.error("request_failed", { error: driver });
    const [wrapped, raw] = lines.map((l) => JSON.parse(l).error);
    expect(wrapped).toEqual({ name: "DataUnavailableError", message: "The data source is unavailable.", code: "SQLITE_ERROR" });
    expect(raw).toEqual({ name: "Error", code: "SQLITE_ERROR" });
    for (const line of lines) {
      expect(line).not.toMatch(/at .*\(|\/srv|SELEC|stack/);
    }
  });
});

describe("toSafeError", () => {
  it("handles non-errors and odd names", () => {
    expect(toSafeError("boom")).toEqual({ name: "string" });
    expect(toSafeError(Object.assign(new Error("x"), { name: "bad name /path" }))).toEqual({ name: "Error" });
    expect(toSafeError(new DataIntegrityError("no as-of."))).toEqual({
      name: "DataIntegrityError",
      message: "The dataset is invalid: no as-of.",
    });
  });
});
