import { Router } from "express";
import {
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
} from "./follows.controller.js";
import { requireAuth, optionalAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// Follow a user: POST /api/follows/:username
router.post("/:username", requireAuth, followUser);

// Unfollow a user: DELETE /api/follows/:username
router.delete("/:username", requireAuth, unfollowUser);

// User followers: GET /api/follows/:username/followers
router.get("/:username/followers", optionalAuth, getUserFollowers);

// User following: GET /api/follows/:username/following
router.get("/:username/following", optionalAuth, getUserFollowing);

export default router;
