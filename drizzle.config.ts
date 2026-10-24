import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/data/schema.ts",
  out: "./src/data/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "./data/rayblue.db" },
});
