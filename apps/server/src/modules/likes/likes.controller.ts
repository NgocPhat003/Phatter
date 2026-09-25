import type { Request, Response } from "express";
import { db } from "phatter-db";

export const toggleLike = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Check if the like already exists
        const existingLike = await db.orm.public.Like?.where({
            postId,
            userId 
        }).first();

        if (existingLike) {
            // If it exists, delete it (unlike)
            await db.orm.public.Like?.where({ id: existingLike.id }).delete();
            return res.json({status: "success", message: "Post unliked" });
        }

        // If it doesn't exist, create it (Like)
        await db.orm.public.Like?.create({
            postId,
            userId, 
        });

        res.status(201).json({ status: "success", message: "Post liked" });
    } catch (error) {
        console.error("Toggle Like Error:", error);
        res.status(500).json({ error: "Failed to toggle like" });
    }
};