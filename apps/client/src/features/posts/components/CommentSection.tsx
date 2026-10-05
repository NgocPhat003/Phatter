import { useState, useEffect, useRef, useCallback } from "react";
import { Reply, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../../../lib/api";
import type { Comment } from "../types/types";
import { Spinner } from "../../../components/common/Spinner";
import styles from "./CommentSection.module.css";

interface CommentSectionProps {
  postId: string;
  currentUser: string | null;
  currentUserAvatar?: string | null;
  onRequireLogin: () => void;
  onCommentCountChange?: (delta: number) => void;
  onOpenProfile?: (username: string) => void;
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  currentUser: string | null;
  currentUserAvatar?: string | null;
  activeReplyId: string | null;
  setActiveReplyId: (id: string | null) => void;
  onRequireLogin: () => void;
  onAddReply: (parentId: string, reply: Comment) => void;
  onOpenProfile?: (username: string) => void;
  formatDate: (dateStr: string) => string;
}

const CommentItem = ({
  comment,
  postId,
  currentUser,
  activeReplyId,
  setActiveReplyId,
  onRequireLogin,
  onAddReply,
  onOpenProfile,
  formatDate,
}: CommentItemProps) => {
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const isReplying = activeReplyId === comment.id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  useEffect(() => {
    if (isReplying && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [isReplying]);

  const handleToggleReply = () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (isReplying) {
      setActiveReplyId(null);
    } else {
      setActiveReplyId(comment.id);
      setReplyText("");
    }
  };

  const handleSubmitReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await api.post(`/comments/${postId}`, {
        content: trimmed,
        parentId: comment.id,
      });

      if (res.data?.comment) {
        onAddReply(comment.id, res.data.comment);
        setReplyText("");
        setActiveReplyId(null);
        setShowReplies(true);
      }
    } catch (err) {
      console.error("Failed to submit reply:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.commentWrapper}>
      <div className={styles.comment}>
        <div className={styles.commentAvatarContainer}>
          <div
            className={`${styles.commentAvatar} ${
              comment.author?.username ? styles.clickable : ""
            }`}
            onClick={() =>
              comment.author?.username && onOpenProfile?.(comment.author.username)
            }
            role="button"
            tabIndex={0}
          >
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
        </div>

        <div className={styles.commentBody}>
          <div className={styles.commentHeader}>
            <span
              className={`${styles.commentAuthor} ${
                comment.author?.username ? styles.clickable : ""
              }`}
              onClick={() =>
                comment.author?.username && onOpenProfile?.(comment.author.username)
              }
              role="button"
              tabIndex={0}
            >
              {comment.author?.username || "Unknown"}
            </span>

            {comment.author?.isGuestSandbox && (
              <span className={styles.commentGuestBadge}>Guest</span>
            )}

            {comment.replyToUsername && (
              <span className={styles.replyingTag}>
                replying to{" "}
                <span
                  className={`${styles.replyingUsername} ${styles.clickable}`}
                  onClick={() => onOpenProfile?.(comment.replyToUsername!)}
                >
                  @{comment.replyToUsername}
                </span>
              </span>
            )}

            <span className={styles.commentTime}>{formatDate(comment.createdAt)}</span>
          </div>

          <p className={styles.commentText}>{comment.content}</p>

          <div className={styles.commentActions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleToggleReply}
            >
              <Reply size={13} />
              <span>Reply</span>
            </button>

            {hasReplies && (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setShowReplies((prev) => !prev)}
              >
                {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                <span>
                  {showReplies
                    ? "Hide replies"
                    : `${comment.replies!.length} ${
                        comment.replies!.length === 1 ? "reply" : "replies"
                      }`}
                </span>
              </button>
            )}
          </div>

          {/* Inline Reply Input */}
          {isReplying && (
            <div className={styles.inlineReplyBox}>
              <div className={styles.inlineReplyHeader}>
                Replying to{" "}
                <strong className={styles.replyingUsername}>
                  @{comment.author?.username || "user"}
                </strong>
              </div>
              <textarea
                ref={replyInputRef}
                className={styles.textarea}
                placeholder={`Reply to @${comment.author?.username || "user"}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmitReply();
                  }
                }}
              />
              <div className={styles.inputActions} style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setActiveReplyId(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.replyBtn}
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim() || isSubmitting}
                >
                  {isSubmitting ? "Replying..." : "Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render Nested Thread Replies */}
      {hasReplies && showReplies && (
        <div className={styles.threadReplies}>
          {comment.replies!.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              postId={postId}
              currentUser={currentUser}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              onRequireLogin={onRequireLogin}
              onAddReply={onAddReply}
              onOpenProfile={onOpenProfile}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CommentSection = ({
  postId,
  currentUser,
  currentUserAvatar,
  onRequireLogin,
  onCommentCountChange,
  onOpenProfile,
}: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
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

  // Submit top-level comment
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

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to recursively append a reply to its parent comment in the tree
  const insertReplyIntoTree = (
    list: Comment[],
    parentId: string,
    newReply: Comment
  ): Comment[] => {
    return list.map((item) => {
      if (item.id === parentId) {
        return {
          ...item,
          replies: [...(item.replies || []), newReply],
        };
      }
      if (item.replies && item.replies.length > 0) {
        return {
          ...item,
          replies: insertReplyIntoTree(item.replies, parentId, newReply),
        };
      }
      return item;
    });
  };

  const handleAddReply = (parentId: string, reply: Comment) => {
    setComments((prev) => insertReplyIntoTree(prev, parentId, reply));
    onCommentCountChange?.(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      {/* Top-Level Comment Input */}
      {currentUser ? (
        <div className={styles.inputArea}>
          <div className={styles.inputAvatar}>
            {currentUserAvatar ? (
              <img
                src={currentUserAvatar}
                alt={currentUser || "Avatar"}
                className={styles.avatarImg}
              />
            ) : currentUser ? (
              currentUser.slice(0, 1).toUpperCase()
            ) : (
              "You"
            )}
          </div>
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

      {/* Threaded Comments List */}
      {loading ? (
        <Spinner size={24} />
      ) : comments.length === 0 ? (
        <div className={styles.emptyState}>No replies yet — be the first!</div>
      ) : (
        <div className={styles.list}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUser={currentUser}
              currentUserAvatar={currentUserAvatar}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              onRequireLogin={onRequireLogin}
              onAddReply={handleAddReply}
              onOpenProfile={onOpenProfile}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
