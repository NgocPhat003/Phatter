import type { Request, Response } from "express";
import { db } from "phatter-db";

export const createComment = async (req: Request, res: Response) => {
    try{
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!content || typeof content !== "string") {
            return res.status(400).json({ error: "Comment content is required" });
        }

        const newComment = await db.orm.public.Comment?.create({
            content,
            postId,
            authorId: userId,
        });

        res.status(201).json({
            status: "success",
            comment: newComment,
        });
    } catch (error) {
        console.error("Create Comment Error:", error);
        res.status(500).json({ error: "Failed to add comment" });
    }
};