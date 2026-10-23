import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

// `*.test.ts` runs in Node (utils, services, data, route handlers);
// `*.test.tsx` runs in jsdom (components, pages).
const node = await createJestConfig({
  displayName: "node",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
})();

const dom = await createJestConfig({
  displayName: "dom",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
})();

const config = {
  projects: [node, dom],
  coverageProvider: "v8",
  collectCoverageFrom: ["src/utils/**/*.ts", "src/services/**/*.ts", "!src/**/*.test.ts"],
};

export default config;
