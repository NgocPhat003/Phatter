import { useState, useEffect, useCallback } from "react";
import { Bookmark } from "lucide-react";
import { api } from "../../../lib/api";
import { PostCard } from "../../posts/components/PostCard";
import { Spinner } from "../../../components/common/Spinner";
import type { Post } from "../../posts/types/types";
import styles from "./BookmarksView.module.css";

interface BookmarksViewProps {
  currentUser: string | null;
  currentUserAvatar?: string | null;
  onOpenProfile?: (username: string) => void;
  onSelectHashtag?: (tag: string) => void;
  onBackToTimeline?: () => void;
  onRequireLogin: () => void;
}

export const BookmarksView = ({
  currentUser,
  currentUserAvatar,
  onOpenProfile,
  onSelectHashtag,
  onBackToTimeline,
  onRequireLogin,
}: BookmarksViewProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/bookmarks");
      setPosts(res.data?.posts || []);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>
            <Bookmark size={22} className={styles.titleIcon} />
            Bookmarks
          </h2>
        </div>
        <p className={styles.subtitle}>
          {currentUser ? `@${currentUser}'s saved posts` : "Your saved posts"}
        </p>
      </header>

      {/* Content */}
      {loading ? (
        <div className={styles.spinnerContainer}>
          <Spinner size={32} />
        </div>
      ) : posts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrapper}>
            <Bookmark size={32} />
          </div>
          <h3 className={styles.emptyTitle}>Save posts for later</h3>
          <p className={styles.emptyDesc}>
            Don't let the good ones get away! Click the bookmark icon on any post to save it here for easy reading later.
          </p>
          {onBackToTimeline && (
            <button
              type="button"
              className={styles.exploreBtn}
              onClick={onBackToTimeline}
            >
              Explore Feed
            </button>
          )}
        </div>
      ) : (
        <div className={styles.postsList}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              currentUserAvatar={currentUserAvatar}
              onRequireLogin={onRequireLogin}
              onOpenProfile={onOpenProfile}
              onSelectHashtag={onSelectHashtag}
              onPostUpdated={fetchBookmarks}
            />
          ))}
        </div>
      )}
    </div>
  );
};
