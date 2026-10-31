/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  moduleNameMapper: {
    // Test against the shared package's source so no build step is needed.
    "^@edutrack/shared$": "<rootDir>/../spms-shared/src/index.ts",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { diagnostics: { warnOnly: false } }],
  },
  globalSetup: "<rootDir>/tests/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/globalTeardown.ts",
  setupFiles: ["<rootDir>/tests/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000,
};
