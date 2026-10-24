import { clientKey, createRateLimiter } from "@/clients/rate-limiter";

describe("createRateLimiter", () => {
  it("allows up to the limit per minute, then rejects with a retry delay", async () => {
    const limit = createRateLimiter({ page: 2, api: 1 });
    expect(await limit("page", "1.1.1.1")).toEqual({ allowed: true });
    expect(await limit("page", "1.1.1.1")).toEqual({ allowed: true });
    const rejected = await limit("page", "1.1.1.1");
    expect(rejected.allowed).toBe(false);
    if (!rejected.allowed) {
      expect(rejected.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(rejected.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("counts each client and each scope separately", async () => {
    const limit = createRateLimiter({ page: 1, api: 1 });
    expect((await limit("page", "1.1.1.1")).allowed).toBe(true);
    expect((await limit("page", "2.2.2.2")).allowed).toBe(true);
    expect((await limit("api", "1.1.1.1")).allowed).toBe(true);
    expect((await limit("page", "1.1.1.1")).allowed).toBe(false);
    expect((await limit("api", "1.1.1.1")).allowed).toBe(false);
  });

  it("never limits a scope set to 0", async () => {
    const limit = createRateLimiter({ page: 0, api: 1 });
    for (let i = 0; i < 50; i += 1) expect((await limit("page", "1.1.1.1")).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  const headers = (entries: Record<string, string>) => new Headers(entries);

  it("uses the last X-Forwarded-For entry, the one the trusted proxy appended", () => {
    expect(clientKey(headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.7 " }))).toBe("203.0.113.7");
    expect(clientKey(headers({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP, then to one shared bucket", () => {
    expect(clientKey(headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientKey(headers({ "x-forwarded-for": " " }))).toBe("unknown");
    expect(clientKey(headers({}))).toBe("unknown");
  });
});
