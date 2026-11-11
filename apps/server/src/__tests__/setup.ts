import { Temporal } from "@js-temporal/polyfill";

if (!(globalThis as any).Temporal) {
  (globalThis as any).Temporal = Temporal;
}

// Inject deterministic test configuration before dotenv / env.ts evaluates
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/phatter_test";
process.env.JWT_SECRET = "test-access-secret-key-for-vitest-32chars";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-key-for-vitest-32chars";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
