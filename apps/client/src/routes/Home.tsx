import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import type { Post, CurrentUser } from "../features/posts/types/types";
import { PostCard } from "../features/posts/components/PostCard";
import { CreatePost } from "../features/posts/components/CreatePost";
import { ProfileView } from "../features/users/components/ProfileView";
import { UserDirectory } from "../features/users/components/UserDirectory";
import { HashtagsExplore } from "../features/hashtags/components/HashtagsExplore";
import { MessagesView } from "../features/messages/components/MessagesView";
import { BookmarksView } from "../features/bookmarks/components/BookmarksView";
import { NotificationsView } from "../features/notifications/components/NotificationsView";
import { MainLayout } from "../layouts/MainLayout";
import { Spinner } from "../components/common/Spinner";
import { connectSocket } from "../lib/socket";
import { initOnlineUsersTracker } from "../hooks/useOnlineUsers";
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
  const [currentView, setCurrentView] = useState<"timeline" | "directory" | "hashtags" | "messages" | "bookmarks" | "notifications">("timeline");
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [messagingPartner, setMessagingPartner] = useState<any | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
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

  const fetchUnreadNotificationsCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadNotificationsCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load unread notifications count:", err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchUnreadNotificationsCount();
  }, [fetchUnreadCount, fetchUnreadNotificationsCount]);

  useEffect(() => {
    initOnlineUsersTracker();
    const socket = connectSocket();

    const handleUpdate = () => {
      fetchUnreadCount();
    };

    const handleNotificationUpdate = () => {
      fetchUnreadNotificationsCount();
    };

    socket.on("new_message", handleUpdate);
    socket.on("messages_read", handleUpdate);
    socket.on("new_notification", handleNotificationUpdate);

    return () => {
      socket.off("new_message", handleUpdate);
      socket.off("messages_read", handleUpdate);
      socket.off("new_notification", handleNotificationUpdate);
    };
  }, [fetchUnreadCount, fetchUnreadNotificationsCount]);

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
      onOpenBookmarks={() => {
        setViewingProfile(null);
        setCurrentView("bookmarks");
      }}
      onOpenNotifications={() => {
        setViewingProfile(null);
        setCurrentView("notifications");
      }}
      unreadMessagesCount={unreadMessagesCount}
      unreadNotificationsCount={unreadNotificationsCount}
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
      ) : currentView === "notifications" ? (
        <NotificationsView
          currentUser={currentUsername}
          onOpenProfile={(u) => setViewingProfile(u)}
          onRefreshUnreadCount={fetchUnreadNotificationsCount}
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
      ) : currentView === "bookmarks" ? (
        <BookmarksView
          currentUser={currentUsername}
          currentUserAvatar={currentUserAvatar}
          onOpenProfile={(u) => setViewingProfile(u)}
          onSelectHashtag={handleSelectHashtag}
          onBackToTimeline={() => setCurrentView("timeline")}
          onRequireLogin={() => {}}
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