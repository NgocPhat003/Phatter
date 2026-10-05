import type { Request, Response } from "express";
import crypto from "crypto";
import { db } from "phatter-db";
import {
  fetchConversationMessages,
  fetchUserConversations,
  insertMessage,
  markConversationRead,
} from "./messages.db.js";
import { pool } from "../../shared/db/pg.js";

/**
 * GET /api/messages/conversations
 * Returns all active conversations for the authenticated user with partner profiles.
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const convList = await fetchUserConversations(currentUserId);

    // Enrich conversation rows with partner profile details
    const enriched = await Promise.all(
      convList.map(async (c: any) => {
        const partner = await db.orm.public.User.where({ id: c.partnerId }).first();
        return {
          partner: partner
            ? {
                id: partner.id,
                username: partner.username,
                profilePictureUrl: partner.profilePictureUrl,
                isGuestSandbox: partner.isGuestSandbox,
              }
            : {
                id: c.partnerId,
                username: "Unknown User",
                profilePictureUrl: null,
                isGuestSandbox: false,
              },
          lastMessage: {
            id: c.lastMessageId,
            content: c.lastMessageContent,
            createdAt: c.lastMessageAt,
            senderId: c.lastSenderId,
            isSelf: String(c.lastSenderId) === String(currentUserId),
          },
          unreadCount: Number(c.unreadCount) || 0,
        };
      })
    );

    res.json({
      status: "success",
      conversations: enriched,
    });
  } catch (error) {
    console.error("Get Conversations Error:", error);
    res.status(500).json({ error: "Failed to load conversations" });
  }
};

/**
 * GET /api/messages/:partnerId
 * Returns the chat history between current user and partner, and marks incoming messages as read.
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    const { partnerId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!partnerId) {
      return res.status(400).json({ error: "Partner ID is required" });
    }

    // Mark messages as read
    await markConversationRead(currentUserId, partnerId);

    // Fetch message history
    const messages = await fetchConversationMessages(currentUserId, partnerId);

    // Fetch partner profile
    const partner = await db.orm.public.User.where({ id: partnerId }).first();

    res.json({
      status: "success",
      partner: partner
        ? {
            id: partner.id,
            username: partner.username,
            profilePictureUrl: partner.profilePictureUrl,
            isGuestSandbox: partner.isGuestSandbox,
          }
        : null,
      messages: messages.map((m) => ({
        ...m,
        isSelf: String(m.senderId) === String(currentUserId),
      })),
    });
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ error: "Failed to load messages" });
  }
};

/**
 * POST /api/messages/:partnerId
 * HTTP fallback endpoint for sending a message.
 */
export const sendMessageHttp = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    const { partnerId } = req.params;
    const { content } = req.body;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }

    const messageId = `msg_${crypto.randomUUID()}`;
    const saved = await insertMessage(messageId, currentUserId, partnerId, content.trim());

    res.status(201).json({
      status: "success",
      message: {
        ...saved,
        isSelf: true,
      },
    });
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

/**
 * GET /api/messages/unread-count
 * Returns the total count of unread incoming messages for the authenticated user.
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

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM direct_messages WHERE receiver_id = $1 AND is_read = FALSE`,
      [currentUserId]
    );

    const unreadCount = Number(countRes.rows[0]?.count) || 0;

    res.json({
      status: "success",
      unreadCount,
    });
  } catch (error) {
    console.error("Get Unread Count Error:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
};

