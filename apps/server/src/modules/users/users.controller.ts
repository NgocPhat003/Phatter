import type { Request, Response } from "express";
import { db } from "phatter-db";
import { UserProfileSchema } from "@project-phatter/validation";

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    // 1. Fetch user
    const user = await db.orm.public.User?.where({ username }).first();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Calculate follower & following counts
    const followers = (await db.orm.public.Follows?.where({ followingId: user.id }).all()) || [];
    const following = (await db.orm.public.Follows?.where({ followerId: user.id }).all()) || [];

    // 3. Check if current user is following this profile
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const followRecord = await db.orm.public.Follows?.where({
        followerId: currentUserId,
        followingId: user.id,
      }).first();
      isFollowing = Boolean(followRecord);
    }

    // 4. Fetch posts created by this user
    const posts = (await db.orm.public.Post?.where({ authorId: user.id }).all()) || [];
    posts.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    // 5. Enrich posts with author and engagement stats
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const likes = (await db.orm.public.Like?.where({ postId: post.id }).all()) || [];
        const comments = (await db.orm.public.Comment?.where({ postId: post.id }).all()) || [];

        const isLiked = Boolean(
          currentUserId &&
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
          author: {
            id: user.id,
            username: user.username,
            profilePictureUrl: user.profilePictureUrl,
            isGuestSandbox: user.isGuestSandbox,
          },
          engagement: {
            likesCount: likes.length,
            commentsCount: comments.length,
            isLiked,
          },
        };
      })
    );

    res.json({
      status: "success",
      profile: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        profilePictureUrl: user.profilePictureUrl,
        isGuestSandbox: user.isGuestSandbox,
        createdAt: user.createdAt,
        followersCount: followers.length,
        followingCount: following.length,
        isFollowing,
        isSelf: currentUserId ? String(currentUserId) === String(user.id) : false,
      },
      postCount: enrichedPosts.length,
      posts: enrichedPosts,
    });
  } catch (error) {
    console.error("Get User Profile Error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate body with shared schema
    const parseResult = UserProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues?.[0]?.message || "Invalid profile data";
      return res.status(400).json({ error: errorMessage });
    }

    const { bio, profilePictureUrl } = parseResult.data;

    const updatePayload: Record<string, any> = {};
    if (bio !== undefined) updatePayload.bio = bio;
    if (profilePictureUrl !== undefined) updatePayload.profilePictureUrl = profilePictureUrl;

    if (Object.keys(updatePayload).length > 0) {
      await db.orm.public.User?.where({ id: currentUserId }).update(updatePayload);
    }

    const updatedUser = await db.orm.public.User?.where({ id: currentUserId }).first();

    res.json({
      status: "success",
      user: {
        id: updatedUser?.id,
        username: updatedUser?.username,
        bio: updatedUser?.bio,
        profilePictureUrl: updatedUser?.profilePictureUrl,
        isGuestSandbox: updatedUser?.isGuestSandbox,
      },
    });
  } catch (error) {
    console.error("Update User Profile Error:", error);
    res.status(500).json({ error: "Failed to update user profile" });
  }
};

export const followUser = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const targetUser = await db.orm.public.User?.where({ username }).first();
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (String(targetUser.id) === String(currentUserId)) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    // Check if already following
    const existing = await db.orm.public.Follows?.where({
      followerId: currentUserId,
      followingId: targetUser.id,
    }).first();

    if (!existing) {
      await db.orm.public.Follows?.create({
        followerId: currentUserId,
        followingId: targetUser.id,
      });
    }

    res.json({
      status: "success",
      message: `Now following @${username}`,
      isFollowing: true,
    });
  } catch (error) {
    console.error("Follow User Error:", error);
    res.status(500).json({ error: "Failed to follow user" });
  }
};

export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const targetUser = await db.orm.public.User?.where({ username }).first();
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.orm.public.Follows?.where({
      followerId: currentUserId,
      followingId: targetUser.id,
    }).delete();

    res.json({
      status: "success",
      message: `Unfollowed @${username}`,
      isFollowing: false,
    });
  } catch (error) {
    console.error("Unfollow User Error:", error);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
};