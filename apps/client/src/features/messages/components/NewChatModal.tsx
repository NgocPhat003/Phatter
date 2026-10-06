import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { api } from "../../../lib/api";
import { useOnlineUsers } from "../../../hooks/useOnlineUsers";
import type { Conversation } from "../../posts/types/types";
import styles from "./NewChatModal.module.css";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: Conversation["partner"]) => void;
  currentUsername: string | null;
}

export const NewChatModal = ({
  isOpen,
  onClose,
  onSelectUser,
  currentUsername,
}: NewChatModalProps) => {
  const onlineUserIds = useOnlineUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<Conversation["partner"][]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get("/users", {
          params: { search: searchTerm.trim() || undefined },
        });

        const rawList = res.data?.users || [];
        const filtered = rawList
          .filter(
            (u: any) =>
              !currentUsername ||
              u.username?.toLowerCase() !== currentUsername?.toLowerCase()
          )
          .map((u: any) => ({
            id: u.id,
            username: u.username,
            profilePictureUrl: u.profilePictureUrl || null,
            isGuestSandbox: Boolean(u.isGuestSandbox),
          }));

        setUsers(filtered);
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen, searchTerm, currentUsername]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>New Message</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search people by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.userList}>
          {loading ? (
            <div className={styles.spinner} />
          ) : users.length === 0 ? (
            <div className={styles.emptyState}>
              {searchTerm ? "No users found matching your query." : "No users available."}
            </div>
          ) : (
            users.map((user) => {
              const isOnline = onlineUserIds.has(String(user.id));
              return (
                <button
                  type="button"
                  key={user.id}
                  className={styles.userItem}
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                >
                  <div className={styles.userInfo}>
                    <div className={styles.avatarContainer}>
                      {user.profilePictureUrl ? (
                        <img
                          src={user.profilePictureUrl}
                          alt={user.username}
                          className={styles.avatar}
                        />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isOnline && <span className={styles.onlineBadge} />}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.username}>
                        {user.username}
                        {user.isGuestSandbox && (
                          <span className={styles.guestBadge}>Guest</span>
                        )}
                        {isOnline && (
                          <span className={styles.onlineStatusText}>• Online</span>
                        )}
                      </div>
                      <div className={styles.handle}>@{user.username}</div>
                    </div>
                  </div>

                  <span className={styles.selectBtn}>Chat</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

