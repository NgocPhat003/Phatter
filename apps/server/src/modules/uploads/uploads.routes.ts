import { Router } from "express";
import { uploadImage } from "./uploads.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { uploadMiddleware } from "../../shared/config/cloudinary.config.js";

const router = Router();

// Full path: POST /api/uploads
// We expect the form-data key to be named "image"
router.post("/", requireAuth, uploadMiddleware.single("image"), uploadImage);

export default router;