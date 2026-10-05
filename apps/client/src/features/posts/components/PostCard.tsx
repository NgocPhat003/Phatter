import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import type { Post } from "../types/types";
import { Heart, MessageCircle } from "lucide-react";
import { CommentSection } from "./CommentSection";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
  currentUser: string | null;
  onRequireLogin: () => void;
  onPostUpdated?: () => void;
  onOpenProfile?: (username: string) => void;
}

export const PostCard = ({
  post,
  currentUser,
  onRequireLogin,
  onPostUpdated: _onPostUpdated,
  onOpenProfile,
}: PostCardProps) => {
  const [likesCount, setLikesCount] = useState(post.engagement.likesCount);
  const [isLiked, setIsLiked] = useState(post.engagement.isLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.engagement.commentsCount);

  useEffect(() => {
    setLikesCount(post.engagement.likesCount);
    setIsLiked(Boolean(post.engagement.isLiked));
    setCommentsCount(post.engagement.commentsCount);
  }, [post.id, post.engagement.isLiked, post.engagement.commentsCount]);

  const handleToggleLike = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    const prevLiked = isLiked;
    const prevCount = likesCount;
    const nextLiked = !prevLiked;

    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev  - 1)));

    try {
          const res = await api.post(`/likes/${post.id}`);
          
          if (res.data?.isLiked !== undefined) {
            setIsLiked(Boolean(res.data.isLiked));
          } else if (res.data?.message) {
            const likedNow = res.data.message === "Post liked";
            setIsLiked(likedNow);
          }
        } catch (err) {
          console.error("Failed to toggle like:", err);
          setIsLiked(prevLiked);
          setLikesCount(prevCount);
        } finally {
          setIsLiking(false);
        }
      };

  const handleToggleComments = () => {
    setShowComments((prev) => !prev);
  };

  const handleCommentCountChange = (delta: number) => {
    setCommentsCount((prev) => prev + delta);
  };

  const formattedDate = new Date(post.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div
          className={`${styles.avatar} ${post.author?.username ? styles.clickable : ""}`}
          onClick={() => post.author?.username && onOpenProfile?.(post.author.username)}
          role="button"
          tabIndex={0}
        >
          {post.author?.profilePictureUrl ? (
            <img
              src={post.author.profilePictureUrl}
              alt={post.author.username}
              className={styles.avatarImg}
            />
          ) : (
            post.author?.username?.slice(0, 2).toUpperCase() || "??"
          )}
        </div>
        <div className={styles.meta}>
          <div className={styles.userInfo}>
            <span
              className={`${styles.username} ${post.author?.username ? styles.clickable : ""}`}
              onClick={() => post.author?.username && onOpenProfile?.(post.author.username)}
              role="button"
              tabIndex={0}
            >
              {post.author?.username || "Unknown User"}
            </span>
            {post.author?.isGuestSandbox && <span className={styles.guestBadge}>Guest</span>}
          </div>
          <time className={styles.timestamp}>{formattedDate}</time>
        </div>
      </header>

      <p className={styles.bodyText}>{post.content}</p>

      {post.imageUrl && (
        <div className={styles.media}>
          <img src={post.imageUrl} alt="Attached media" className={styles.mediaImg} loading="lazy" />
        </div>
      )}

      <footer className={styles.footer}>
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={isLiking}
          className={`${styles.actionBtn} ${isLiked ? styles.liked : ""}`}
        >
          <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
          <span>{likesCount}</span>
        </button>
        <button
          type="button"
          onClick={handleToggleComments}
          className={`${styles.actionBtn} ${showComments ? styles.commentsActive : ""}`}
        >
          <MessageCircle size={16} fill={showComments ? "currentColor" : "none"} />
          <span>{commentsCount}</span>
        </button>
      </footer>

      {showComments && (
        <CommentSection
          postId={post.id}
          currentUser={currentUser}
          onRequireLogin={onRequireLogin}
          onCommentCountChange={handleCommentCountChange}
          onOpenProfile={onOpenProfile}
        />
      )}
    </article>
  );
};