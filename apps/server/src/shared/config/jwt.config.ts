import type { CookieOptions } from "express";
import { env } from "./env.js";

const isProd = env.NODE_ENV === "production";

export const jwtConfig = {
  // Access Token — short-lived, stateless, verified by signature only (no DB hit)
  accessSecret: env.JWT_SECRET,
  accessExpiresIn: "15m",
  accessCookieName: "access_token",
  accessCookieOptions: {
    httpOnly: true,                                        // JS cannot read it (XSS protection)
    secure: isProd,                                        // HTTPS only in prod
    sameSite: isProd ? ("none" as const) : ("lax" as const), // Cross-domain cookies for Vercel <-> Render
    maxAge: 15 * 60 * 1000,                              // 15 minutes in ms
  } satisfies CookieOptions,

  // Refresh Token — long-lived, stateful (stored as hash in DB), used ONLY to get new access tokens
  refreshSecret: env.JWT_REFRESH_SECRET,
  refreshExpiresIn: "7d",
  refreshCookieName: "refresh_token",
  refreshCookieOptions: {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    maxAge: 7 * 24 * 60 * 60 * 1000,                   // 7 days in ms
    path: "/api/auth",                                   // Scoped to /api/auth so both /refresh and /logout receive it
  } satisfies CookieOptions,
};