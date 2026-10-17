import { z } from "zod";

// ==========================================
// Authentication Schemas
// ==========================================

/**
 * Validated by Backend API Controller & Client Form submission
 */
export const RegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(100, "Email cannot exceed 100 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password cannot exceed 72 characters"), // Prevents Bcrypt CPU exhaustion
  bio: z.string().trim().max(160, "Bio cannot exceed 160 characters").optional().nullable(),
});

export const RegisterInputSchema = RegisterSchema;
export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Validated by Frontend Form (includes confirmPassword check)
 */
export const RegisterFormSchema = RegisterSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterFormDTO = z.infer<typeof RegisterFormSchema>;

/**
 * Login credentials validation
 */
export const LoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Username or email is required")
    .max(100, "Identifier cannot exceed 100 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Password cannot exceed 72 characters"),
});

export const LoginInputSchema = LoginSchema;
export type LoginInput = z.infer<typeof LoginSchema>;

