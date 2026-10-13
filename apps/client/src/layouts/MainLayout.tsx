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

interface MainLayoutProps {
  children: ReactNode;
  currentUser: string | null;
  currentUserAvatar?: string | null;
  activeView?: "timeline" | "directory" | "profile" | "hashtags" | "messages" | "bookmarks" | "notifications";
  onLogout: () => void;
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
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0,
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
                {unreadNotificationsCount > 0 && (
                  <span className={styles.unreadBadge}>
                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
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
                {unreadMessagesCount > 0 && (
                  <span className={styles.unreadBadge}>
                    {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
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
            onClick={onLogout}
            title="Log Out"
          >
            <LogOut size={18} />
            <span className={styles.utilityLabel}>Log Out</span>
          </button>

          {currentUser && (
            <div
              className={styles.userCard}
              title={`View @${currentUser}'s profile`}
              onClick={() => (onOpenProfile ? onOpenProfile(currentUser) : navigate(`/profile/${currentUser}`))}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.userInitialAvatar}>
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt={currentUser}
                    className={styles.avatarImg}
                  />
                ) : (
                  currentUser.slice(0, 1).toUpperCase()
                )}
              </div>
              <span className={styles.usernameDisplay}>{currentUser}</span>
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