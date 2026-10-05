import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../../../lib/api";
import type { Comment } from "../types/types";
import styles from "./CommentSection.module.css";

interface CommentSectionProps {
  postId: string;
  currentUser: string | null;
  onRequireLogin: () => void;
  onCommentCountChange?: (delta: number) => void;
}

export const CommentSection = ({
  postId,
  currentUser,
  onRequireLogin,
  onCommentCountChange,
}: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/comments/${postId}`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }

    const trimmed = newComment.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/comments/${postId}`, { content: trimmed });
      const created: Comment = res.data.comment;
      setComments((prev) => [...prev, created]);
      setNewComment("");
      onCommentCountChange?.(1);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to submit
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className={styles.section}>
      {/* Comment Input */}
      {currentUser ? (
        <div className={styles.inputArea}>
          <div className={styles.inputAvatar}>You</div>
          <div className={styles.inputWrapper}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Post your reply"
              value={newComment}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={500}
            />
            {newComment.trim() && (
              <div className={styles.inputActions}>
                <button
                  type="button"
                  className={styles.replyBtn}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Posting..." : "Reply"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.loginPrompt}>
          <button type="button" className={styles.loginLink} onClick={onRequireLogin}>
            Log in
          </button>{" "}
          to reply
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className={styles.loadingState}>Loading replies...</div>
      ) : comments.length === 0 ? (
        <div className={styles.emptyState}>No replies yet — be the first!</div>
      ) : (
        <div className={styles.list}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.comment}>
              <div className={styles.commentAvatar}>
                {comment.author?.profilePictureUrl ? (
                  <img
                    src={comment.author.profilePictureUrl}
                    alt={comment.author.username}
                    className={styles.commentAvatarImg}
                  />
                ) : (
                  comment.author?.username?.slice(0, 2).toUpperCase() || "??"
                )}
              </div>
              <div className={styles.commentBody}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>
                    {comment.author?.username || "Unknown"}
                  </span>
                  {comment.author?.isGuestSandbox && (
                    <span className={styles.commentGuestBadge}>Guest</span>
                  )}
                  <span className={styles.commentTime}>{formatDate(comment.createdAt)}</span>
                </div>
                <p className={styles.commentText}>{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
