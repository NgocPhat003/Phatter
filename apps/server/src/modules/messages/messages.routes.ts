import { Router } from "express";
import {
  getConversations,
  getMessages,
  sendMessageHttp,
  getUnreadCount,
  getOnlineUsers,
} from "./messages.controller.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";

const router: Router = Router();

router.get("/unread-count", requireAuth, getUnreadCount);
router.get("/online-users", requireAuth, getOnlineUsers);
router.get("/conversations", requireAuth, getConversations);
router.get("/:partnerId", requireAuth, getMessages);
router.post("/:partnerId", requireAuth, sendMessageHttp);

export default router;
