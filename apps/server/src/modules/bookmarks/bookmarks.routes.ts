import { Router } from "express";
import { getBookmarks, toggleBookmark } from "./bookmarks.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// Full path: GET /api/bookmarks
router.get("/", requireAuth, getBookmarks);

// Full path: POST /api/bookmarks/:postId
router.post("/:postId", requireAuth, toggleBookmark);

export default router;

