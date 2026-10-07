import { z } from "zod";

// ==========================================
// Authentication Schemas
// ==========================================

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

export type RegisterInput = z.infer<typeof RegisterSchema>;

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

export type LoginInput = z.infer<typeof LoginSchema>;

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

// ==========================================
// Posts Schemas
// ==========================================

export const CreatePostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Post content is required")
    .max(500, "Post cannot exceed 500 characters"),
  imageUrl: z
    .string()
    .url("Must be a valid image URL")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

// ==========================================
// Comments Schemas
// ==========================================

export const CreateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content cannot be empty")
    .max(500, "Comment cannot exceed 500 characters"),
  parentId: z.string().max(64).optional().nullable(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

// ==========================================
// Direct Messages Schemas
// ==========================================

export const SendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Message cannot exceed 1,000 characters"),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
