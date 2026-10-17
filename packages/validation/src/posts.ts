import { z } from "zod";

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

