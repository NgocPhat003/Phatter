import { z } from "zod";

export const UserProfileSchema = z.object({
    bio: z.string().max(160).optional,
    // Strict Cloudinary HTTPS URL regex validator to prevent tracking pixel injections
    profilePictureUrl: z.string().url().regex(/^https:\/\/res\.cloudinary\.com\/.+/).optional(),
});

export type UserProfileSchema = z.infer<typeof UserProfileSchema>;
