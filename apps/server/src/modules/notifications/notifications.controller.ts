import type { Request, Response } from "express";
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationsReadDb,
} from "./notifications.db.js";

/**
 * GET /api/notifications
 * Returns paginated notifications for the authenticated user.
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const notifications = await getUserNotifications(currentUserId, limit, offset);
    const unreadCount = await getUnreadNotificationsCount(currentUserId);

    res.json({
      status: "success",
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ error: "Failed to load notifications" });
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns the unread notification count for the sidebar badge.
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const unreadCount = await getUnreadNotificationsCount(currentUserId);

    res.json({
      status: "success",
      unreadCount,
    });
  } catch (error) {
    console.error("Get Unread Count Error:", error);
    res.status(500).json({ error: "Failed to fetch unread notifications count" });
  }
};

/**
 * POST /api/notifications/mark-read
 * Marks notifications as read (either specific IDs or all).
 */
export const markNotificationsRead = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { notificationIds } = req.body;
    await markNotificationsReadDb(currentUserId, Array.isArray(notificationIds) ? notificationIds : undefined);

    const unreadCount = await getUnreadNotificationsCount(currentUserId);

    res.json({
      status: "success",
      message: "Notifications marked as read",
      unreadCount,
    });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
};

