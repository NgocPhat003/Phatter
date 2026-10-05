import type { ReactNode } from "react";
import {
  Feather,
  Compass,
  Hash,
  MessageSquare,
  Users,
  Settings,
  Moon,
  LogOut,
} from "lucide-react";
import styles from "./MainLayout.module.css";

interface MainLayoutProps {
  children: ReactNode;
  currentUser: string | null;
  onLogout: () => void;
  onOpenProfile?: (username: string) => void;
  onGoHome?: () => void;
}

export const MainLayout = ({
  children,
  currentUser,
  onLogout,
  onOpenProfile,
  onGoHome,
}: MainLayoutProps) => {
  return (
    <div className={styles.layoutContainer}>
      <aside className={styles.sidebar}>
        <div>
          <div
            className={styles.brand}
            title="Phatter"
            onClick={onGoHome}
            style={{ cursor: "pointer" }}
          >
            <Feather size={24} />
            <span className={styles.brandText}>Phatter</span>
          </div>

          <nav className={styles.navLinks}>
            <button
              className={`${styles.navItem} ${styles.activeNavItem}`}
              title="Timeline"
              onClick={onGoHome}
            >
              <Compass size={20} />
              <span className={styles.navLabel}>Timeline</span>
            </button>
            <button className={styles.navItem} title="Hashtags">
              <Hash size={20} />
              <span className={styles.navLabel}>Hashtags</span>
            </button>
            <button className={styles.navItem} title="Messages">
              <MessageSquare size={20} />
              <span className={styles.navLabel}>Messages</span>
            </button>
            <button className={styles.navItem} title="Directory">
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
              onClick={() => onOpenProfile?.(currentUser)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.userInitialAvatar}>
                {currentUser.slice(0, 1).toUpperCase()}
              </div>
              <span className={styles.usernameDisplay}>{currentUser}</span>
            </div>
          )}
        </div>
      </aside>

      <main className={styles.mainFeedArea}>{children}</main>
    </div>
  );
};