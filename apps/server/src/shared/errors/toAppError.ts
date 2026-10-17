import { ZodError } from "zod";

export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode = 500,
    public isOperational = true,
    public errors?: FieldError[]
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const toAppError = (err: unknown): AppError => {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    const formatted: FieldError[] = err.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      message: issue.message,
    }));

    return new AppError("Validation failed", 400, true, formatted);
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  return new AppError(message, 500, false);
};

