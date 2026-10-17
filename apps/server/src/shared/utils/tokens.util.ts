import type { Response } from "express";
import crypto from "crypto";
import { Temporal } from "@js-temporal/polyfill";
import { db } from "phatter-db";
import { signAccessToken, signRefreshToken, hashToken } from "./jwt.util.js";
import { jwtConfig } from "../config/jwt.config.js";
import type { AuthTokenPayload } from "../types/auth.types.js";

/**
 * Issues both an access token and a refresh token for a user.
 *
 * WHAT HAPPENS INTERNALLY:
 * 1. Sign a short-lived access JWT (15 min) → set as HttpOnly cookie
 * 2. Sign a long-lived refresh JWT (7 days) → set as HttpOnly cookie (scoped to /api/auth path)
 * 3. Hash the refresh token with SHA-256
 * 4. Store the hash + a family ID in the DB for later revocation & reuse detection
 *
 * The "family" ties all tokens in a rotation chain together.
 * If we detect an already-used token from a family being submitted again → ALARM → revoke whole family.
 */
export const issueTokens = async (
  res: Response,
  payload: AuthTokenPayload,
  existingFamily?: string  // Pass this during refresh rotation to continue the same family chain
): Promise<void> => {
  // 1. Sign access token (stateless, verified by signature only)
  const accessToken = signAccessToken(payload);

  // 2. Sign refresh token (stateful, will be stored as hash in DB)
  const refreshToken = signRefreshToken(payload);

  // 3. Determine family — groups all rotation steps for reuse detection
  const family = existingFamily ?? crypto.randomUUID();

  // 4. Hash the refresh token (never store the raw token in DB)
  const tokenHash = hashToken(refreshToken);

  // 5. Calculate refresh token expiry as Temporal.Instant (required by Prisma 8 PostgreSQL codec)
  const expiresAt = Temporal.Instant.fromEpochMilliseconds(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 6. Save hashed refresh token to DB
  await db.orm.public?.RefreshToken?.create({
    userId: payload.userId,
    tokenHash,
    family,
    expiresAt: expiresAt as any,
  });

  // 7. Set access token cookie (short-lived, all paths)
  res.cookie(jwtConfig.accessCookieName, accessToken, jwtConfig.accessCookieOptions);

  // 8. Set refresh token cookie (long-lived, scoped to /api/auth/refresh path only)
  res.cookie(jwtConfig.refreshCookieName, refreshToken, jwtConfig.refreshCookieOptions);
};

/**
 * Clears both auth cookies. Call on logout.
 */
export const clearTokenCookies = (res: Response): void => {
  const isProd = process.env.NODE_ENV === "production";
  const baseOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
  };

  res.clearCookie(jwtConfig.accessCookieName, baseOptions);
  res.clearCookie(jwtConfig.refreshCookieName, { ...baseOptions, path: "/api/auth" });

  // Also clear the old single-token cookie in case user had an old session
  res.clearCookie("jwt", baseOptions);
};

