import { Router } from "express";
import {
  createGuestSession,
  getCurrentUser,
  logout,
  login,
  register,
  initiateGithubAuth,
  handleGithubCallback,
  initiateGoogleAuth,
  handleGoogleCallback,
  mockOAuthLogin,
} from "./auth.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// Guest Sandbox Access
router.post("/guest", createGuestSession);

// Standard Login & Register
router.post("/login", login);
router.post("/register", register);

// GitHub OAuth
router.get("/github", initiateGithubAuth);
router.get("/github/callback", handleGithubCallback);

// Google (Gmail) OAuth
router.get("/google", initiateGoogleAuth);
router.get("/google/callback", handleGoogleCallback);

// Mock / Development Social Login (Instant testing without API keys)
router.get("/mock-oauth", mockOAuthLogin);

// Current User & Logout
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", logout);

export default router;