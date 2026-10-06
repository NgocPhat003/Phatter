import crypto from "crypto";
import { pool } from "../../shared/db/pg.js";
import { getSocketIO } from "../messages/messages.socket.js";

/**
 * Initializes the notifications table and indexes in PostgreSQL.
 */
export const initNotificationsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        recipient_id VARCHAR(64) NOT NULL,
        actor_id VARCHAR(64) NOT NULL,
        type VARCHAR(32) NOT NULL,
        post_id VARCHAR(64),
        comment_id VARCHAR(64),
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read);`);
    console.log("[Notifications DB]: notifications table ready.");
  } catch (error) {
    console.error("[Notifications DB Init Error]:", error);
  }
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
      const existing = await pool.query(
        `SELECT id FROM notifications WHERE recipient_id = $1 AND actor_id = $2 AND type = 'like' AND post_id = $3`,
        [recipientId, actorId, postId]
      );
      if (existing.rows.length > 0) {
        // Just refresh the timestamp and mark as unread
        await pool.query(
          `UPDATE notifications SET is_read = FALSE, created_at = NOW() WHERE id = $1`,
          [existing.rows[0].id]
        );
        return existing.rows[0];
      }
    } else if (type === "follow") {
      const existing = await pool.query(
        `SELECT id FROM notifications WHERE recipient_id = $1 AND actor_id = $2 AND type = 'follow'`,
        [recipientId, actorId]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE notifications SET is_read = FALSE, created_at = NOW() WHERE id = $1`,
          [existing.rows[0].id]
        );
        return existing.rows[0];
      }
    }

    const notificationId = `notif_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const insertRes = await pool.query(
      `
      INSERT INTO notifications (id, recipient_id, actor_id, type, post_id, comment_id, content, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())
      RETURNING *;
      `,
      [notificationId, recipientId, actorId, type, postId || null, commentId || null, content || null]
    );

    const saved = insertRes.rows[0];

    // Fetch actor details for real-time payload
    const actorRes = await pool.query(
      `SELECT id, username, "profilePictureUrl", "isGuestSandbox" FROM "user" WHERE id = $1`,
      [actorId]
    );
    const actor = actorRes.rows[0] || null;

    const payload = {
      id: saved.id,
      recipientId: saved.recipient_id,
      actorId: saved.actor_id,
      type: saved.type,
      postId: saved.post_id,
      commentId: saved.comment_id,
      content: saved.content,
      isRead: saved.is_read,
      createdAt: saved.created_at,
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
    console.error("[Notifications DB] createNotification error:", error);
    return null;
  }
};

/**
 * Fetches user notifications enriched with actor profiles.
 */
export const getUserNotifications = async (recipientId: string, limit = 50, offset = 0) => {
  try {
    const query = `
      SELECT 
        n.id,
        n.recipient_id as "recipientId",
        n.actor_id as "actorId",
        n.type,
        n.post_id as "postId",
        n.comment_id as "commentId",
        n.content,
        n.is_read as "isRead",
        n.created_at as "createdAt",
        u.id as "actor_user_id",
        u.username as "actor_username",
        u."profilePictureUrl" as "actor_avatar",
        u."isGuestSandbox" as "actor_guest",
        p.content as "post_content"
      FROM notifications n
      LEFT JOIN "user" u ON n.actor_id = u.id
      LEFT JOIN "post" p ON n.post_id = p.id
      WHERE n.recipient_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const res = await pool.query(query, [recipientId, limit, offset]);

    return res.rows.map((row) => ({
      id: row.id,
      recipientId: row.recipientId,
      actorId: row.actorId,
      type: row.type,
      postId: row.postId,
      commentId: row.commentId,
      content: row.content,
      postSnippet: row.post_content ? row.post_content.slice(0, 100) : null,
      isRead: row.isRead,
      createdAt: row.createdAt,
      actor: row.actor_user_id
        ? {
            id: row.actor_user_id,
            username: row.actor_username,
            profilePictureUrl: row.actor_avatar,
            isGuestSandbox: Boolean(row.actor_guest),
          }
        : null,
    }));
  } catch (error) {
    console.error("[Notifications DB] getUserNotifications error:", error);
    return [];
  }
};

/**
 * Returns total count of unread notifications for a user.
 */
export const getUnreadNotificationsCount = async (recipientId: string): Promise<number> => {
  try {
    const res = await pool.query(
      `SELECT COUNT(*)::int as count FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`,
      [recipientId]
    );
    return Number(res.rows[0]?.count) || 0;
  } catch (error) {
    console.error("[Notifications DB] getUnreadNotificationsCount error:", error);
    return 0;
  }
};

/**
 * Marks notifications as read (all, or specific IDs).
 */
export const markNotificationsReadDb = async (recipientId: string, notificationIds?: string[]) => {
  try {
    if (notificationIds && notificationIds.length > 0) {
      await pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1 AND id = ANY($2::text[])`,
        [recipientId, notificationIds]
      );
    } else {
      await pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1`,
        [recipientId]
      );
    }
  } catch (error) {
    console.error("[Notifications DB] markNotificationsRead error:", error);
  }
};

