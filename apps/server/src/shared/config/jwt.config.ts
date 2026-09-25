import type { CookieOptions } from "express";

export const jwtConfig = {
  secret: process.env.JWT_SECRET || "super-secret-jwt-key-change-in-production",
  expiresIn: "6h",
  cookieName: "jwt",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 6 * 60 * 60 * 1000, // 6 hours
  } satisfies CookieOptions,
};