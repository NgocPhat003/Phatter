import { Router } from "express";
import { createPost, getPosts } from "./posts.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { create } from "domain";

const router = Router();

// Public route: Fetch global feed
router.get("/", getPosts);

// Protected route: Create a new post
router.post("/", requireAuth, createPost);

export default router;