import { Router } from "express";
import { getComments, createComment, deleteComment } from "./comments.controller.js";
import { requireAuth, optionalAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// GET /api/comments/:postId
router.get("/:postId", optionalAuth, getComments);

// POST /api/comments/:postId
router.post("/:postId", requireAuth, createComment);

// DELETE /api/comments/:commentId
router.delete("/:commentId", requireAuth, deleteComment);

export default router;