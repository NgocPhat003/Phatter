import type { Request, Response } from "express";
import crypto from "crypto";
import { pool } from "../../shared/db/pg.js";
import { db } from "phatter-db";

/**
 * Initializes the bookmarks table and indexes in PostgreSQL.
 */
export const initBookmarksTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        post_id VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);`);
    console.log("[Bookmarks DB]: bookmarks table ready.");
  } catch (error) {
    console.error("[Bookmarks DB Init Error]:", error);
  }
};

/**
 * Returns a Set of post IDs that the given user has bookmarked.
 */
export const getUserBookmarkedPostIds = async (userId: string): Promise<Set<string>> => {
  try {
    const res = await pool.query(
      `SELECT post_id FROM bookmarks WHERE user_id = $1`,
      [userId]
    );
    return new Set(res.rows.map((r) => String(r.post_id)));
  } catch (error) {
    console.error("[Bookmarks DB] getUserBookmarkedPostIds error:", error);
    return new Set();
  }
};

/**
 * POST /api/bookmarks/:postId
 * Toggles bookmark status for a post for the authenticated user.
 */
export const toggleBookmark = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    const { postId } = req.params;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!postId) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    // Check if bookmark exists
    const existing = await pool.query(
      `SELECT id FROM bookmarks WHERE user_id = $1 AND post_id = $2 LIMIT 1`,
      [currentUserId, postId]
    );

    if (existing.rows.length > 0) {
      // Remove bookmark
      await pool.query(
        `DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2`,
        [currentUserId, postId]
      );
      return res.json({
        status: "success",
        isBookmarked: false,
        message: "Post removed from your bookmarks",
      });
    }

    // Create bookmark
    const bookmarkId = `bkm_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    await pool.query(
      `INSERT INTO bookmarks (id, user_id, post_id, created_at) VALUES ($1, $2, $3, NOW())`,
      [bookmarkId, currentUserId, postId]
    );

    res.json({
      status: "success",
      isBookmarked: true,
      message: "Post saved to your bookmarks",
    });
  } catch (error) {
    console.error("Toggle Bookmark Error:", error);
    res.status(500).json({ error: "Failed to toggle bookmark" });
  }
};

/**
 * GET /api/bookmarks
 * Returns all bookmarked posts for the authenticated user.
 */
export const getBookmarks = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bookmarkRes = await pool.query(
      `SELECT post_id, created_at FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC`,
      [currentUserId]
    );

    if (bookmarkRes.rows.length === 0) {
      return res.json({
        status: "success",
        count: 0,
        posts: [],
      });
    }

    const postIds = bookmarkRes.rows.map((r) => r.post_id);

    // Fetch and enrich all bookmarked posts
    const enrichedList = await Promise.all(
      postIds.map(async (postId: string) => {
        try {
          const post = await db.orm.public.Post?.where({ id: postId }).first();
          if (!post) return null;

          const author = await db.orm.public.User?.where({ id: post.authorId }).first();
          const likes = (await db.orm.public.Like?.where({ postId: post.id }).all()) || [];
          const comments = (await db.orm.public.Comment?.where({ postId: post.id }).all()) || [];

          const isLiked = Boolean(
            likes.some((like: any) => {
              const likeOwner = like.userId || like.authorId || like.user_id;
              return String(likeOwner) === String(currentUserId);
            })
          );

          return {
            id: post.id,
            content: post.content,
            imageUrl: post.imageUrl,
            createdAt: post.createdAt,
            author: author
              ? {
                  id: author.id,
                  username: author.username,
                  profilePictureUrl: author.profilePictureUrl,
                  isGuestSandbox: author.isGuestSandbox,
                }
              : null,
            engagement: {
              likesCount: likes.length,
              commentsCount: comments.length,
              isLiked,
              isBookmarked: true,
            },
          };
        } catch (err) {
          console.error(`[Bookmarks] Error enriching post ${postId}:`, err);
          return null;
        }
      })
    );

    const validPosts = enrichedList.filter(Boolean);

    res.json({
      status: "success",
      count: validPosts.length,
      posts: validPosts,
    });
  } catch (error) {
    console.error("Get Bookmarks Error:", error);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
};
