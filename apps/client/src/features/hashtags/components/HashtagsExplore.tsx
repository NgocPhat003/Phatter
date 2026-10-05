import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../../lib/api";
import type { Post } from "../../posts/types/types";
import { PostCard } from "../../posts/components/PostCard";
import { CreatePost } from "../../posts/components/CreatePost";
import { Spinner } from "../../../components/common/Spinner";
import { ArrowLeft, Search, Flame, Hash, X } from "lucide-react";
import styles from "./HashtagsExplore.module.css";

interface HashtagItem {
  tag: string;
  name: string;
  postCount: number;
}

interface HashtagsExploreProps {
  initialTag?: string | null;
  currentUser: string | null;
  currentUserAvatar?: string | null;
  onBackToTimeline: () => void;
  onOpenProfile: (username: string) => void;
  onRequireLogin: () => void;
}

const DEFAULT_POPULAR_TAGS = [
  "#Phatter",
  "#Welcome",
  "#Community",
  "#Coding",
  "#Design",
  "#Introductions",
];

export const HashtagsExplore = ({
  initialTag,
  currentUser,
  currentUserAvatar,
  onBackToTimeline,
  onOpenProfile,
  onRequireLogin,
}: HashtagsExploreProps) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag || null);
  const [trendingTags, setTrendingTags] = useState<HashtagItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync with initialTag when prop changes
  useEffect(() => {
    if (initialTag !== undefined) {
      setSelectedTag(initialTag);
    }
  }, [initialTag]);

  // Fetch trending hashtags
  const fetchTrending = useCallback(async () => {
    try {
      setLoadingTags(true);
      const res = await api.get("/posts/hashtags/trending");
      setTrendingTags(res.data.hashtags || []);
    } catch (err) {
      console.error("Failed to load trending hashtags:", err);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  // Fetch posts filtered by selected hashtag
  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const res = await api.get("/posts", {
        params: {
          hashtag: selectedTag ? selectedTag.replace(/^#/, "") : undefined,
        },
      });
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error("Failed to load hashtag posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Filter trending tags by search query
  const displayedTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return trendingTags.length > 0
        ? trendingTags
        : DEFAULT_POPULAR_TAGS.map((t) => ({
            tag: t,
            name: t.replace(/^#/, ""),
            postCount: 0,
          }));
    }
    const q = searchQuery.toLowerCase().replace(/^#/, "");
    const baseList =
      trendingTags.length > 0
        ? trendingTags
        : DEFAULT_POPULAR_TAGS.map((t) => ({
            tag: t,
            name: t.replace(/^#/, ""),
            postCount: 0,
          }));
    return baseList.filter((item) => item.name.toLowerCase().includes(q));
  }, [trendingTags, searchQuery]);

  const handleSelectTag = (tag: string) => {
    const formatted = tag.startsWith("#") ? tag : `#${tag}`;
    if (selectedTag?.toLowerCase() === formatted.toLowerCase()) {
      setSelectedTag(null);
    } else {
      setSelectedTag(formatted);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.topRow}>
          <div className={styles.titleArea}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={onBackToTimeline}
              title="Back to Timeline"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className={styles.pageTitle}>
                {selectedTag ? (
                  <span className={styles.highlightTag}>{selectedTag}</span>
                ) : (
                  "Hashtags & Trends"
                )}
              </h2>
              <p className={styles.subtitle}>
                {selectedTag
                  ? `${posts.length} ${posts.length === 1 ? "post" : "posts"} tagged with ${selectedTag}`
                  : "Discover topics, trends, and conversations across Phatter"}
              </p>
            </div>
          </div>

          {selectedTag && (
            <button
              type="button"
              className={styles.clearTagBtn}
              onClick={() => setSelectedTag(null)}
              title="Clear tag filter"
            >
              <X size={14} />
              <span>All Topics</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search hashtags or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Trending Tags Section */}
        <div className={styles.trendingSection}>
          <div className={styles.trendingHeader}>
            <Flame size={18} className={styles.trendingIcon} />
            <h3 className={styles.trendingTitle}>
              {trendingTags.length > 0 ? "Trending Hashtags" : "Suggested Topics"}
            </h3>
          </div>

          {loadingTags ? (
            <Spinner size={24} />
          ) : (
            <div className={styles.tagsCloud}>
              {displayedTags.map((t) => {
                const isSelected =
                  selectedTag?.toLowerCase() === t.tag.toLowerCase();

                return (
                  <button
                    key={t.tag}
                    type="button"
                    className={`${styles.tagPill} ${
                      isSelected ? styles.activeTagPill : ""
                    }`}
                    onClick={() => handleSelectTag(t.tag)}
                  >
                    <Hash size={14} />
                    <span>{t.name}</span>
                    {t.postCount > 0 && (
                      <span className={styles.tagCountBadge}>
                        {t.postCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Create Post in this Topic */}
      <CreatePost
        currentUser={currentUser}
        currentUserAvatar={currentUserAvatar}
        onPostCreated={() => {
          fetchPosts();
          fetchTrending();
        }}
      />

      {/* Feed Title */}
      <div className={styles.feedHeader}>
        <span className={styles.feedTitle}>
          {selectedTag ? (
            <>
              Posts in <strong className={styles.highlightTag}>{selectedTag}</strong>
            </>
          ) : (
            "Recent Discussions"
          )}
        </span>
      </div>

      {/* Posts Feed */}
      <div className={styles.postsList}>
        {loadingPosts ? (
          <Spinner size={32} />
        ) : posts.length === 0 ? (
          <div className={styles.emptyBox}>
            <p className={styles.emptyTitle}>
              {selectedTag
                ? `No posts found with ${selectedTag} yet.`
                : "No posts found in this topic."}
            </p>
            <p className={styles.subtitle} style={{ marginBottom: 16 }}>
              Be the first to share your thoughts using this hashtag!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              currentUserAvatar={currentUserAvatar}
              onRequireLogin={onRequireLogin}
              onPostUpdated={fetchPosts}
              onOpenProfile={onOpenProfile}
              onSelectHashtag={(tag) => setSelectedTag(tag)}
            />
          ))
        )}
      </div>
    </div>
  );
};
