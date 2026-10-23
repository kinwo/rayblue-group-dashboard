import { checkHealth } from "@/services/health";
import { createTestDatabase } from "@/test/db";

describe("checkHealth (AC-REL-4)", () => {
  beforeEach(() => jest.spyOn(console, "log").mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it("reports ok when the database answers", async () => {
    const t = createTestDatabase();
    await expect(checkHealth({ repo: t.repo, version: "v1.2.3" })).resolves.toEqual({
      status: "ok",
      version: "v1.2.3",
      database: "ok",
    });
    t.close();
  });

  it("reports unavailable when the database cannot be read", async () => {
    const t = createTestDatabase();
    t.close();
    await expect(checkHealth({ repo: t.repo, version: "v1.2.3" })).resolves.toEqual({
      status: "error",
      version: "v1.2.3",
      database: "unavailable",
    });
  });
});
