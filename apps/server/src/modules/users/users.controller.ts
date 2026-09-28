import type { Request, Response } from "express";
import { db } from "phatter-db";

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;

        // 1. Fetch the user's public profile
        const user = await db.orm.public.User?.where({ username }).first();

        if(!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // 2. Fetch all posts created by this user
        const posts = await db.orm.public.Post?.where({ authorId: user.id }).all();

        // Sort newest-first in memory
        posts?.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));

        // 3. Map over posts to attach like/comments
        const enrichedPosts = await Promise.all(
            posts?.map(async (post) => {
                const likes = await db.orm.public.Like?.where({ postId: post.id }).all();
                const comments = await db.orm.public.Comment?.where({ postId: post.id }).all();

                return {
                    id: post.id,
                    content: post.content,
                    imageUrl: post.imageUrl,
                    createdAt: post.createdAt,
                    engagement: {
                        likeCount: likes.length,
                        commentsCount: comments?.length,
                    }
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
            },
            postCount: enrichedPosts.length,
            posts: enrichedPosts,
        });
    } catch (error) {
        console.log("Get User Profile Error:", error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
}