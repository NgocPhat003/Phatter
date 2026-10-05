import type { Request, Response } from "express";
import crypto from "crypto";
import { pool } from "../../shared/db/pg.js";

/**
 * GET /api/comments/:postId
 * Fetches all comments for a post, enriched with authors and structured into thread chains.
 */
export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const query = `
      SELECT 
        c.id, 
        c.content, 
        c."createdAt", 
        c."authorId", 
        c."parentId",
        u.id as "author_id", 
        u.username as "author_username", 
        u."profilePictureUrl" as "author_avatar", 
        u."isGuestSandbox" as "author_guest",
        pu.username as "replyToUsername"
      FROM "comment" c
      LEFT JOIN "user" u ON c."authorId" = u.id
      LEFT JOIN "comment" pc ON c."parentId" = pc.id
      LEFT JOIN "user" pu ON pc."authorId" = pu.id
      WHERE c."postId" = $1
      ORDER BY c."createdAt" ASC;
    `;

    const result = await pool.query(query, [postId]);

    const rawComments = result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      parentId: row.parentId || null,
      replyToUsername: row.replyToUsername || null,
      author: row.author_id
        ? {
            id: row.author_id,
            username: row.author_username,
            profilePictureUrl: row.author_avatar,
            isGuestSandbox: Boolean(row.author_guest),
          }
        : null,
    }));

    // Build comment chain trees
    const commentMap = new Map<string, any>();
    rawComments.forEach((c) => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    const rootComments: any[] = [];

    rawComments.forEach((c) => {
      const current = commentMap.get(c.id);
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId).replies.push(current);
      } else {
        rootComments.push(current);
      }
    });

    res.json({
      status: "success",
      count: rawComments.length,
      comments: rootComments,
      flatComments: rawComments,
    });
  } catch (error) {
    console.error("Get Comments Error:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};

/**
 * POST /api/comments/:postId
 * Creates a top-level comment or a threaded reply to an existing comment.
 */
export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Comment content cannot be empty" });
    }

    let replyToUsername: string | null = null;
    let validParentId: string | null = null;

    if (parentId && typeof parentId === "string") {
      const parentCheck = await pool.query(
        `
        SELECT c.id, c."postId", u.username
        FROM "comment" c
        LEFT JOIN "user" u ON c."authorId" = u.id
        WHERE c.id = $1
        `,
        [parentId]
      );

      if (parentCheck.rows.length > 0) {
        validParentId = parentCheck.rows[0].id;
        replyToUsername = parentCheck.rows[0].username || null;
      }
    }

    const commentId = `cmt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const insertQuery = `
      INSERT INTO "comment" (id, content, "postId", "authorId", "parentId", "createdAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, content, "postId", "authorId", "parentId", "createdAt";
    `;

    const insertRes = await pool.query(insertQuery, [
      commentId,
      content.trim(),
      postId,
      currentUserId,
      validParentId,
    ]);

    const row = insertRes.rows[0];

    const authorRes = await pool.query(
      'SELECT id, username, "profilePictureUrl", "isGuestSandbox" FROM "user" WHERE id = $1',
      [currentUserId]
    );

    const author = authorRes.rows[0]
      ? {
          id: authorRes.rows[0].id,
          username: authorRes.rows[0].username,
          profilePictureUrl: authorRes.rows[0].profilePictureUrl,
          isGuestSandbox: Boolean(authorRes.rows[0].isGuestSandbox),
        }
      : null;

    res.status(201).json({
      status: "success",
      comment: {
        id: row.id,
        content: row.content,
        createdAt: row.createdAt,
        parentId: row.parentId,
        replyToUsername,
        replies: [],
        author,
      },
    });
  } catch (error) {
    console.error("Create Comment Error:", error);
    res.status(500).json({ error: "Failed to post comment" });
  }
};