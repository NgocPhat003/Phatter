import type { Request, Response } from "express";
import { db } from "phatter-db";

/**
 * Initializes the bookmarks table (handled by Prisma ORM contract).
 */
export const initBookmarksTable = async () => {
  // Handled natively by Prisma ORM contract model Bookmark
};

/**
 * Returns a Set of post IDs that the given user has bookmarked.
 */
export const getUserBookmarkedPostIds = async (userId: string): Promise<Set<string>> => {
  try {
    const bookmarks = (await db.orm.public.Bookmark?.where({ userId }).all()) || [];
    return new Set(bookmarks.map((b: any) => String(b.postId)));
  } catch (error) {
    console.error("[Bookmarks] getUserBookmarkedPostIds error:", error);
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
    const existing = await db.orm.public.Bookmark?.where({
      userId: currentUserId,
      postId,
    }).first();

    if (existing) {
      // Remove bookmark
      await db.orm.public.Bookmark?.where({ id: existing.id }).delete();
      return res.json({
        status: "success",
        isBookmarked: false,
        message: "Post removed from your bookmarks",
      });
    }

    // Create bookmark
    await db.orm.public.Bookmark?.create({
      postId,
      userId: currentUserId,
    });

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

    const bookmarks = (await db.orm.public.Bookmark?.where({ userId: currentUserId }).all()) || [];

    if (bookmarks.length === 0) {
      return res.json({
        status: "success",
        count: 0,
        posts: [],
      });
    }

    const postIds = bookmarks.map((b: any) => b.postId);

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
