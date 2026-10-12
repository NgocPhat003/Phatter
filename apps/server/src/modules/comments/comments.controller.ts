import type { Request, Response } from "express";
import crypto from "crypto";
import { db } from "phatter-db";
import { createNotification } from "../notifications/notifications.db.js";
import { CreateCommentSchema } from "@project-phatter/validation";

/**
 * GET /api/comments/:postId
 * Fetches all comments for a post, enriched with authors and structured into thread chains.
 */
export const getComments = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = (await db.orm.public.Comment?.where({ postId }).all()) || [];

    // Sort by createdAt ascending
    comments.sort((a: any, b: any) => new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime());

    // Enrich comments with author and replyTo details
    const rawComments = await Promise.all(
      comments.map(async (c: any) => {
        const author = await db.orm.public.User?.where({ id: c.authorId }).first();
        let replyToUsername: string | null = null;

        if (c.parentId) {
          const parentComment = await db.orm.public.Comment?.where({ id: c.parentId }).first();
          if (parentComment) {
            const parentAuthor = await db.orm.public.User?.where({ id: parentComment.authorId }).first();
            replyToUsername = parentAuthor?.username || null;
          }
        }

        return {
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          parentId: c.parentId || null,
          replyToUsername,
          author: author
            ? {
                id: author.id,
                username: author.username,
                profilePictureUrl: author.profilePictureUrl,
                isGuestSandbox: Boolean(author.isGuestSandbox),
              }
            : null,
        };
      })
    );

    // Build comment chain trees
    const commentMap = new Map<string, any>();
    rawComments.forEach((c) => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    const rootComments: any[] = [];

    rawComments.forEach((c) => {
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId).replies.push(commentMap.get(c.id));
      } else {
        rootComments.push(commentMap.get(c.id));
      }
    });

    res.json({
      status: "success",
      count: rawComments.length,
      comments: rootComments,
    });
  } catch (error) {
    console.error("Get Comments Error:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};

/**
 * POST /api/comments/:postId
 * Creates a top-level comment or a threaded reply to an existing comment.
 */
export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const currentUserId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parseResult = CreateCommentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues?.[0]?.message || "Invalid comment data";
      return res.status(400).json({ error: errorMessage });
    }

    const { content, parentId } = parseResult.data;

    let replyToUsername: string | null = null;
    let validParentId: string | null = null;

    if (parentId && typeof parentId === "string") {
      const parentComment = await db.orm.public.Comment?.where({ id: parentId }).first();
      if (parentComment) {
        validParentId = parentComment.id;
        const parentUser = await db.orm.public.User?.where({ id: parentComment.authorId }).first();
        replyToUsername = parentUser?.username || null;
      }
    }

    const commentId = `cmt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const newComment = await db.orm.public.Comment?.create({
      id: commentId,
      content: content.trim(),
      postId,
      authorId: currentUserId,
      parentId: validParentId,
    });

    if (!newComment) {
      return res.status(500).json({ error: "Failed to create comment" });
    }

    const authorUser = await db.orm.public.User?.where({ id: currentUserId }).first();
    const author = authorUser
      ? {
          id: authorUser.id,
          username: authorUser.username,
          profilePictureUrl: authorUser.profilePictureUrl,
          isGuestSandbox: Boolean(authorUser.isGuestSandbox),
        }
      : null;

    // Trigger real-time notifications
    try {
      let notifiedParentAuthor = false;
      if (validParentId) {
        const parentComment = await db.orm.public.Comment?.where({ id: validParentId }).first();
        const parentAuthorId = parentComment?.authorId;
        if (parentAuthorId && String(parentAuthorId) !== String(currentUserId)) {
          notifiedParentAuthor = true;
          await createNotification({
            recipientId: parentAuthorId,
            actorId: currentUserId,
            type: "reply",
            postId,
            commentId: newComment.id,
            content: content.trim().slice(0, 100),
          });
        }
      }

      // Notify post author if not already notified as parent author
      const post = await db.orm.public.Post?.where({ id: postId }).first();
      const postAuthorId = post?.authorId;
      if (
        postAuthorId &&
        String(postAuthorId) !== String(currentUserId) &&
        !notifiedParentAuthor
      ) {
        await createNotification({
          recipientId: postAuthorId,
          actorId: currentUserId,
          type: "comment",
          postId,
          commentId: newComment.id,
          content: content.trim().slice(0, 100),
        });
      }
    } catch (notifErr) {
      console.error("Failed to send comment notification:", notifErr);
    }

    res.status(201).json({
      status: "success",
      comment: {
        id: newComment.id,
        content: newComment.content,
        postId: newComment.postId,
        createdAt: newComment.createdAt,
        parentId: newComment.parentId,
        replyToUsername,
        author,
        replies: [],
      },
    });
  } catch (error) {
    console.error("Create Comment Error:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!commentId || typeof commentId !== "string") {
      return res.status(400).json({ error: "Invalid comment ID" });
    }

    const comment = await db.orm.public.Comment?.where({ id: commentId }).first();
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Verify ownership: allow comment author or post author to delete
    const post = await db.orm.public.Post?.where({ id: comment.postId }).first();
    const isCommentAuthor = String(comment.authorId) === String(currentUserId);
    const isPostAuthor = post && String(post.authorId) === String(currentUserId);

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ error: "Forbidden: You cannot delete this comment" });
    }

    // Clean up notifications pointing to this comment
    try {
      const notifs = (await db.orm.public.Notification?.where({ commentId }).all()) || [];
      await Promise.all(
        notifs.map((n: any) => db.orm.public.Notification?.where({ id: n.id }).delete())
      );
    } catch (notifErr) {
      console.warn("[deleteComment] Warning: Failed to clean up notifications for comment:", notifErr);
    }

    // Delete comment
    await db.orm.public.Comment?.where({ id: commentId }).delete();

    res.json({
      status: "success",
      message: "Comment deleted successfully",
      commentId,
      postId: comment.postId,
    });
  } catch (error) {
    console.error("Delete Comment Error:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};