import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { jwtConfig } from "../config/jwt.config.js";
import type { AuthTokenPayload } from "../types/auth.types.js";

// ─── Access Token (short-lived, stateless) ───────────────────────────────────

export const signAccessToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, jwtConfig.accessSecret) as AuthTokenPayload;
};

// ─── Refresh Token (long-lived, stateful) ────────────────────────────────────

export const signRefreshToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  } as SignOptions);
};

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, jwtConfig.refreshSecret) as AuthTokenPayload;
};

// ─── Security Helper ─────────────────────────────────────────────────────────

/**
 * Hash a refresh token before storing it in the DB.
 * We store SHA-256(token), never the raw token — same principle as password hashing.
 * If DB leaks, attacker gets hashes, not valid sessions.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// ─── Legacy alias (keep existing code working during migration) ───────────────
export const signAuthToken = signAccessToken;
export const verifyAuthToken = verifyAccessToken;