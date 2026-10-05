import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import type { Post } from "../features/posts/types/types";
import { PostCard } from "../features/posts/components/PostCard";
import { CreatePost } from "../features/posts/components/CreatePost";
import { ProfileView } from "../features/users/components/ProfileView";
import { MainLayout } from "../layouts/MainLayout";
import { Globe, Users, Clock, Flame, History } from "lucide-react";
import styles from "./Home.module.css";

interface HomeProps {
  currentUser: string | null;
  onLogout: () => void;
}

export const Home = ({ currentUser, onLogout }: HomeProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRealm, setActiveRealm] = useState<"global" | "personal">("global");
  const [activeSort, setActiveSort] = useState<"latest" | "popular" | "oldest">("latest");
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/posts", {
        params: {
          realm: activeRealm,
          sort: activeSort,
        },
      });
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  }, [activeRealm, activeSort]);

  useEffect(() => {
    if (!viewingProfile) {
      fetchFeed();
    }
  }, [fetchFeed, viewingProfile]);

  return (
    <MainLayout
      currentUser={currentUser}
      onLogout={onLogout}
      onOpenProfile={(u) => setViewingProfile(u)}
      onGoHome={() => setViewingProfile(null)}
    >
      {viewingProfile ? (
        <ProfileView
          username={viewingProfile}
          currentUser={currentUser}
          onBack={() => setViewingProfile(null)}
          onRequireLogin={() => {}}
          onOpenProfile={(u) => setViewingProfile(u)}
        />
      ) : (
        <>
          <header className={styles.feedHeader}>
            <h2 className={styles.pageTitle}>Home Feed</h2>

            <div className={styles.realmTabs}>
              <button
                className={`${styles.realmTab} ${
                  activeRealm === "global" ? styles.activeRealmTab : ""
                }`}
                onClick={() => setActiveRealm("global")}
              >
                <Globe size={16} />
                <span>Global Realm</span>
              </button>
              <button
                className={`${styles.realmTab} ${
                  activeRealm === "personal" ? styles.activeRealmTab : ""
                }`}
                onClick={() => setActiveRealm("personal")}
              >
                <Users size={16} />
                <span>Personal Realm</span>
              </button>
            </div>

            <div className={styles.filterPills}>
              <button
                className={`${styles.filterPill} ${
                  activeSort === "latest" ? styles.activeFilterPill : ""
                }`}
                onClick={() => setActiveSort("latest")}
              >
                <Clock size={14} />
                <span>Latest</span>
              </button>
              <button
                className={`${styles.filterPill} ${
                  activeSort === "popular" ? styles.activeFilterPill : ""
                }`}
                onClick={() => setActiveSort("popular")}
              >
                <Flame size={14} />
                <span>Popular</span>
              </button>
              <button
                className={`${styles.filterPill} ${
                  activeSort === "oldest" ? styles.activeFilterPill : ""
                }`}
                onClick={() => setActiveSort("oldest")}
              >
                <History size={14} />
                <span>Oldest</span>
              </button>
            </div>
          </header>

          <CreatePost currentUser={currentUser} onPostCreated={fetchFeed} />

          {loading ? (
            <div className={styles.statusContainer}>Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className={styles.statusContainer}>
              {activeRealm === "personal"
                ? "No posts in your personal realm yet. Follow other users to see their posts here!"
                : "No posts to show yet."}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onRequireLogin={() => {}}
                onPostUpdated={fetchFeed}
                onOpenProfile={(u) => setViewingProfile(u)}
              />
            ))
          )}
        </>
      )}
    </MainLayout>
  );
};