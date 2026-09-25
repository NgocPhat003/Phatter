import { Router } from "express";
import { createGuestSession, getCurrentUser } from "./auth.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

const router = Router();

// Public route: Mint a new sandbox account
router.post("/guest", createGuestSession);

// Protected route: Fetch logged-in user's profile
router.get("/me", requireAuth, getCurrentUser);

export default router;