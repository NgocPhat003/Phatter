import jwt from "jsonwebtoken";
import { jwtConfig } from "../config/jwt.config.js";
import type { AuthTokenPayload } from "../types/auth.types.js";

export const signAuthToken = (payload: AuthTokenPayload): string => {
    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
    });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, jwtConfig.secret) as AuthTokenPayload;
};