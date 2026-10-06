import type { Request, Response } from "express";
import {
  toggleBookmarkDb,
  fetchUserBookmarkedPosts,
} from "./bookmarks.db.js";

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

    const result = await toggleBookmarkDb(currentUserId, postId);

    res.json({
      status: "success",
      isBookmarked: result.isBookmarked,
      message: result.isBookmarked
        ? "Post saved to your bookmarks"
        : "Post removed from your bookmarks",
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

    const posts = await fetchUserBookmarkedPosts(currentUserId);

    res.json({
      status: "success",
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("Get Bookmarks Error:", error);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
};

