import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  followUser,
  unfollowUser,
} from "./users.controller.js";
import { requireAuth, optionalAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// Current user profile update: PATCH /api/users/me
router.patch("/me", requireAuth, updateUserProfile);

// Follow user: POST /api/users/:username/follow
router.post("/:username/follow", requireAuth, followUser);

// Unfollow user: DELETE /api/users/:username/follow
router.delete("/:username/follow", requireAuth, unfollowUser);

// Public user profile: GET /api/users/:username
router.get("/:username", optionalAuth, getUserProfile);

export default router;