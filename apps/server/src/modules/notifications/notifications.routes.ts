import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
} from "./notifications.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

// Full path: GET /api/notifications/unread-count
router.get("/unread-count", requireAuth, getUnreadCount);

// Full path: GET /api/notifications
router.get("/", requireAuth, getNotifications);

// Full path: POST /api/notifications/mark-read
router.post("/mark-read", requireAuth, markNotificationsRead);

export default router;

