import { Router } from "express";
import { getComments, createComment } from "./comments.controller.js";
import { requireAuth, optionalAuth } from "../../shared/middleware/auth.middleware.js";

const router = Router();

// GET /api/comments/:postId
router.get("/:postId", optionalAuth, getComments);

// POST /api/comments/:postId
router.post("/:postId", requireAuth, createComment);

export default router;