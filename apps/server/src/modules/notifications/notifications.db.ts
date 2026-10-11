import crypto from "crypto";
import { db } from "phatter-db";
import { getSocketIO } from "../messages/messages.socket.js";

/**
 * Initializes the notifications table (handled by Prisma ORM contract).
 */
export const initNotificationsTable = async () => {
  // Handled natively by Prisma ORM contract model Notification
};

export interface CreateNotificationParams {
  recipientId: string;
  actorId: string;
  type: "like" | "comment" | "reply" | "follow";
  postId?: string | null;
  commentId?: string | null;
  content?: string | null;
}

/**
 * Creates and persists a notification, and emits a real-time event via Socket.io.
 */
export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const { recipientId, actorId, type, postId, commentId, content } = params;

    // Do not notify self-actions
    if (String(recipientId) === String(actorId)) {
      return null;
    }

    // For likes and follows, prevent spamming duplicates if user toggles repeatedly
    if (type === "like" && postId) {
      const existing = await db.orm.public.Notification?.where({
        recipientId,
        actorId,
        type: "like",
        postId,
      }).first();

      if (existing) {
        // Just refresh the timestamp and mark as unread
        await db.orm.public.Notification?.where({ id: existing.id }).update({
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        return existing;
      }
    } else if (type === "follow") {
      const existing = await db.orm.public.Notification?.where({
        recipientId,
        actorId,
        type: "follow",
      }).first();

      if (existing) {
        await db.orm.public.Notification?.where({ id: existing.id }).update({
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        return existing;
      }
    }

    const notificationId = `notif_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const saved = await db.orm.public.Notification?.create({
      id: notificationId,
      recipientId,
      actorId,
      type,
      postId: postId || null,
      commentId: commentId || null,
      content: content || null,
      isRead: false,
    });

    if (!saved) return null;

    // Fetch actor details for real-time payload
    const actor = await db.orm.public.User?.where({ id: actorId }).first();

    const payload = {
      id: saved.id,
      recipientId: saved.recipientId,
      actorId: saved.actorId,
      type: saved.type,
      postId: saved.postId,
      commentId: saved.commentId,
      content: saved.content,
      isRead: saved.isRead,
      createdAt: saved.createdAt,
      actor: actor
        ? {
            id: actor.id,
            username: actor.username,
            profilePictureUrl: actor.profilePictureUrl,
            isGuestSandbox: actor.isGuestSandbox,
          }
        : null,
    };

    // Emit live real-time notification to the recipient's private socket room
    const io = getSocketIO();
    io?.to(recipientId).emit("new_notification", payload);

    return payload;
  } catch (error) {
    console.error("[Notifications] createNotification error:", error);
    return null;
  }
};

/**
 * Fetches user notifications enriched with actor profiles.
 */
export const getUserNotifications = async (recipientId: string, limit = 50, offset = 0) => {
  try {
    const notifs = (await db.orm.public.Notification?.where({ recipientId }).all()) || [];

    // Sort by createdAt descending
    notifs.sort((a: any, b: any) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());

    const sliced = notifs.slice(offset, offset + limit);

    return await Promise.all(
      sliced.map(async (n: any) => {
        const actor = await db.orm.public.User?.where({ id: n.actorId }).first();
        let postSnippet: string | null = null;

        if (n.postId) {
          const post = await db.orm.public.Post?.where({ id: n.postId }).first();
          postSnippet = post?.content ? post.content.slice(0, 100) : null;
        }

        return {
          id: n.id,
          recipientId: n.recipientId,
          actorId: n.actorId,
          type: n.type,
          postId: n.postId,
          commentId: n.commentId,
          content: n.content,
          postSnippet,
          isRead: n.isRead,
          createdAt: n.createdAt,
          actor: actor
            ? {
                id: actor.id,
                username: actor.username,
                profilePictureUrl: actor.profilePictureUrl,
                isGuestSandbox: Boolean(actor.isGuestSandbox),
              }
            : null,
        };
      })
    );
  } catch (error) {
    console.error("[Notifications] getUserNotifications error:", error);
    return [];
  }
};

/**
 * Returns total count of unread notifications for a user.
 */
export const getUnreadNotificationsCount = async (recipientId: string): Promise<number> => {
  try {
    const unread = (await db.orm.public.Notification?.where({ recipientId, isRead: false }).all()) || [];
    return unread.length;
  } catch (error) {
    console.error("[Notifications] getUnreadNotificationsCount error:", error);
    return 0;
  }
};

/**
 * Marks notifications as read (all, or specific IDs).
 */
export const markNotificationsReadDb = async (recipientId: string, notificationIds?: string[]) => {
  try {
    if (notificationIds && notificationIds.length > 0) {
      await Promise.all(
        notificationIds.map(async (id) => {
          await db.orm.public.Notification?.where({ id, recipientId }).update({ isRead: true });
        })
      );
    } else {
      const unread = (await db.orm.public.Notification?.where({ recipientId, isRead: false }).all()) || [];
      await Promise.all(
        unread.map(async (n: any) => {
          await db.orm.public.Notification?.where({ id: n.id }).update({ isRead: true });
        })
      );
    }
  } catch (error) {
    console.error("[Notifications] markNotificationsRead error:", error);
  }
};
