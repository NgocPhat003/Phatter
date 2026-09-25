import type { Request, Response, NextFunction } from "express";
import { jwtConfig } from "../config/jwt.config.js";
import { verifyAuthToken } from "../utils/jwt.util.js";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.cookies?.[jwtConfig.cookieName] ||
    req.headers.authorization?.replace(/^Bearer\s+/, "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyAuthToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session token" });
  }
};