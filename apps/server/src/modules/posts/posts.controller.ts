import type { Request, Response } from "express";
import { db } from "phatter-db";
import { getUserBookmarkedPostIds } from "../bookmarks/bookmarks.db.js";

export const createPost = async (req: Request, res: Response) => {
    try {
        const { content, imageUrl } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!content || typeof content !== "string") {
            return res.status(400).json({ error: "Post content is required" });
        }

        // Prisma create
        const newPost = await db.orm.public.Post?.create({
            content,
            imageUrl: imageUrl || null,
            authorId: userId,
        });

        res.status(201).json({
            status: "success",
            post: newPost,
        });
    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).json({ error: "Failed to create post"});
    }
};

export const getPosts = async (req: Request, res: Response) => {
  try {

    const currentUserId = 
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    const { realm, feed, sort, tag, hashtag } = req.query;

    let posts = await db.orm.public.Post.all();

    // Hashtag filter: match posts containing #tag
    const targetTag = (hashtag || tag) as string | undefined;
    if (targetTag && typeof targetTag === "string" && targetTag.trim()) {
      const cleanTag = targetTag.trim().replace(/^#/, "").toLowerCase();
      posts = posts.filter((p: any) => {
        if (!p.content) return false;
        const matches = p.content.match(/#([a-zA-Z0-9_]+)/g);
        if (!matches) return false;
        return matches.some((m: string) => m.slice(1).toLowerCase() === cleanTag);
      });
    }

    // Following feed filter: only show posts from people followed + self
    const isFollowingFeed = feed === "following" || realm === "personal" || realm === "following";
    if (isFollowingFeed && currentUserId) {
      const followings =
        (await db.orm.public.Follows?.where({ followerId: currentUserId }).all()) || [];
      const allowedAuthorIds = new Set(followings.map((f: any) => String(f.followingId)));
      allowedAuthorIds.add(String(currentUserId));

      posts = posts.filter((p: any) => allowedAuthorIds.has(String(p.authorId)));
    }

    const userBookmarks = currentUserId
      ? await getUserBookmarkedPostIds(currentUserId)
      : new Set<string>();

    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const author = await db.orm.public.User.where({ id: post.authorId }).first();
        const likes = await db.orm.public.Like.where({ postId: post.id }).all();
        const comments = await db.orm.public.Comment.where({ postId: post.id }).all();
        
        // Compare using String() to prevent type mismatch issues
        const isLiked = Boolean(
          currentUserId &&
            likes.some((like: any) => {
              const likeOwner = like.userId || like.authorId || like.user_id;
              return String(likeOwner) === String(currentUserId);
            })
        );

        const isBookmarked = userBookmarks.has(String(post.id));

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
            isBookmarked,
          },
        };
      })
    );

    if (sort === "popular") {
      enrichedPosts.sort(
        (a, b) =>
          b.engagement.likesCount +
          b.engagement.commentsCount -
          (a.engagement.likesCount + a.engagement.commentsCount)
      );
    } else if (sort === "oldest") {
      enrichedPosts.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    } else {
      // Default: latest
      enrichedPosts.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    }

    res.json({
      status: "success",
      count: enrichedPosts.length,
      posts: enrichedPosts,
    });
  } catch (error) {
    console.error("Get Posts Error:", error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
};

export const getTrendingHashtags = async (_req: Request, res: Response) => {
  try {
    const posts = await db.orm.public.Post.all();
    const tagCountMap = new Map<string, number>();

    for (const post of posts) {
      if (!post.content) continue;
      const matches = post.content.match(/#([a-zA-Z0-9_]+)/g);
      if (matches) {
        const seenInPost = new Set<string>();
        for (const rawTag of matches) {
          const lower = rawTag.toLowerCase();
          if (!seenInPost.has(lower)) {
            seenInPost.add(lower);
            tagCountMap.set(lower, (tagCountMap.get(lower) || 0) + 1);
          }
        }
      }
    }

    const hashtags = Array.from(tagCountMap.entries())
      .map(([tag, postCount]) => ({
        tag,
        name: tag.slice(1),
        postCount,
      }))
      .sort((a, b) => b.postCount - a.postCount);

    res.json({
      status: "success",
      hashtags,
    });
  } catch (error) {
    console.error("Get Trending Hashtags Error:", error);
    res.status(500).json({ error: "Failed to fetch trending hashtags" });
  }
};
