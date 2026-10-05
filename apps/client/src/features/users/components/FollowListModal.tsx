import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../../lib/api";
import type { DirectoryUser } from "../../posts/types/types";
import { X, Search, UserPlus, UserCheck } from "lucide-react";
import { Spinner } from "../../../components/common/Spinner";
import styles from "./FollowListModal.module.css";


interface FollowListModalProps {
  username: string;
  initialTab?: "following" | "followers";
  currentUser: string | null;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
  onRequireLogin: () => void;
  onFollowCountChanged?: () => void;
}

export const FollowListModal = ({
  username,
  initialTab = "following",
  currentUser,
  onClose,
  onOpenProfile,
  onRequireLogin,
  onFollowCountChanged,
}: FollowListModalProps) => {
  const [activeTab, setActiveTab] = useState<"following" | "followers">(initialTab);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async (tab: "following" | "followers") => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${username}/${tab}`);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(`Failed to load ${tab}:`, err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchUsers(activeTab);
  }, [fetchUsers, activeTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

    // Optimistic update
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

    setActionBusy((prev) => ({ ...prev, [targetUsername]: true }));

    try {
      if (currentlyFollowing) {
        await api.delete(`/users/${targetUsername}/follow`);
      } else {
        await api.post(`/users/${targetUsername}/follow`);
      }
      onFollowCountChanged?.();
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
      // Revert optimistic update
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
      setActionBusy((prev) => ({ ...prev, [targetUsername]: false }));
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.bio && u.bio.toLowerCase().includes(q))
    );
  }, [users, searchTerm]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <h3 className={styles.title}>@{username}</h3>
            <p className={styles.subtitle}>
              {activeTab === "following" ? "People followed" : "Followers"}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Tabs */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "following" ? styles.activeTabBtn : ""
            }`}
            onClick={() => setActiveTab("following")}
          >
            <span>Following</span>
            {activeTab === "following" && !loading && (
              <span className={styles.badgeCount}>{users.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "followers" ? styles.activeTabBtn : ""
            }`}
            onClick={() => setActiveTab("followers")}
          >
            <span>Followers</span>
            {activeTab === "followers" && !loading && (
              <span className={styles.badgeCount}>{users.length}</span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* User list */}
        <div className={styles.listContainer}>
          {loading ? (
            <Spinner size={26} />
          ) : filteredUsers.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>
                {searchTerm
                  ? `No users matching "${searchTerm}"`
                  : activeTab === "following"
                  ? "Not following anyone yet."
                  : "No followers yet."}
              </p>
              {!searchTerm && (
                <p className={styles.emptySubtitle}>
                  {activeTab === "following"
                    ? "When accounts are followed, they'll appear here."
                    : "When people follow this profile, they'll appear here."}
                </p>
              )}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelf = Boolean(
                currentUser &&
                  u.username.toLowerCase() === currentUser.toLowerCase()
              );
              const isBusy = Boolean(actionBusy[u.username]);

              return (
                <div
                  key={u.id}
                  className={styles.userItem}
                  onClick={() => {
                    onOpenProfile(u.username);
                    onClose();
                  }}
                >
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

                  <div className={styles.infoCol}>
                    <div className={styles.nameRow}>
                      <span className={styles.username}>@{u.username}</span>
                      {u.isGuestSandbox && (
                        <span className={styles.guestBadge}>GUEST</span>
                      )}
                      {isSelf && <span className={styles.selfBadge}>YOU</span>}
                    </div>

                    {u.bio ? (
                      <p className={styles.bio}>{u.bio}</p>
                    ) : (
                      <p className={styles.noBio}>No bio provided.</p>
                    )}

                    <div className={styles.statsRow}>
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

                  {!isSelf && (
                    <div className={styles.actionCol}>
                      <button
                        type="button"
                        className={`${styles.followBtn} ${
                          u.isFollowing ? styles.followingBtn : ""
                        }`}
                        onClick={(e) =>
                          handleToggleFollow(e, u.username, u.isFollowing)
                        }
                        disabled={isBusy}
                      >
                        {u.isFollowing ? (
                          <>
                            <UserCheck size={14} />
                            <span className={styles.followBtnText}>
                              Following
                            </span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

