import type { Request, Response } from "express";
import { db } from "phatter-db";

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

export const getPosts = async (_req: Request, res: Response) => {
    try {
        // Fetch all posts and sort the newest first
        const posts = await db.orm.public.Post.all();
        posts.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        // Map over each post to attach the post author, likes and comments
        const enrichedPosts = await Promise.all(
            posts.map(async (post) => {
                // Fetch author's public profile data
                const author = await db.orm.public.User?.where({ id: post.authorId }).first();

                // Fetch engagement metrics
                const likes = await db.orm.public.Like?.where({ postId: post.id }).all();
                const comments = await db.orm.public.Comment?.where({ postId: post.id }).all();

                return {
                    id: post.id,
                    content: post.content,
                    imageUrl: post.imageUrl,
                    createdAt: post.createdAt,
                    author: author ? {
                        id: author.id,
                        username: author.username,
                        profilePictureUrl: author.profilePictureUrl,
                        isGuestSandbox: author.isGuestSandbox,
                    } : null,
                    engagement: {
                        likesCount: likes.length,
                        commentsCount: comments.length,
                    }
                };
            })
        );

        res.json({
            status: "success",
            count: enrichedPosts?.length,
            posts: enrichedPosts,
        });
    } catch (error) {
        console.error("Get Posts Error:", error);
        res.status(500).json({ error: "Failed to fetch feed" });
    }
};