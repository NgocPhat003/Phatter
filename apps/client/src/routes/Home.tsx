import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import type { Post, CurrentUser } from "../features/posts/types/types";
import { PostCard } from "../features/posts/components/PostCard";
import { CreatePost } from "../features/posts/components/CreatePost";
import { ProfileView } from "../features/users/components/ProfileView";
import { UserDirectory } from "../features/users/components/UserDirectory";
import { HashtagsExplore } from "../features/hashtags/components/HashtagsExplore";
import { MessagesView } from "../features/messages/components/MessagesView";
import { MainLayout } from "../layouts/MainLayout";
import { Spinner } from "../components/common/Spinner";
import { connectSocket } from "../lib/socket";
import { Globe, Users, Clock, Flame, History } from "lucide-react";
import styles from "./Home.module.css";


interface HomeProps {
  currentUser: CurrentUser | string | null;
  onLogout: () => void;
  onProfileUpdated?: () => void;
}

export const Home = ({ currentUser, onLogout, onProfileUpdated }: HomeProps) => {
  const currentUsername =
    typeof currentUser === "string" ? currentUser : currentUser?.username || null;
  const currentUserAvatar =
    typeof currentUser === "object" ? currentUser?.profilePictureUrl : null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<"timeline" | "directory" | "hashtags" | "messages">("timeline");
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [messagingPartner, setMessagingPartner] = useState<any | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [activeFeed, setActiveFeed] = useState<"for-you" | "following">("for-you");
  const [activeSort, setActiveSort] = useState<"latest" | "popular" | "oldest">("latest");
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/messages/unread-count");
      setUnreadMessagesCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load unread messages count:", err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    const socket = connectSocket();

    const handleUpdate = () => {
      fetchUnreadCount();
    };

    socket.on("new_message", handleUpdate);
    socket.on("messages_read", handleUpdate);

    return () => {
      socket.off("new_message", handleUpdate);
      socket.off("messages_read", handleUpdate);
    };
  }, [fetchUnreadCount]);

  const handleSelectHashtag = (tag: string) => {
    setViewingProfile(null);
    setSelectedHashtag(tag);
    setCurrentView("hashtags");
  };

  const handleStartChat = (partner: any) => {
    setViewingProfile(null);
    setMessagingPartner(partner);
    setCurrentView("messages");
  };

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/posts", {
        params: {
          feed: activeFeed,
          realm: activeFeed === "following" ? "personal" : "global",
          sort: activeSort,
        },
      });
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  }, [activeFeed, activeSort]);

  useEffect(() => {
    if (!viewingProfile && currentView === "timeline") {
      fetchFeed();
    }
  }, [fetchFeed, viewingProfile, currentView]);

  return (
    <MainLayout
      currentUser={currentUsername}
      currentUserAvatar={currentUserAvatar}
      activeView={viewingProfile ? "profile" : currentView}
      onLogout={onLogout}
      onOpenProfile={(u) => setViewingProfile(u)}
      onGoHome={() => {
        setViewingProfile(null);
        setSelectedHashtag(null);
        setCurrentView("timeline");
      }}
      onOpenDirectory={() => {
        setViewingProfile(null);
        setCurrentView("directory");
      }}
      onOpenHashtags={() => {
        setViewingProfile(null);
        setSelectedHashtag(null);
        setCurrentView("hashtags");
      }}
      onOpenMessages={() => {
        setViewingProfile(null);
        setCurrentView("messages");
      }}
      unreadMessagesCount={unreadMessagesCount}
    >
      {viewingProfile ? (
        <ProfileView
          username={viewingProfile}
          currentUser={currentUsername}
          currentUserAvatar={currentUserAvatar}
          onBack={() => setViewingProfile(null)}
          onRequireLogin={() => {}}
          onOpenProfile={(u) => setViewingProfile(u)}
          onSelectHashtag={handleSelectHashtag}
          onStartChat={handleStartChat}
          onProfileUpdated={() => {
            onProfileUpdated?.();
            fetchFeed();
          }}
        />
      ) : currentView === "directory" ? (
        <UserDirectory
          currentUser={currentUsername}
          onOpenProfile={(u) => setViewingProfile(u)}
          onBackToTimeline={() => setCurrentView("timeline")}
          onRequireLogin={() => {}}
        />
      ) : currentView === "hashtags" ? (
        <HashtagsExplore
          initialTag={selectedHashtag}
          currentUser={currentUsername}
          currentUserAvatar={currentUserAvatar}
          onBackToTimeline={() => {
            setSelectedHashtag(null);
            setCurrentView("timeline");
          }}
          onOpenProfile={(u) => setViewingProfile(u)}
          onRequireLogin={() => {}}
        />
      ) : currentView === "messages" ? (
        <MessagesView
          currentUser={currentUser}
          currentUserAvatar={currentUserAvatar}
          initialPartner={messagingPartner}
          onOpenProfile={(u) => setViewingProfile(u)}
          onRequireLogin={() => {}}
          onRefreshUnreadCount={fetchUnreadCount}
        />
      ) : (


        <>
          <header className={styles.feedHeader}>
            <h2 className={styles.pageTitle}>Home Feed</h2>

            <div className={styles.realmTabs}>
              <button
                className={`${styles.realmTab} ${
                  activeFeed === "for-you" ? styles.activeRealmTab : ""
                }`}
                onClick={() => setActiveFeed("for-you")}
              >
                <Globe size={16} />
                <span>For you</span>
              </button>
              <button
                className={`${styles.realmTab} ${
                  activeFeed === "following" ? styles.activeRealmTab : ""
                }`}
                onClick={() => setActiveFeed("following")}
              >
                <Users size={16} />
                <span>Following</span>
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

          <CreatePost
            currentUser={currentUsername}
            currentUserAvatar={currentUserAvatar}
            onPostCreated={fetchFeed}
          />

          {loading ? (
            <Spinner size={32} />
          ) : posts.length === 0 ? (
            <div className={styles.statusContainer}>
              {activeFeed === "following"
                ? "No posts from accounts you follow yet. Follow other users to see their posts here!"
                : "No posts to show yet."}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUsername}
                currentUserAvatar={currentUserAvatar}
                onRequireLogin={() => {}}
                onPostUpdated={fetchFeed}
                onOpenProfile={(u) => setViewingProfile(u)}
                onSelectHashtag={handleSelectHashtag}
              />

            ))
          )}
        </>
      )}
    </MainLayout>
  );
};