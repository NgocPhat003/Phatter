import { describe, it, expect } from "vitest";
import { CreatePostSchema, CreateCommentSchema } from "../posts.js";
import { UserProfileSchema } from "../users.js";
import { SendMessageSchema } from "../messages.js";
import { PaginationQuerySchema } from "../common.js";

describe("@project-phatter/validation — Domain & Common Schemas", () => {
  describe("CreatePostSchema", () => {
    it("accepts valid post content and optional image URL", () => {
      const result = CreatePostSchema.safeParse({
        content: "  Hello #Phatter world!  ",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("Hello #Phatter world!");
      }
    });

    it("accepts empty string or null imageUrl", () => {
      expect(
        CreatePostSchema.safeParse({ content: "Text only post", imageUrl: "" })
          .success
      ).toBe(true);
      expect(
        CreatePostSchema.safeParse({ content: "Text only post", imageUrl: null })
          .success
      ).toBe(true);
    });

    it("rejects empty content, >500 char content, and malformed imageUrl", () => {
      expect(CreatePostSchema.safeParse({ content: "   " }).success).toBe(false);
      expect(
        CreatePostSchema.safeParse({ content: "a".repeat(501) }).success
      ).toBe(false);
      expect(
        CreatePostSchema.safeParse({
          content: "Valid text",
          imageUrl: "not-a-url",
        }).success
      ).toBe(false);
    });
  });

  describe("CreateCommentSchema", () => {
    it("accepts valid comment with optional parentId", () => {
      const result = CreateCommentSchema.safeParse({
        content: "Great post!",
        parentId: "cmt_12345",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty comments or comments exceeding 500 characters", () => {
      expect(CreateCommentSchema.safeParse({ content: "  " }).success).toBe(
        false
      );
      expect(
        CreateCommentSchema.safeParse({ content: "c".repeat(501) }).success
      ).toBe(false);
    });
  });

  describe("UserProfileSchema", () => {
    it("allows valid Cloudinary HTTPS avatar URL and trims bio", () => {
      const result = UserProfileSchema.safeParse({
        bio: "  Full-stack developer  ",
        profilePictureUrl:
          "https://res.cloudinary.com/phatter/image/upload/v1/avatar.png",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bio).toBe("Full-stack developer");
      }
    });

    it("blocks non-Cloudinary URLs to prevent tracking pixel injection", () => {
      const nonCloudinary = UserProfileSchema.safeParse({
        profilePictureUrl: "https://evil-tracker.com/pixel.png",
      });
      expect(nonCloudinary.success).toBe(false);

      const insecureHttp = UserProfileSchema.safeParse({
        profilePictureUrl: "http://res.cloudinary.com/phatter/image/upload/a.png",
      });
      expect(insecureHttp.success).toBe(false);
    });

    it("enforces max bio length of 160 characters", () => {
      expect(
        UserProfileSchema.safeParse({ bio: "x".repeat(161) }).success
      ).toBe(false);
    });
  });

  describe("SendMessageSchema", () => {
    it("accepts non-empty message up to 1,000 characters", () => {
      expect(SendMessageSchema.safeParse({ content: "Hey there!" }).success).toBe(
        true
      );
      expect(SendMessageSchema.safeParse({ content: "   " }).success).toBe(false);
      expect(
        SendMessageSchema.safeParse({ content: "m".repeat(1001) }).success
      ).toBe(false);
    });
  });

  describe("PaginationQuerySchema", () => {
    it("supplies defaults when parameters are omitted", () => {
      const result = PaginationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, limit: 10 });
      }
    });

    it("transforms valid positive integer strings into numbers", () => {
      const result = PaginationQuerySchema.safeParse({
        page: "3",
        limit: "25",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 3, limit: 25 });
      }
    });

    it("rejects zero, negative, float, non-numeric, and over-limit queries", () => {
      expect(PaginationQuerySchema.safeParse({ page: "0" }).success).toBe(false);
      expect(PaginationQuerySchema.safeParse({ page: "-2" }).success).toBe(false);
      expect(PaginationQuerySchema.safeParse({ page: "1.5" }).success).toBe(
        false
      );
      expect(PaginationQuerySchema.safeParse({ page: "abc" }).success).toBe(
        false
      );
      expect(PaginationQuerySchema.safeParse({ limit: "51" }).success).toBe(
        false
      );
    });
  });
});
