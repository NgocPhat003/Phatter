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
      user: {
        id: user.id,
        username: user.username,
        bio: user.bio,
        profilePictureUrl: user.profilePictureUrl,
        isGuestSandbox: user.isGuestSandbox,
        createdAt: user.createdAt,
        followersCount: followers.length,
        followingCount: following.length,
        postsCount: posts.length,
        isFollowing,
        isSelf: Boolean(currentUserId && currentUserId === user.id),
      },
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

    const parseResult = UserProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid input data";
      return res.status(400).json({ error: errorMsg });
    }

    const { bio, profilePictureUrl } = parseResult.data;

    const updateData: { bio?: string; profilePictureUrl?: string } = {};
    if (bio !== undefined) updateData.bio = bio;
    if (profilePictureUrl !== undefined) updateData.profilePictureUrl = profilePictureUrl;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    await db.orm.public.User?.where({ id: currentUserId }).update(updateData);
    const updatedUser = await db.orm.public.User?.where({ id: currentUserId }).first();

    res.json({
      status: "success",
      message: "Profile updated successfully",
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

export const getUsersDirectory = async (req: Request, res: Response) => {
  try {
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    const { search, filter } = req.query;

    // 1. Fetch all users from database
    let users = (await db.orm.public.User?.all()) || [];

    // Filter by search query (username or bio) if provided
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toLowerCase();
      users = users.filter((u: any) => {
        const usernameMatch = u.username?.toLowerCase().includes(q);
        const bioMatch = u.bio?.toLowerCase().includes(q);
        return usernameMatch || bioMatch;
      });
    }

    // Current user's followings to check isFollowing status
    const currentUserFollowings = currentUserId
      ? (await db.orm.public.Follows?.where({ followerId: currentUserId }).all()) || []
      : [];
    const followingSet = new Set(currentUserFollowings.map((f: any) => String(f.followingId)));

    // 2. Enrich users with follower counts, post counts, and following status
    const enrichedUsers = await Promise.all(
      users.map(async (u: any) => {
        const followers = (await db.orm.public.Follows?.where({ followingId: u.id }).all()) || [];
        const following = (await db.orm.public.Follows?.where({ followerId: u.id }).all()) || [];
        const posts = (await db.orm.public.Post?.where({ authorId: u.id }).all()) || [];

        return {
          id: u.id,
          username: u.username,
          profilePictureUrl: u.profilePictureUrl,
          bio: u.bio,
          isGuestSandbox: u.isGuestSandbox,
          createdAt: u.createdAt,
          followersCount: followers.length,
          followingCount: following.length,
          postsCount: posts.length,
          isFollowing: followingSet.has(String(u.id)),
          isSelf: Boolean(currentUserId && String(u.id) === String(currentUserId)),
        };
      })
    );

    // 3. Apply tab filter
    if (filter === "following" && currentUserId) {
      const filtered = enrichedUsers.filter((u) => u.isFollowing);
      return res.json({
        status: "success",
        users: filtered,
      });
    }

    if ((filter === "suggestions" || filter === "suggested") && currentUserId) {
      // Show users that current user is NOT following (excluding self)
      const suggestions = enrichedUsers
        .filter((u) => !u.isSelf && !u.isFollowing)
        .sort((a, b) => {
          if (a.isGuestSandbox !== b.isGuestSandbox) {
            return a.isGuestSandbox ? 1 : -1;
          }
          return b.followersCount - a.followersCount;
        });

      return res.json({
        status: "success",
        users: suggestions,
      });
    }

    // Default ("all"): Sort real users first, then by followersCount descending
    enrichedUsers.sort((a, b) => {
      if (a.isGuestSandbox !== b.isGuestSandbox) {
        return a.isGuestSandbox ? 1 : -1;
      }
      return b.followersCount - a.followersCount;
    });

    res.json({
      status: "success",
      users: enrichedUsers,
    });
  } catch (error) {
    console.error("Get Users Directory Error:", error);
    res.status(500).json({ error: "Failed to fetch user directory" });
  }
};