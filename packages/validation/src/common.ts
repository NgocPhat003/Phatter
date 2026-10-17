import { z } from "zod";

/**
 * Reusable transformer for query parameters like ?page=1&limit=10.
 * Validates positive integers, converts strings to numbers, and applies optional max constraints.
 */
export const positiveIntFromString = (defaultValue: number, max?: number) => {
  let numberSchema = z.number().int().positive();
  if (max !== undefined) {
    numberSchema = numberSchema.max(max);
  }

  return z
    .string()
    .optional()
    .default(String(defaultValue))
    .refine((val) => /^[1-9]\d*$/.test(val), {
      message: "Must be a positive integer",
    })
    .transform(Number)
    .pipe(numberSchema);
};

export const PaginationQuerySchema = z.object({
  page: positiveIntFromString(1),
  limit: positiveIntFromString(10, 50),
});

export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;

