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