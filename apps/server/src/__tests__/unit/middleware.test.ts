import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { requireAuth, optionalAuth } from "../../shared/middleware/auth.middleware.js";
import { AppError, toAppError } from "../../shared/errors/toAppError.js";
import { errorHandler } from "../../shared/middleware/errorHandler.js";
import { signAccessToken } from "../../shared/utils/jwt.util.js";
import { jwtConfig } from "../../shared/config/jwt.config.js";

const createResMock = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as Response;
};

describe("Server Middlewares & Error Mapping", () => {
  describe("validate middleware", () => {
    const schema = z.object({
      name: z.string().trim().min(2),
    });

    it("sanitizes req.body and calls next() when payload is valid", () => {
      const middleware = validate({ body: schema });
      const req = { body: { name: "  Alice  " }, query: {}, params: {} } as unknown as Request;
      const res = createResMock();
      const next = vi.fn() as unknown as NextFunction;

      middleware(req, res, next);

      expect(req.body).toEqual({ name: "Alice" });
      expect(next).toHaveBeenCalledWith();
    });

    it("forwards ZodError to next(err) when payload fails validation", () => {
      const middleware = validate({ body: schema });
      const req = { body: { name: "A" }, query: {}, params: {} } as unknown as Request;
      const res = createResMock();
      const next = vi.fn();

      middleware(req, res, next as unknown as NextFunction);

      expect(next).toHaveBeenCalledTimes(1);
      const forwardedErr = next.mock.calls[0]?.[0];
      expect(forwardedErr).toBeInstanceOf(z.ZodError);
    });
  });

  describe("requireAuth & optionalAuth middlewares", () => {
    it("requireAuth returns 401 when no token is provided", () => {
      const req = { cookies: {}, headers: {} } as unknown as Request;
      const res = createResMock();
      const next = vi.fn() as unknown as NextFunction;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Authentication required" });
      expect(next).not.toHaveBeenCalled();
    });

    it("requireAuth authenticates from HttpOnly cookie or Bearer header", () => {
      const token = signAccessToken({ userId: "usr_42", isGuestSandbox: false });

      const reqCookie = {
        cookies: { [jwtConfig.accessCookieName]: token },
        headers: {},
      } as unknown as Request;
      const nextCookie = vi.fn() as unknown as NextFunction;
      requireAuth(reqCookie, createResMock(), nextCookie);
      expect(reqCookie.user?.userId).toBe("usr_42");
      expect(nextCookie).toHaveBeenCalled();

      const reqHeader = {
        cookies: {},
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;
      const nextHeader = vi.fn() as unknown as NextFunction;
      requireAuth(reqHeader, createResMock(), nextHeader);
      expect(reqHeader.user?.userId).toBe("usr_42");
      expect(nextHeader).toHaveBeenCalled();
    });

    it("requireAuth returns 401 on invalid token", () => {
      const req = {
        cookies: { [jwtConfig.accessCookieName]: "invalid.token.sig" },
        headers: {},
      } as unknown as Request;
      const res = createResMock();
      const next = vi.fn() as unknown as NextFunction;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("optionalAuth sets req.user when valid and passes through silently when absent or invalid", () => {
      const reqEmpty = { cookies: {}, headers: {} } as unknown as Request;
      const nextEmpty = vi.fn() as unknown as NextFunction;
      optionalAuth(reqEmpty, createResMock(), nextEmpty);
      expect(reqEmpty.user).toBeUndefined();
      expect(nextEmpty).toHaveBeenCalled();

      const reqBad = {
        cookies: { [jwtConfig.accessCookieName]: "bad.jwt" },
        headers: {},
      } as unknown as Request;
      const nextBad = vi.fn() as unknown as NextFunction;
      optionalAuth(reqBad, createResMock(), nextBad);
      expect(reqBad.user).toBeUndefined();
      expect(nextBad).toHaveBeenCalled();
    });
  });

  describe("toAppError & errorHandler", () => {
    it("formats ZodError into structured 400 validation envelope", () => {
      const parsed = z.object({ email: z.string().email() }).safeParse({ email: "bad" });
      if (parsed.success) throw new Error("Expected failure");

      const res = createResMock();
      errorHandler(parsed.error, {} as Request, res, vi.fn() as unknown as NextFunction);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: "error",
        message: "Validation failed",
        error: "Validation failed",
        errors: [
          {
            field: "email",
            message: expect.any(String),
          },
        ],
      });
    });

    it("preserves AppError status codes and maps unknown errors to 500", () => {
      const custom = toAppError(new AppError("Resource forbidden", 403));
      expect(custom.statusCode).toBe(403);
      expect(custom.isOperational).toBe(true);

      const unknown = toAppError(new Error("Unexpected crash"));
      expect(unknown.statusCode).toBe(500);
      expect(unknown.isOperational).toBe(false);
    });
  });
});
