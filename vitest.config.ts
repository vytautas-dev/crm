import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Integration tests run against the live local Supabase stack (`npx supabase start`),
// so no mocking. `loadEnv(mode, cwd, "")` pulls every key from `.env` (empty prefix =
// no VITE_ filter) and injects it into `process.env` for the test run — that's how the
// canary test reads SUPABASE_URL / SUPABASE_KEY / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_URL.
export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
