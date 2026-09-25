import { Router } from "express";
import { createPost } from "./posts.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

const router = Router();

router.post("/", requireAuth, createPost);

export default router;