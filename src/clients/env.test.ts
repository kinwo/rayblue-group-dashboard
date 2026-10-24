import { InvalidEnvError, loadEnv } from "@/clients/env";
import { version } from "../../package.json";

describe("loadEnv", () => {
  it("applies defaults when nothing is set", () => {
    expect(loadEnv({})).toEqual({ DATABASE_URL: "./data/rayblue.db", APP_VERSION: version, LOG_LEVEL: "info" });
  });

  it("treats empty strings as unset", () => {
    expect(loadEnv({ DATABASE_URL: "", LOG_LEVEL: "" }).DATABASE_URL).toBe("./data/rayblue.db");
  });

  it("reads provided values", () => {
    expect(loadEnv({ DATABASE_URL: "/srv/app.db", APP_VERSION: "v1.0.1", LOG_LEVEL: "warn" })).toEqual({
      DATABASE_URL: "/srv/app.db",
      APP_VERSION: "v1.0.1",
      LOG_LEVEL: "warn",
    });
  });

  it("AC-SEC-5: names invalid variables without echoing their values", () => {
    let error: unknown;
    try {
      loadEnv({ LOG_LEVEL: "s3cret-verbose" });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(InvalidEnvError);
    expect((error as InvalidEnvError).variables).toEqual(["LOG_LEVEL"]);
    expect((error as Error).message).not.toContain("s3cret");
  });
});
