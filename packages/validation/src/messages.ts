import { z } from "zod";

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

