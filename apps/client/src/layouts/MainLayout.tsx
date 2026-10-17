import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Feather,
  Compass,
  Bell,
  Hash,
  MessageSquare,
  Users,
  Bookmark,
  Settings,
  Moon,
  LogOut,
} from "lucide-react";
import styles from "./MainLayout.module.css";
import { useAuthStore } from "../store/useAuthStore";
import { useNotificationStore } from "../store/useNotificationStore";

interface MainLayoutProps {
  children: ReactNode;
  currentUser?: string | null;
  currentUserAvatar?: string | null;
  activeView?: "timeline" | "directory" | "profile" | "hashtags" | "messages" | "bookmarks" | "notifications";
  onLogout?: () => void;
  onOpenProfile?: (username: string) => void;
  onGoHome?: () => void;
  onOpenDirectory?: () => void;
  onOpenHashtags?: () => void;
  onOpenMessages?: () => void;
  onOpenBookmarks?: () => void;
  onOpenNotifications?: () => void;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
}

export const MainLayout = ({
  children,
  currentUser,
  currentUserAvatar,
  activeView,
  unreadMessagesCount,
  unreadNotificationsCount,
  onLogout,
  onOpenProfile,
  onGoHome,
  onOpenDirectory,
  onOpenHashtags,
  onOpenMessages,
  onOpenBookmarks,
  onOpenNotifications,
}: MainLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const storeUser = useAuthStore((s) => s.currentUser);
  const storeLogout = useAuthStore((s) => s.logout);
  const storeUnreadMessages = useNotificationStore((s) => s.unreadMessagesCount);
  const storeUnreadNotifs = useNotificationStore((s) => s.unreadNotificationsCount);

  const effectiveUsername =
    currentUser !== undefined ? currentUser : storeUser?.username || null;
  const effectiveAvatar =
    currentUserAvatar !== undefined ? currentUserAvatar : storeUser?.profilePictureUrl;
  const handleLogout = onLogout || storeLogout;
  const effectiveUnreadMessages = unreadMessagesCount ?? storeUnreadMessages;
  const effectiveUnreadNotifs = unreadNotificationsCount ?? storeUnreadNotifs;

  const currentActiveView =
    activeView !== undefined
      ? activeView
      : pathname === "/" || pathname === "/home"
      ? "timeline"
      : pathname.startsWith("/notifications")
      ? "notifications"
      : pathname.startsWith("/hashtags")
      ? "hashtags"
      : pathname.startsWith("/messages")
      ? "messages"
      : pathname.startsWith("/bookmarks")
      ? "bookmarks"
      : pathname.startsWith("/directory")
      ? "directory"
      : pathname.startsWith("/profile")
      ? "profile"
      : "timeline";

  return (
    <div className={styles.layoutContainer}>
      <aside className={styles.sidebar}>
        <div>
          <div
            className={styles.brand}
            title="Phatter"
            onClick={() => (onGoHome ? onGoHome() : navigate("/"))}
            style={{ cursor: "pointer" }}
          >
            <Feather size={24} />
            <span className={styles.brandText}>Phatter</span>
          </div>

          <nav className={styles.navLinks}>
            <button
              className={`${styles.navItem} ${
                currentActiveView === "timeline" ? styles.activeNavItem : ""
              }`}
              title="Timeline"
              onClick={() => (onGoHome ? onGoHome() : navigate("/"))}
            >
              <Compass size={20} />
              <span className={styles.navLabel}>Timeline</span>
            </button>
            <button
              className={`${styles.navItem} ${
                currentActiveView === "notifications" ? styles.activeNavItem : ""
              }`}
              title="Notifications"
              onClick={() => (onOpenNotifications ? onOpenNotifications() : navigate("/notifications"))}
            >
              <div className={styles.navIconWrapper}>
                <Bell size={20} />
                {effectiveUnreadNotifs > 0 && (
                  <span className={styles.unreadBadge}>
                    {effectiveUnreadNotifs > 99 ? "99+" : effectiveUnreadNotifs}
                  </span>
                )}
              </div>
              <span className={styles.navLabel}>Notifications</span>
            </button>
            <button
              className={`${styles.navItem} ${
                currentActiveView === "hashtags" ? styles.activeNavItem : ""
              }`}
              title="Hashtags"
              onClick={() => (onOpenHashtags ? onOpenHashtags() : navigate("/hashtags"))}
            >
              <Hash size={20} />
              <span className={styles.navLabel}>Hashtags</span>
            </button>

            <button
              className={`${styles.navItem} ${
                currentActiveView === "messages" ? styles.activeNavItem : ""
              }`}
              title="Messages"
              onClick={() => (onOpenMessages ? onOpenMessages() : navigate("/messages"))}
            >
              <div className={styles.navIconWrapper}>
                <MessageSquare size={20} />
                {effectiveUnreadMessages > 0 && (
                  <span className={styles.unreadBadge}>
                    {effectiveUnreadMessages > 99 ? "99+" : effectiveUnreadMessages}
                  </span>
                )}
              </div>
              <span className={styles.navLabel}>Messages</span>
            </button>
            <button
              className={`${styles.navItem} ${
                currentActiveView === "bookmarks" ? styles.activeNavItem : ""
              }`}
              title="Bookmarks"
              onClick={() => (onOpenBookmarks ? onOpenBookmarks() : navigate("/bookmarks"))}
            >
              <Bookmark size={20} />
              <span className={styles.navLabel}>Bookmarks</span>
            </button>
            <button
              className={`${styles.navItem} ${
                currentActiveView === "directory" ? styles.activeNavItem : ""
              }`}
              title="Directory"
              onClick={() => (onOpenDirectory ? onOpenDirectory() : navigate("/directory"))}
            >
              <Users size={20} />
              <span className={styles.navLabel}>Directory</span>
            </button>
            <button className={styles.navItem} title="Settings">
              <Settings size={20} />
              <span className={styles.navLabel}>Settings</span>
            </button>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <button className={styles.utilityBtn} title="Dark Mode">
            <Moon size={18} />
            <span className={styles.utilityLabel}>Dark Mode</span>
          </button>

          <button
            className={styles.utilityBtn}
            onClick={handleLogout}
            title="Log Out"
          >
            <LogOut size={18} />
            <span className={styles.utilityLabel}>Log Out</span>
          </button>

          {effectiveUsername && (
            <div
              className={styles.userCard}
              title={`View @${effectiveUsername}'s profile`}
              onClick={() => (onOpenProfile ? onOpenProfile(effectiveUsername) : navigate(`/profile/${effectiveUsername}`))}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.userInitialAvatar}>
                {effectiveAvatar ? (
                  <img
                    src={effectiveAvatar}
                    alt={effectiveUsername}
                    className={styles.avatarImg}
                  />
                ) : (
                  effectiveUsername.slice(0, 1).toUpperCase()
                )}
              </div>
              <span className={styles.usernameDisplay}>{effectiveUsername}</span>
            </div>
          )}
        </div>
      </aside>

      <div className={styles.contentWrapper}>
        <main
          className={`${styles.mainFeedArea} ${
            currentActiveView === "messages" ? styles.messagesArea : ""
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};