import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { applyMigrations } from "@/data/migrator";

// connection() needs a live Next request scope; outside one it is the only thing faked.
jest.mock("next/server", () => ({ connection: async () => {} }));

type Route = { GET: (request: Request) => Promise<Response> };

describe("API route handlers", () => {
  let dir: string;
  let file: string;
  let lines: string[];

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rayblue-api-"));
    file = path.join(dir, "app.db");
    process.env.DATABASE_URL = file;
    process.env.APP_VERSION = "v9.9.9";
    lines = [];
    jest.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    jest.resetModules();
  });
  afterEach(async () => {
    (await import("@/clients/db")).resetDb();
    jest.restoreAllMocks();
    delete process.env.DATABASE_URL;
    delete process.env.APP_VERSION;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const load = async (route: string): Promise<Route> =>
    route === "health" ? import("@/app/api/health/route") : import("@/app/api/[...path]/route");
  const get = (url: string) => new Request(`http://localhost${url}`);
  const entries = () => lines.map((l) => JSON.parse(l));

  describe("GET /api/health", () => {
    it("AC-REL-4: returns 200 ok with the version and no-store", async () => {
      const rw = new Database(file);
      applyMigrations(rw);
      rw.close();
      const response = await (await load("health")).GET(get("/api/health"));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ status: "ok", version: "v9.9.9", database: "ok" });
    });

    it("AC-REL-4: returns 503 unavailable when the database file is missing", async () => {
      const response = await (await load("health")).GET(get("/api/health"));
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ status: "error", version: "v9.9.9", database: "unavailable" });
    });

    it("AC-SEC-5: returns 503 for a corrupt file and leaks no path or driver detail", async () => {
      fs.writeFileSync(file, "garbage ".repeat(200));
      const response = await (await load("health")).GET(get("/api/health"));
      const body = await response.text();
      expect(response.status).toBe(503);
      expect(body).not.toMatch(/SQLITE|database disk|\/|stack/i);
      expect(lines.join("")).not.toContain(dir);
    });

    it("AC-REL-7: logs one line per request with route, method, status and duration", async () => {
      await (await load("health")).GET(get("/api/health"));
      const request = entries().find((e) => e.msg === "request");
      expect(request).toMatchObject({ level: "info", route: "/api/health", method: "GET", status: 503 });
      expect(typeof request.durationMs).toBe("number");
    });
  });

  describe("GET /api/<unknown>", () => {
    it("returns a JSON 404", async () => {
      const response = await (await load("catch-all")).GET(get("/api/listings"));
      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: "Not found" });
      expect(entries()).toContainEqual(expect.objectContaining({ route: "/api/[...path]", status: 404 }));
    });
  });

  it("AC-SEC-1: API route modules export GET only", async () => {
    for (const route of ["health", "catch-all"]) {
      const handlers = Object.keys(await load(route)).filter((k) => /^[A-Z]+$/.test(k));
      expect(handlers).toEqual(["GET"]);
    }
  });
});
