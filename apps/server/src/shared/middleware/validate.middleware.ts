import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export const validate = (schemas: {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) return next(result.error);
      req.params = result.data;
    }
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) return next(result.error);
      req.query = result.data;
    }
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) return next(result.error);
      req.body = result.data;
    }
    return next();
  };
};

