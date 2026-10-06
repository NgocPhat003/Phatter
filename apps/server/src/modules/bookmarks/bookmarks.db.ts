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
 * Toggles a bookmark for a user and a post.
 */
export const toggleBookmarkDb = async (
  userId: string,
  postId: string
): Promise<{ isBookmarked: boolean }> => {
  // Check if bookmark exists
  const existing = await pool.query(
    `SELECT id FROM bookmarks WHERE user_id = $1 AND post_id = $2 LIMIT 1`,
    [userId, postId]
  );

  if (existing.rows.length > 0) {
    // Remove bookmark
    await pool.query(
      `DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );
    return { isBookmarked: false };
  }

  // Create bookmark
  const bookmarkId = `bkm_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  await pool.query(
    `INSERT INTO bookmarks (id, user_id, post_id, created_at) VALUES ($1, $2, $3, NOW())`,
    [bookmarkId, userId, postId]
  );
  return { isBookmarked: true };
};

/**
 * Fetches all bookmarked posts for a user, fully enriched with author, likes, and comment counts.
 */
export const fetchUserBookmarkedPosts = async (userId: string): Promise<any[]> => {
  // Query bookmarks joined with post creation date
  const bookmarkRes = await pool.query(
    `SELECT post_id, created_at FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  if (bookmarkRes.rows.length === 0) {
    return [];
  }

  const postIds = bookmarkRes.rows.map((r) => r.post_id);

  // Fetch all posts in the list
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
            return String(likeOwner) === String(userId);
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
        console.error(`[Bookmarks DB] Error enriching post ${postId}:`, err);
        return null;
      }
    })
  );

  return enrichedList.filter((p) => p !== null);
};

