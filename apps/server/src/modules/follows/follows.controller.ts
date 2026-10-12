import type { Request, Response } from "express";
import { db } from "phatter-db";
import { createNotification } from "../notifications/notifications.db.js";

/**
 * Follows a target user by username.
 */
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

      // Trigger real-time notification
      try {
        await createNotification({
          recipientId: targetUser.id,
          actorId: currentUserId,
          type: "follow",
        });
      } catch (notifErr) {
        console.error("Failed to send follow notification:", notifErr);
      }
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

/**
 * Unfollows a target user by username.
 */
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

/**
 * Returns followers for a given username.
 */
export const getUserFollowers = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    const user = await db.orm.public.User?.where({ username }).first();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Records where this user is being followed (followingId = user.id)
    const followRecords = (await db.orm.public.Follows?.where({ followingId: user.id }).all()) || [];

    // Current user's followings to check isFollowing status
    const currentUserFollowings = currentUserId
      ? (await db.orm.public.Follows?.where({ followerId: currentUserId }).all()) || []
      : [];
    const followingSet = new Set(currentUserFollowings.map((f: any) => String(f.followingId)));

    const followers = await Promise.all(
      followRecords.map(async (f: any) => {
        const followerUser = await db.orm.public.User?.where({ id: f.followerId }).first();
        if (!followerUser) return null;

        const subFollowers = (await db.orm.public.Follows?.where({ followingId: followerUser.id }).all()) || [];
        const subFollowings = (await db.orm.public.Follows?.where({ followerId: followerUser.id }).all()) || [];
        const posts = (await db.orm.public.Post?.where({ authorId: followerUser.id }).all()) || [];

        return {
          id: followerUser.id,
          username: followerUser.username,
          profilePictureUrl: followerUser.profilePictureUrl,
          bio: followerUser.bio,
          isGuestSandbox: followerUser.isGuestSandbox,
          createdAt: followerUser.createdAt,
          followersCount: subFollowers.length,
          followingCount: subFollowings.length,
          postsCount: posts.length,
          isFollowing: followingSet.has(String(followerUser.id)),
          isSelf: Boolean(currentUserId && String(followerUser.id) === String(currentUserId)),
        };
      })
    );

    const validFollowers = followers.filter(Boolean);

    res.json({
      status: "success",
      users: validFollowers,
    });
  } catch (error) {
    console.error("Get User Followers Error:", error);
    res.status(500).json({ error: "Failed to fetch followers" });
  }
};

/**
 * Returns users followed by a given username.
 */
export const getUserFollowing = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    const user = await db.orm.public.User?.where({ username }).first();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Records where this user is the follower (followerId = user.id)
    const followRecords = (await db.orm.public.Follows?.where({ followerId: user.id }).all()) || [];

    // Current user's followings to check isFollowing status
    const currentUserFollowings = currentUserId
      ? (await db.orm.public.Follows?.where({ followerId: currentUserId }).all()) || []
      : [];
    const followingSet = new Set(currentUserFollowings.map((f: any) => String(f.followingId)));

    const followings = await Promise.all(
      followRecords.map(async (f: any) => {
        const followedUser = await db.orm.public.User?.where({ id: f.followingId }).first();
        if (!followedUser) return null;

        const subFollowers = (await db.orm.public.Follows?.where({ followingId: followedUser.id }).all()) || [];
        const subFollowings = (await db.orm.public.Follows?.where({ followerId: followedUser.id }).all()) || [];
        const posts = (await db.orm.public.Post?.where({ authorId: followedUser.id }).all()) || [];

        return {
          id: followedUser.id,
          username: followedUser.username,
          profilePictureUrl: followedUser.profilePictureUrl,
          bio: followedUser.bio,
          isGuestSandbox: followedUser.isGuestSandbox,
          createdAt: followedUser.createdAt,
          followersCount: subFollowers.length,
          followingCount: subFollowings.length,
          postsCount: posts.length,
          isFollowing: followingSet.has(String(followedUser.id)),
          isSelf: Boolean(currentUserId && String(followedUser.id) === String(currentUserId)),
        };
      })
    );

    const validFollowings = followings.filter(Boolean);

    res.json({
      status: "success",
      users: validFollowings,
    });
  } catch (error) {
    console.error("Get User Following Error:", error);
    res.status(500).json({ error: "Failed to fetch following" });
  }
};
