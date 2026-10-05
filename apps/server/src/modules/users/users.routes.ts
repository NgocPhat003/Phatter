import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  followUser,
  unfollowUser,
  getUsersDirectory,
  getUserFollowers,
  getUserFollowing,
} from "./users.controller.js";
import { requireAuth, optionalAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// User directory & suggestions: GET /api/users
router.get("/", optionalAuth, getUsersDirectory);

// Current user profile update: PATCH /api/users/me
router.patch("/me", requireAuth, updateUserProfile);

// User followers: GET /api/users/:username/followers
router.get("/:username/followers", optionalAuth, getUserFollowers);

// User following: GET /api/users/:username/following
router.get("/:username/following", optionalAuth, getUserFollowing);

// Follow user: POST /api/users/:username/follow
router.post("/:username/follow", requireAuth, followUser);

// Unfollow user: DELETE /api/users/:username/follow
router.delete("/:username/follow", requireAuth, unfollowUser);

// Public user profile: GET /api/users/:username
router.get("/:username", optionalAuth, getUserProfile);

export default router;