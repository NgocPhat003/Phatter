import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockState = vi.hoisted(() => ({
  shouldFailHealth: false,
  instance: null as any,
}));

vi.mock("phatter-db", async () => {
  const { createMockDatabase } = await import("../helpers/mockDb.js");
  const instance = createMockDatabase();
  mockState.instance = instance;

  return {
    db: {
      orm: {
        public: {
          ...instance.db.orm.public,
          User: {
            ...instance.db.orm.public.User,
            aggregate: async (fn: any) => {
              if (mockState.shouldFailHealth) {
                throw new Error("Simulated Neon connection timeout");
              }
              return instance.db.orm.public.User.aggregate(fn);
            },
          },
        },
      },
    },
  };
});

import { app } from "../../app.js";

describe("Integration — Gateway Status & Health Endpoints", () => {
  beforeEach(() => {
    mockState.shouldFailHealth = false;
    mockState.instance?.resetAll();
  });

  describe("GET /api/status & GET /status (Atmospheric Shield)", () => {
    it("GET /api/status returns 200 live status immediately with zero DB overhead", async () => {
      const res = await request(app).get("/api/status");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: "live",
        service: "phatter-api",
      });
      expect(typeof res.body.uptime).toBe("number");
      expect(typeof res.body.timestamp).toBe("number");
    });

    it("GET /status alias returns 200 live status", async () => {
      const res = await request(app).get("/status");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("live");
    });
  });

  describe("GET /api/health", () => {
    it("returns 200 with connected status and registered user count", async () => {
      await mockState.instance.tables.User.create({
        username: "sarah_dev",
        email: "sarah@phatter.com",
      });
      await mockState.instance.tables.User.create({
        username: "alexchen",
        email: "alex@phatter.com",
      });

      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: "ok",
        database: "connected",
        registeredUsers: 2,
      });
      expect(typeof res.body.timestamp).toBe("string");
    });

    it("returns 500 when the database query fails", async () => {
      mockState.shouldFailHealth = true;

      const res = await request(app).get("/api/health");

      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({
        status: "error",
        message: "Database connection failed",
        error: "Simulated Neon connection timeout",
      });
    });
  });
});
