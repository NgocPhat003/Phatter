import type { Request, Response, NextFunction } from "express";
import { jwtConfig } from "../config/jwt.config.js";
import { verifyAccessToken } from "../utils/jwt.util.js";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Read the short-lived access_token cookie, or fall back to Authorization header
  // (Header fallback is useful for mobile / API clients that don't use cookies)
  const token =
    req.cookies?.[jwtConfig.accessCookieName] ||
    req.headers.authorization?.replace(/^Bearer\s+/, "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    // Token is expired or invalid → client should call POST /api/auth/refresh
    return res.status(401).json({ error: "Access token expired or invalid" });
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies?.[jwtConfig.accessCookieName] ||
      req.headers.authorization?.replace(/^Bearer\s+/, "");

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }
  } catch {
    // Token is invalid or expired; proceed as unauthenticated visitor
  }
  next();
};