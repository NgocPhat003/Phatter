import { Router } from "express";
import { getUserProfile } from "./users.controller.js";

const router = Router();

// Full path: GET /api/users/:username
router.get("/:username", getUserProfile);

export default router;