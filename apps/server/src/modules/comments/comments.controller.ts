import type { Request, Response } from "express";
import { db } from "phatter-db";

export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = await db.orm.public.Comment.where({ postId }).all();
    comments.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

    const enrichedComments = await Promise.all(
      comments.map(async (comment: any) => {
        const authorId = comment.authorId || comment.userId;
        const author = authorId
          ? await db.orm.public.User.where({ id: authorId }).first()
          : null;

        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: author
            ? {
                id: author.id,
                username: author.username,
                profilePictureUrl: author.profilePictureUrl,
                isGuestSandbox: author.isGuestSandbox,
              }
            : null,
        };
      })
    );

    res.json({
      status: "success",
      count: enrichedComments.length,
      comments: enrichedComments,
    });
  } catch (error) {
    console.error("Get Comments Error:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Comment content cannot be empty" });
    }

    const newComment = await db.orm.public.Comment.create({
      content: content.trim(),
      postId,
      userId: currentUserId,
      authorId: currentUserId,
    });

    const author = await db.orm.public.User.where({ id: currentUserId }).first();

    res.status(201).json({
      status: "success",
      comment: {
        id: newComment.id,
        content: newComment.content,
        createdAt: newComment.createdAt || new Date().toISOString(),
        author: author
          ? {
              id: author.id,
              username: author.username,
              profilePictureUrl: author.profilePictureUrl,
              isGuestSandbox: author.isGuestSandbox,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Create Comment Error:", error);
    res.status(500).json({ error: "Failed to post comment" });
  }
};