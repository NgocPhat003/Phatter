import { useEffect, useState, useCallback } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
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

// ─── Route Helper Components ──────────────────────────────────────────────────

const ProfileRoute = ({
  currentUsername,
  currentUserAvatar,
  onProfileUpdated,
}: {
  currentUsername: string | null;
  currentUserAvatar?: string | null;
  onProfileUpdated?: () => void;
}) => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  if (!username) return <Navigate to="/" replace />;

  return (
    <ProfileView
      username={username}
      currentUser={currentUsername}
      currentUserAvatar={currentUserAvatar}
      onBack={() => navigate(-1)}
      onRequireLogin={() => {}}
      onOpenProfile={(u) => navigate(`/profile/${u}`)}
      onSelectHashtag={(t) => navigate(`/hashtags/${encodeURIComponent(t.replace(/^#/, ""))}`)}
      onStartChat={(partner) => navigate(`/messages/${encodeURIComponent(partner.username)}`)}
      onProfileUpdated={onProfileUpdated}
    />
  );
};

const HashtagsRoute = ({
  currentUser,
  currentUserAvatar,
}: {
  currentUser: string | null;
  currentUserAvatar?: string | null;
}) => {
  const { tag } = useParams<{ tag: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedTag = tag ? `#${tag}` : searchParams.get("tag");

  return (
    <HashtagsExplore
      initialTag={selectedTag}
      currentUser={currentUser}
      currentUserAvatar={currentUserAvatar}
      onBackToTimeline={() => navigate("/")}
      onOpenProfile={(u) => navigate(`/profile/${u}`)}
      onRequireLogin={() => {}}
    />
  );
};

const MessagesRoute = ({
  currentUser,
  currentUserAvatar,
  onRefreshUnreadCount,
}: {
  currentUser: any;
  currentUserAvatar?: string | null;
  onRefreshUnreadCount?: () => void;
}) => {
  const { partnerUsername } = useParams<{ partnerUsername: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const targetUser = partnerUsername || searchParams.get("user");
  const initialPartner = targetUser ? ({ username: targetUser } as any) : null;

  return (
    <MessagesView
      currentUser={currentUser}
      currentUserAvatar={currentUserAvatar}
      initialPartner={initialPartner}
      onOpenProfile={(u) => navigate(`/profile/${u}`)}
      onRequireLogin={() => {}}
      onRefreshUnreadCount={onRefreshUnreadCount}
    />
  );
};

// ─── Main Home Component ──────────────────────────────────────────────────────

export const Home = ({ currentUser, onLogout, onProfileUpdated }: HomeProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUsername =
    typeof currentUser === "string" ? currentUser : currentUser?.username || null;
  const currentUserAvatar =
    typeof currentUser === "object" ? currentUser?.profilePictureUrl : null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [activeFeed, setActiveFeed] = useState<"for-you" | "following">("for-you");
  const [activeSort, setActiveSort] = useState<"latest" | "popular" | "oldest">("latest");

  const isTimeline = location.pathname === "/" || location.pathname === "/home";

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
    if (isTimeline) {
      fetchFeed();
    }
  }, [fetchFeed, isTimeline]);

  return (
    <MainLayout
      currentUser={currentUsername}
      currentUserAvatar={currentUserAvatar}
      onLogout={onLogout}
      unreadMessagesCount={unreadMessagesCount}
      unreadNotificationsCount={unreadNotificationsCount}
    >
      <Routes>
        {/* Home Feed */}
        <Route
          path="/"
          element={
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
                    onPostDeleted={(id) =>
                      setPosts((prev) => prev.filter((p) => p.id !== id))
                    }
                    onOpenProfile={(u) => navigate(`/profile/${u}`)}
                    onSelectHashtag={(tag) =>
                      navigate(
                        `/hashtags/${encodeURIComponent(tag.replace(/^#/, ""))}`
                      )
                    }
                  />
                ))
              )}
            </>
          }
        />

        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={
            <NotificationsView
              currentUser={currentUsername}
              onOpenProfile={(u) => navigate(`/profile/${u}`)}
              onRefreshUnreadCount={fetchUnreadNotificationsCount}
            />
          }
        />

        {/* Hashtags Explore */}
        <Route
          path="/hashtags"
          element={
            <HashtagsRoute
              currentUser={currentUsername}
              currentUserAvatar={currentUserAvatar}
            />
          }
        />
        <Route
          path="/hashtags/:tag"
          element={
            <HashtagsRoute
              currentUser={currentUsername}
              currentUserAvatar={currentUserAvatar}
            />
          }
        />

        {/* Messages */}
        <Route
          path="/messages"
          element={
            <MessagesRoute
              currentUser={currentUser}
              currentUserAvatar={currentUserAvatar}
              onRefreshUnreadCount={fetchUnreadCount}
            />
          }
        />
        <Route
          path="/messages/:partnerUsername"
          element={
            <MessagesRoute
              currentUser={currentUser}
              currentUserAvatar={currentUserAvatar}
              onRefreshUnreadCount={fetchUnreadCount}
            />
          }
        />

        {/* Bookmarks */}
        <Route
          path="/bookmarks"
          element={
            <BookmarksView
              currentUser={currentUsername}
              currentUserAvatar={currentUserAvatar}
              onOpenProfile={(u) => navigate(`/profile/${u}`)}
              onSelectHashtag={(tag) =>
                navigate(
                  `/hashtags/${encodeURIComponent(tag.replace(/^#/, ""))}`
                )
              }
              onBackToTimeline={() => navigate("/")}
              onRequireLogin={() => {}}
            />
          }
        />

        {/* User Directory */}
        <Route
          path="/directory"
          element={
            <UserDirectory
              currentUser={currentUsername}
              onOpenProfile={(u) => navigate(`/profile/${u}`)}
              onBackToTimeline={() => navigate("/")}
              onRequireLogin={() => {}}
            />
          }
        />

        {/* User Profiles */}
        <Route
          path="/profile/:username"
          element={
            <ProfileRoute
              currentUsername={currentUsername}
              currentUserAvatar={currentUserAvatar}
              onProfileUpdated={() => {
                onProfileUpdated?.();
                fetchFeed();
              }}
            />
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
};