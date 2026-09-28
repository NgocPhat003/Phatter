import { ReactNode } from "react";
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
}

export const MainLayout = ({ children, currentUser, onLogout }: MainLayoutProps) => {
  return (
    <div className={styles.layoutContainer}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.brand}>
            <Feather size={24} />
            <span>Phatter</span>
          </div>

          <nav className={styles.navLinks}>
            <button className={`${styles.navItem} ${styles.activeNavItem}`}>
              <Compass size={18} />
              <span>Timeline</span>
            </button>
            <button className={styles.navItem}>
              <Hash size={18} />
              <span>Hashtags</span>
            </button>
            <button className={styles.navItem}>
              <MessageSquare size={18} />
              <span>Messages</span>
            </button>
            <button className={styles.navItem}>
              <Users size={18} />
              <span>Directory</span>
            </button>
            <button className={styles.navItem}>
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <button className={styles.utilityBtn}>
            <Moon size={16} />
            <span>Dark Mode</span>
          </button>

          <button className={styles.utilityBtn} onClick={onLogout}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>

          {currentUser && (
            <div className={styles.userCard}>
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