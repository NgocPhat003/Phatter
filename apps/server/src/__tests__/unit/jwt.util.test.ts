import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../../shared/utils/jwt.util.js";
import { jwtConfig } from "../../shared/config/jwt.config.js";

describe("jwt.util", () => {
  const samplePayload = {
    userId: "usr_1234567890",
    isGuestSandbox: false,
  };

  describe("Access Tokens", () => {
    it("signs and verifies a valid access token payload", () => {
      const token = signAccessToken(samplePayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(samplePayload.userId);
      expect(decoded.isGuestSandbox).toBe(false);
    });

    it("rejects an access token signed with the refresh secret", () => {
      const refreshToken = signRefreshToken(samplePayload);
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });

    it("rejects a tampered or expired access token", () => {
      const token = signAccessToken(samplePayload);
      const tampered = `${token.slice(0, -4)}xxxx`;
      expect(() => verifyAccessToken(tampered)).toThrow();

      const expired = jwt.sign(samplePayload, jwtConfig.accessSecret, {
        expiresIn: -10,
      });
      expect(() => verifyAccessToken(expired)).toThrow();
    });
  });

  describe("Refresh Tokens", () => {
    it("signs and verifies a valid refresh token payload", () => {
      const token = signRefreshToken({
        userId: "usr_guest_01",
        isGuestSandbox: true,
      });
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe("usr_guest_01");
      expect(decoded.isGuestSandbox).toBe(true);
    });

    it("rejects an access token passed into verifyRefreshToken", () => {
      const accessToken = signAccessToken(samplePayload);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe("hashToken (SHA-256)", () => {
    it("produces a deterministic 64-character SHA-256 hex digest", () => {
      const rawToken = "header.payload.signature";
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).not.toContain(rawToken);
    });

    it("produces distinct hashes for distinct tokens", () => {
      const tokenA = signRefreshToken({ userId: "usr_1", isGuestSandbox: false });
      const tokenB = signRefreshToken({ userId: "usr_2", isGuestSandbox: false });

      expect(hashToken(tokenA)).not.toBe(hashToken(tokenB));
    });
  });
});
