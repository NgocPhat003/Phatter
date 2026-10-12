import { Router } from "express";
import { createPost, getPosts, getTrendingHashtags, deletePost } from "./posts.controller.js";
import { requireAuth, optionalAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// Trending hashtags: GET /api/posts/hashtags/trending
router.get("/hashtags/trending", getTrendingHashtags);

// Public route: Fetch global feed (supports ?tag= or ?hashtag=)
router.get("/", optionalAuth, getPosts);

// Protected route: Create a new post
router.post("/", requireAuth, createPost);

// Protected route: Delete a post
router.delete("/:id", requireAuth, deletePost);

export default router;
