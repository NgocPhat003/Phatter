import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  RegisterFormSchema,
  LoginSchema,
} from "../auth.js";

describe("@project-phatter/validation — Auth Schemas", () => {
  describe("RegisterSchema", () => {
    it("accepts a valid registration payload and trims whitespace", () => {
      const result = RegisterSchema.safeParse({
        username: "  phat_dev01  ",
        email: "  phat@example.com  ",
        password: "Password123!",
        bio: "  Building full-stack apps  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe("phat_dev01");
        expect(result.data.email).toBe("phat@example.com");
        expect(result.data.bio).toBe("Building full-stack apps");
      }
    });

    it("accepts optional or null bio", () => {
      expect(
        RegisterSchema.safeParse({
          username: "valid_user",
          email: "valid@example.com",
          password: "secret123",
        }).success
      ).toBe(true);

      expect(
        RegisterSchema.safeParse({
          username: "valid_user",
          email: "valid@example.com",
          password: "secret123",
          bio: null,
        }).success
      ).toBe(true);
    });

    it("rejects usernames outside 3–20 characters or with invalid characters", () => {
      const tooShort = RegisterSchema.safeParse({
        username: "ab",
        email: "a@b.com",
        password: "password123",
      });
      expect(tooShort.success).toBe(false);

      const tooLong = RegisterSchema.safeParse({
        username: "a".repeat(21),
        email: "a@b.com",
        password: "password123",
      });
      expect(tooLong.success).toBe(false);

      const badChars = RegisterSchema.safeParse({
        username: "user-name!",
        email: "a@b.com",
        password: "password123",
      });
      expect(badChars.success).toBe(false);
    });

    it("rejects invalid emails", () => {
      const result = RegisterSchema.safeParse({
        username: "valid_user",
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("enforces password length boundaries (6–72 chars for Bcrypt safety)", () => {
      const tooShort = RegisterSchema.safeParse({
        username: "valid_user",
        email: "a@b.com",
        password: "12345",
      });
      expect(tooShort.success).toBe(false);

      const tooLong = RegisterSchema.safeParse({
        username: "valid_user",
        email: "a@b.com",
        password: "x".repeat(73),
      });
      expect(tooLong.success).toBe(false);
    });
  });

  describe("RegisterFormSchema", () => {
    it("passes when password and confirmPassword match", () => {
      const result = RegisterFormSchema.safeParse({
        username: "valid_user",
        email: "valid@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(result.success).toBe(true);
    });

    it("fails with error mapped to confirmPassword when passwords differ", () => {
      const result = RegisterFormSchema.safeParse({
        username: "valid_user",
        email: "valid@example.com",
        password: "Password123!",
        confirmPassword: "DifferentPassword!",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
        expect(result.error.issues[0]?.message).toBe("Passwords do not match");
      }
    });
  });

  describe("LoginSchema", () => {
    it("accepts username or email identifier and trims whitespace", () => {
      const result = LoginSchema.safeParse({
        identifier: "  sarah_dev  ",
        password: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.identifier).toBe("sarah_dev");
      }
    });

    it("rejects empty identifier or empty password", () => {
      expect(
        LoginSchema.safeParse({ identifier: "   ", password: "password123" })
          .success
      ).toBe(false);
      expect(
        LoginSchema.safeParse({ identifier: "sarah_dev", password: "" }).success
      ).toBe(false);
    });
  });
});
