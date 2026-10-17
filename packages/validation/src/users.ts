import { z } from "zod";

// ==========================================
// User Profile Schemas
// ==========================================

export const UserProfileSchema = z.object({
  bio: z.string().trim().max(160, "Bio cannot exceed 160 characters").optional().nullable(),
  // Strict Cloudinary HTTPS URL regex validator to prevent tracking pixel injections
  profilePictureUrl: z
    .string()
    .url("Must be a valid URL")
    .regex(/^https:\/\/res\.cloudinary\.com\/.+/, "Must be a valid Cloudinary HTTPS URL")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type UserProfileInput = z.infer<typeof UserProfileSchema>;

