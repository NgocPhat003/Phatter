import { Router } from "express";
import { toggleLike } from "./likes.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// Full path: POST /api/likes/:postId
router.post("/:postId", requireAuth, toggleLike);

export default router;