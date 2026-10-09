import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    // Test-only secret so lib/auth/jwt.ts doesn't need a real .env.local to run unit tests.
    env: { AUTH_JWT_SECRET: "vitest-only-secret-do-not-use-in-production-0123456789abcdef" },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
