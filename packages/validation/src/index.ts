import { z } from "zod";

// User Profile Update Schema
export const UserProfileSchema = z.object({
  bio: z.string().max(160, "Bio cannot exceed 160 characters").optional().nullable(),
  // Strict Cloudinary HTTPS URL regex validator to prevent tracking pixel injections
  profilePictureUrl: z
    .string()
    .url("Must be a valid URL")
    .regex(/^https:\/\/res\.cloudinary\.com\/.+/, "Must be a valid Cloudinary HTTPS URL")
    .optional()
    .nullable(),
});

export type UserProfileInput = z.infer<typeof UserProfileSchema>;

// Post Creation Schema
export const CreatePostSchema = z.object({
  content: z.string().min(1, "Post content is required").max(500, "Post cannot exceed 500 characters"),
  imageUrl: z.string().url("Must be a valid image URL").optional().nullable(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

// Comment Creation Schema
export const CreateCommentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty").max(500, "Comment cannot exceed 500 characters"),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
