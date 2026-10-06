import type { Request, Response } from "express";
import { db } from "phatter-db";
import { createNotification } from "../notifications/notifications.db.js";

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

        // Trigger real-time notification to the post author
        try {
          const post = await db.orm.public.Post?.where({ id: postId }).first();
          if (post && post.authorId && String(post.authorId) !== String(userId)) {
            await createNotification({
              recipientId: post.authorId,
              actorId: userId,
              type: "like",
              postId: post.id,
              content: post.content ? post.content.slice(0, 80) : null,
            });
          }
        } catch (notifErr) {
          console.error("Failed to send like notification:", notifErr);
        }

        res.status(201).json({ status: "success", message: "Post liked" });
    } catch (error) {
        console.error("Toggle Like Error:", error);
        res.status(500).json({ error: "Failed to toggle like" });
    }
};