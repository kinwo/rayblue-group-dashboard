import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { onRequestError, register } from "@/instrumentation";

describe("instrumentation", () => {
  let lines: string[];
  let exit: jest.SpyInstance;
  let dir: string;

  beforeEach(() => {
    lines = [];
    jest.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    exit = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rayblue-instr-"));
    process.env.NEXT_RUNTIME = "nodejs";
    process.env.DATABASE_URL = path.join(dir, "missing.db");
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NEXT_RUNTIME;
    delete process.env.DATABASE_URL;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("AC-REL-5: exits 1 with one JSON line when the database file is missing", async () => {
    await register();
    expect(exit).toHaveBeenCalledWith(1);
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: "error", msg: "startup_check_failed", reason: "database_missing" });
    expect(lines[0]).not.toContain(dir);
  });

  it("does nothing outside the Node runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    await register();
    expect(exit).not.toHaveBeenCalled();
    expect(lines).toEqual([]);
  });

  it("logs request errors with route, status and error name only", async () => {
    const error = Object.assign(new Error("SELECT * FROM listings failed at /srv/app.db"), { digest: "123" });
    await onRequestError(
      error,
      { path: "/?state=NSW", method: "GET", headers: { cookie: "sid=1" } },
      {
        routerKind: "App Router",
        routePath: "/",
        routeType: "render",
        renderSource: "server-rendering",
        revalidateReason: undefined,
      },
    );
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      level: "error",
      msg: "request_failed",
      route: "/",
      method: "GET",
      status: 500,
      digest: "123",
      error: { name: "Error" },
    });
    expect(lines[0]).not.toMatch(/SELECT|\/srv|sid=1|stack/);
  });
});
