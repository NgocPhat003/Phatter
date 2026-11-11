import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";

const mockDb = vi.hoisted(() => {
  const createdRecords: any[] = [];
  return {
    createdRecords,
    db: {
      orm: {
        public: {
          RefreshToken: {
            create: vi.fn(async (data: any) => {
              createdRecords.push(data);
              return { id: "rt_mock_1", ...data };
            }),
          },
        },
      },
    },
  };
});

vi.mock("phatter-db", () => ({ db: mockDb.db }));

import { issueTokens, clearTokenCookies } from "../../shared/utils/tokens.util.js";
import { hashToken, verifyAccessToken, verifyRefreshToken } from "../../shared/utils/jwt.util.js";
import { jwtConfig } from "../../shared/config/jwt.config.js";

describe("tokens.util", () => {
  beforeEach(() => {
    mockDb.createdRecords.length = 0;
    vi.clearAllMocks();
  });

  const createMockResponse = () => {
    const res = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as Response;
    return res;
  };

  describe("issueTokens", () => {
    it("sets HttpOnly access & scoped refresh cookies and stores SHA-256 hash in DB", async () => {
      const res = createMockResponse();

      await issueTokens(res, { userId: "usr_abc", isGuestSandbox: false });

      expect(res.cookie).toHaveBeenCalledTimes(2);

      const [accessName, accessToken, accessOpts] = (res.cookie as any).mock.calls[0];
      const [refreshName, refreshToken, refreshOpts] = (res.cookie as any).mock.calls[1];

      expect(accessName).toBe(jwtConfig.accessCookieName);
      expect(accessOpts.httpOnly).toBe(true);
      expect(verifyAccessToken(accessToken).userId).toBe("usr_abc");

      expect(refreshName).toBe(jwtConfig.refreshCookieName);
      expect(refreshOpts.httpOnly).toBe(true);
      expect(refreshOpts.path).toBe("/api/auth");
      expect(verifyRefreshToken(refreshToken).userId).toBe("usr_abc");

      expect(mockDb.createdRecords).toHaveLength(1);
      const saved = mockDb.createdRecords[0];
      expect(saved.userId).toBe("usr_abc");
      expect(saved.tokenHash).toBe(hashToken(refreshToken));
      expect(saved.tokenHash).not.toBe(refreshToken);
      expect(saved.family).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(saved.expiresAt).toBeDefined();
    });

    it("preserves an existing family UUID during token rotation", async () => {
      const res = createMockResponse();
      const existingFamily = "11111111-2222-3333-4444-555555555555";

      await issueTokens(
        res,
        { userId: "usr_abc", isGuestSandbox: false },
        existingFamily
      );

      expect(mockDb.createdRecords[0]?.family).toBe(existingFamily);
    });
  });

  describe("clearTokenCookies", () => {
    it("clears access_token, scoped refresh_token (/api/auth), and legacy jwt cookies", () => {
      const res = createMockResponse();

      clearTokenCookies(res);

      expect(res.clearCookie).toHaveBeenCalledWith(
        jwtConfig.accessCookieName,
        expect.objectContaining({ httpOnly: true })
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        jwtConfig.refreshCookieName,
        expect.objectContaining({ httpOnly: true, path: "/api/auth" })
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        "jwt",
        expect.objectContaining({ httpOnly: true })
      );
    });
  });
});
