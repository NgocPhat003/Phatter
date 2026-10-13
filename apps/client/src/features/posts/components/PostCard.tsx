import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import type { Post } from "../types/types";
import { Heart, MessageCircle, Bookmark, Trash2 } from "lucide-react";
import { CommentSection } from "./CommentSection";
import { ConfirmModal } from "../../../components/common/ConfirmModal";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
  currentUser: string | null;
  currentUserAvatar?: string | null;
  onRequireLogin: () => void;
  onPostUpdated?: () => void;
  onPostDeleted?: (postId: string) => void;
  onOpenProfile?: (username: string) => void;
  onSelectHashtag?: (tag: string) => void;
}

export const PostCard = ({
  post,
  currentUser,
  currentUserAvatar,
  onRequireLogin,
  onPostUpdated: _onPostUpdated,
  onPostDeleted,
  onOpenProfile,
  onSelectHashtag,
}: PostCardProps) => {
  const [likesCount, setLikesCount] = useState(post.engagement.likesCount);
  const [isLiked, setIsLiked] = useState(post.engagement.isLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(post.engagement.isBookmarked));
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.engagement.commentsCount);

  const isOwner = Boolean(
    currentUser &&
      (typeof currentUser === "string"
        ? currentUser === post.author?.username
        : (currentUser as any)?.username === post.author?.username)
  );

  const handleDeletePost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/posts/${post.id}`);
      setShowDeleteModal(false);
      onPostDeleted?.(post.id);
    } catch (err: any) {
      console.error("Failed to delete post:", err);
      alert(err.response?.data?.error || "Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setLikesCount(post.engagement.likesCount);
    setIsLiked(Boolean(post.engagement.isLiked));
    setIsBookmarked(Boolean(post.engagement.isBookmarked));
    setCommentsCount(post.engagement.commentsCount);
  }, [post.id, post.engagement.isLiked, post.engagement.commentsCount, post.engagement.isBookmarked]);

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

  const handleToggleBookmark = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }

    if (isBookmarking) return;
    setIsBookmarking(true);

    const prevBookmarked = isBookmarked;
    const nextBookmarked = !prevBookmarked;
    setIsBookmarked(nextBookmarked);

    try {
      const res = await api.post(`/bookmarks/${post.id}`);
      if (res.data?.isBookmarked !== undefined) {
        setIsBookmarked(Boolean(res.data.isBookmarked));
      }
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
      setIsBookmarked(prevBookmarked);
    } finally {
      setIsBookmarking(false);
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

        {isOwner && (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDeletePost}
            disabled={isDeleting}
            title="Delete post"
          >
            <Trash2 size={16} />
          </button>
        )}
      </header>

      <p className={styles.bodyText}>
        {post.content.split(/(#[a-zA-Z0-9_]+)/g).map((part, index) => {
          if (part.startsWith("#") && part.length > 1) {
            return (
              <span
                key={index}
                className={styles.hashtag}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectHashtag?.(part);
                }}
                role="button"
                tabIndex={0}
                title={`Explore posts tagged with ${part}`}
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </p>

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
        <button
          type="button"
          onClick={handleToggleBookmark}
          disabled={isBookmarking}
          className={`${styles.actionBtn} ${isBookmarked ? styles.bookmarked : ""}`}
          title={isBookmarked ? "Remove bookmark" : "Save post to bookmarks"}
        >
          <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} />
          <span>{isBookmarked ? "Saved" : "Save"}</span>
        </button>
      </footer>

      {showComments && (
        <CommentSection
          postId={post.id}
          currentUser={currentUser}
          currentUserAvatar={currentUserAvatar}
          onRequireLogin={onRequireLogin}
          onCommentCountChange={handleCommentCountChange}
          onOpenProfile={onOpenProfile}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        danger
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </article>
  );
};