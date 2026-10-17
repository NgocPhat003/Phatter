import type { Request, Response, NextFunction } from "express";
import { toAppError } from "../errors/toAppError.js";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const appError = toAppError(err);

  // Log non-operational (system/unexpected) errors
  if (!appError.isOperational && process.env.NODE_ENV !== "test") {
    console.error("💥 [Unhandled Error]:", err);
  }

  return res.status(appError.statusCode).json({
    status: "error",
    message: appError.message,
    error: appError.message,
    ...(appError.errors && { errors: appError.errors }),
  });
};
