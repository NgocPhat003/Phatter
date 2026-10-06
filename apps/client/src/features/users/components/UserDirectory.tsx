import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import type { DirectoryUser } from "../../posts/types/types";
import { Search, UserPlus, UserCheck, ArrowLeft, Users, Sparkles } from "lucide-react";
import { Spinner } from "../../../components/common/Spinner";
import { useOnlineUsers } from "../../../hooks/useOnlineUsers";
import styles from "./UserDirectory.module.css";


interface UserDirectoryProps {
  currentUser: string | null;
  onOpenProfile: (username: string) => void;
  onBackToTimeline: () => void;
  onRequireLogin: () => void;
}

export const UserDirectory = ({
  currentUser,
  onOpenProfile,
  onBackToTimeline,
  onRequireLogin,
}: UserDirectoryProps) => {
  const onlineUserIds = useOnlineUsers();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"suggestions" | "following" | "all">("suggestions");
  const [followActionLoading, setFollowActionLoading] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/users", {
        params: {
          search: searchTerm.trim() || undefined,
          filter: activeTab === "all" ? undefined : activeTab,
        },
      });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to fetch user directory:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeTab]);


  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleToggleFollow = async (
    e: React.MouseEvent,
    targetUsername: string,
    currentlyFollowing: boolean
  ) => {
    e.stopPropagation();

    if (!currentUser) {
      onRequireLogin();
      return;
    }

    // Optimistic Update
    setUsers((prev) =>
      prev.map((u) => {
        if (u.username === targetUsername) {
          const delta = currentlyFollowing ? -1 : 1;
          return {
            ...u,
            isFollowing: !currentlyFollowing,
            followersCount: Math.max(0, u.followersCount + delta),
          };
        }
        return u;
      })
    );

    setFollowActionLoading((prev) => ({ ...prev, [targetUsername]: true }));

    try {
      if (currentlyFollowing) {
        await api.delete(`/users/${targetUsername}/follow`);
      } else {
        await api.post(`/users/${targetUsername}/follow`);
      }
    } catch (err) {
      console.error("Follow action failed:", err);
      // Rollback optimistic update
      setUsers((prev) =>
        prev.map((u) => {
          if (u.username === targetUsername) {
            const delta = currentlyFollowing ? 1 : -1;
            return {
              ...u,
              isFollowing: currentlyFollowing,
              followersCount: Math.max(0, u.followersCount + delta),
            };
          }
          return u;
        })
      );
    } finally {
      setFollowActionLoading((prev) => ({ ...prev, [targetUsername]: false }));
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBackToTimeline}
            title="Back to Timeline"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className={styles.title}>Directory</h2>
            <p className={styles.subtitle}>Discover people to follow on Phatter</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by username or bio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Directory Tabs */}
        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "suggestions" ? styles.activeTabBtn : ""
            }`}
            onClick={() => setActiveTab("suggestions")}
          >
            <Sparkles size={16} />
            <span>Who to Follow</span>
          </button>
          {currentUser && (
            <button
              type="button"
              className={`${styles.tabBtn} ${
                activeTab === "following" ? styles.activeTabBtn : ""
              }`}
              onClick={() => setActiveTab("following")}
            >
              <UserCheck size={16} />
              <span>Following</span>
            </button>
          )}
          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "all" ? styles.activeTabBtn : ""
            }`}
            onClick={() => setActiveTab("all")}
          >
            <Users size={16} />
            <span>All Members</span>
          </button>
        </div>
      </header>

      {/* User Cards Grid / List */}
      <div className={styles.usersList}>
        {loading ? (
          <Spinner size={32} />
        ) : users.length === 0 ? (
          <div className={styles.emptyBox}>
            <p className={styles.emptyTitle}>
              {searchTerm
                ? `No accounts found matching "${searchTerm}"`
                : activeTab === "suggestions"
                ? "You're following everyone on this list!"
                : activeTab === "following"
                ? "You are not following anyone yet."
                : "No users registered yet."}
            </p>
            {activeTab === "suggestions" && (
              <button
                type="button"
                className={styles.viewAllBtn}
                onClick={() => setActiveTab("all")}
              >
                Browse All Members
              </button>
            )}
            {activeTab === "following" && (
              <button
                type="button"
                className={styles.viewAllBtn}
                onClick={() => setActiveTab("suggestions")}
              >
                Discover People to Follow
              </button>
            )}
          </div>
        ) : (
          users.map((u) => {
            const isSelf = Boolean(
              currentUser && u.username.toLowerCase() === currentUser.toLowerCase()
            );
            const isActionBusy = Boolean(followActionLoading[u.username]);

            const isOnline = onlineUserIds.has(String(u.id));

            return (
              <div
                key={u.id}
                className={styles.userCard}
                onClick={() => onOpenProfile(u.username)}
              >
                {/* Left: Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div className={styles.avatarWrapper}>
                    {u.profilePictureUrl ? (
                      <img
                        src={u.profilePictureUrl}
                        alt={u.username}
                        className={styles.avatarImg}
                      />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {u.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {isOnline && <span className={styles.onlineBadge} />}
                </div>

                {/* Center: Info */}
                <div className={styles.userInfo}>
                  <div className={styles.nameRow}>
                    <span className={styles.username}>@{u.username}</span>
                    {u.isGuestSandbox && (
                      <span className={styles.guestBadge}>GUEST</span>
                    )}
                    {isSelf && <span className={styles.selfBadge}>YOU</span>}
                    {isOnline && <span className={styles.onlineBadgeSmall}>Online</span>}
                  </div>

                  {u.bio ? (
                    <p className={styles.bio}>{u.bio}</p>
                  ) : (
                    <p className={styles.noBio}>No bio provided yet.</p>
                  )}

                  <div className={styles.metaRow}>
                    <span>
                      <strong>{u.followersCount}</strong>{" "}
                      {u.followersCount === 1 ? "Follower" : "Followers"}
                    </span>
                    <span>·</span>
                    <span>
                      <strong>{u.followingCount}</strong> Following
                    </span>
                    <span>·</span>
                    <span>
                      <strong>{u.postsCount}</strong>{" "}
                      {u.postsCount === 1 ? "Post" : "Posts"}
                    </span>
                  </div>
                </div>

                {/* Right: Follow Action */}
                <div className={styles.actionCol}>
                  {!isSelf && (
                    <button
                      type="button"
                      className={`${styles.followBtn} ${
                        u.isFollowing ? styles.followingBtn : ""
                      }`}
                      onClick={(e) => handleToggleFollow(e, u.username, u.isFollowing)}
                      disabled={isActionBusy}
                    >
                      {u.isFollowing ? (
                        <>
                          <UserCheck size={15} />
                          <span className={styles.followBtnText}>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

