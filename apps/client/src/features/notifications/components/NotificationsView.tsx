import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Heart,
  MessageCircle,
  MessageSquare,
  UserPlus,
  CheckCheck,
} from "lucide-react";
import { api } from "../../../lib/api";
import { Spinner } from "../../../components/common/Spinner";
import type { AppNotification } from "../../posts/types/types";
import styles from "./NotificationsView.module.css";

interface NotificationsViewProps {
  currentUser: string | null;
  onOpenProfile?: (username: string) => void;
  onRefreshUnreadCount?: () => void;
}

export const NotificationsView = ({
  currentUser: _currentUser,
  onOpenProfile,
  onRefreshUnreadCount,
}: NotificationsViewProps) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "likes" | "comments" | "follows">("all");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/mark-read", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onRefreshUnreadCount?.();
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    // If unread, mark read locally and on server
    if (!notif.isRead) {
      try {
        await api.post("/notifications/mark-read", { notificationIds: [notif.id] });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        onRefreshUnreadCount?.();
      } catch (err) {
        console.error("Failed to mark single notification as read:", err);
      }
    }

    // Navigate to profile if actor clicked or follow notif
    if (notif.actor?.username) {
      onOpenProfile?.(notif.actor.username);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(isoString).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "likes") return n.type === "like";
    if (activeFilter === "comments") return n.type === "comment" || n.type === "reply";
    if (activeFilter === "follows") return n.type === "follow";
    return true;
  });

  const renderTypeIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "like":
        return (
          <span className={`${styles.typeIcon} ${styles.likeIcon}`} title="Like">
            <Heart size={11} fill="currentColor" />
          </span>
        );
      case "comment":
        return (
          <span className={`${styles.typeIcon} ${styles.commentIcon}`} title="Comment">
            <MessageCircle size={11} fill="currentColor" />
          </span>
        );
      case "reply":
        return (
          <span className={`${styles.typeIcon} ${styles.replyIcon}`} title="Reply">
            <MessageSquare size={11} fill="currentColor" />
          </span>
        );
      case "follow":
        return (
          <span className={`${styles.typeIcon} ${styles.followIcon}`} title="Follow">
            <UserPlus size={11} />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>
            <Bell size={22} />
            Notifications
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount}</span>
            )}
          </h2>

          {unreadCount > 0 && (
            <button
              type="button"
              className={styles.markAllBtn}
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <CheckCheck size={16} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.filterTab} ${activeFilter === "all" ? styles.activeFilterTab : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${activeFilter === "likes" ? styles.activeFilterTab : ""}`}
            onClick={() => setActiveFilter("likes")}
          >
            Likes
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${activeFilter === "comments" ? styles.activeFilterTab : ""}`}
            onClick={() => setActiveFilter("comments")}
          >
            Comments & Replies
          </button>
          <button
            type="button"
            className={`${styles.filterTab} ${activeFilter === "follows" ? styles.activeFilterTab : ""}`}
            onClick={() => setActiveFilter("follows")}
          >
            Follows
          </button>
        </div>
      </header>

      {/* Content */}
      {loading ? (
        <div className={styles.spinnerContainer}>
          <Spinner size={32} />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrapper}>
            <Bell size={32} />
          </div>
          <h3 className={styles.emptyTitle}>No notifications yet</h3>
          <p className={styles.emptyDesc}>
            When someone likes your posts, replies to your comments, or follows you, you'll see it here in real time.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredNotifications.map((notif) => {
            const actorName = notif.actor?.username || "Someone";

            return (
              <div
                key={notif.id}
                className={`${styles.item} ${!notif.isRead ? styles.unreadItem : ""}`}
                onClick={() => handleNotificationClick(notif)}
              >
                {/* Avatar with type badge */}
                <div className={styles.avatarWrapper}>
                  {notif.actor?.profilePictureUrl ? (
                    <img
                      src={notif.actor.profilePictureUrl}
                      alt={actorName}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {actorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {renderTypeIcon(notif.type)}
                </div>

                {/* Content */}
                <div className={styles.contentCol}>
                  <div className={styles.topRow}>
                    <p className={styles.actionText}>
                      <span className={styles.usernameLink}>@{actorName}</span>{" "}
                      {notif.type === "like" && "liked your post"}
                      {notif.type === "comment" && "commented on your post"}
                      {notif.type === "reply" && "replied to your comment"}
                      {notif.type === "follow" && "started following you"}
                    </p>
                    <span className={styles.timestamp}>
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Comment or reply excerpt */}
                  {notif.content && (notif.type === "comment" || notif.type === "reply") && (
                    <p className={styles.commentSnippet}>"{notif.content}"</p>
                  )}

                  {/* Post preview snippet for likes */}
                  {notif.postSnippet && notif.type === "like" && (
                    <p className={styles.postSnippet}>"{notif.postSnippet}"</p>
                  )}
                </div>

                {/* Unread dot */}
                {!notif.isRead && <span className={styles.unreadDot} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

