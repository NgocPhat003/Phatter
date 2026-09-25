import { Router } from "express";
import { createComment } from "./comments.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

const router = Router();

// Full path: POST /api/comments/:postId
router.post("/:postId", requireAuth, createComment);

export default router;