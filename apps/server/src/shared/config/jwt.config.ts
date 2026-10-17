import type { CookieOptions } from "express";
import { env } from "./env.js";

export const jwtConfig = {
  // Access Token — short-lived, stateless, verified by signature only (no DB hit)
  accessSecret: env.JWT_SECRET,
  accessExpiresIn: "15m",
  accessCookieName: "access_token",
  accessCookieOptions: {
    httpOnly: true,                                        // JS cannot read it (XSS protection)
    secure: env.NODE_ENV === "production",                 // HTTPS only in prod
    sameSite: "lax",                                      // CSRF protection
    maxAge: 15 * 60 * 1000,                              // 15 minutes in ms
  } satisfies CookieOptions,

  // Refresh Token — long-lived, stateful (stored as hash in DB), used ONLY to get new access tokens
  refreshSecret: env.JWT_REFRESH_SECRET,
  refreshExpiresIn: "7d",
  refreshCookieName: "refresh_token",
  refreshCookieOptions: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,                   // 7 days in ms
    path: "/api/auth",                                   // Scoped to /api/auth so both /refresh and /logout receive it
  } satisfies CookieOptions,
};