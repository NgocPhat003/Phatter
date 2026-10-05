import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  SquarePen,
  Search,
  MessageSquare,
  Check,
  CheckCheck,
  User,
} from "lucide-react";
import { api } from "../../../lib/api";
import { connectSocket, getSocket } from "../../../lib/socket";
import type {
  Conversation,
  DirectMessage,
  CurrentUser,
} from "../../posts/types/types";
import { NewChatModal } from "./NewChatModal";
import styles from "./MessagesView.module.css";

interface MessagesViewProps {
  currentUser: CurrentUser | string | null;
  currentUserAvatar?: string | null;
  initialPartner?: Conversation["partner"] | null;
  onOpenProfile?: (username: string) => void;
  onRequireLogin?: () => void;
  onRefreshUnreadCount?: () => void;
}

export const MessagesView = ({
  currentUser,
  initialPartner,
  onOpenProfile,
  onRefreshUnreadCount,
}: MessagesViewProps) => {
  const currentUsername =
    typeof currentUser === "string"
      ? currentUser
      : currentUser?.username || null;

  const [currentUserId, setCurrentUserId] = useState<string | null>(
    typeof currentUser === "object" && currentUser?.id ? currentUser.id : null
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartner, setActivePartner] = useState<Conversation["partner"] | null>(
    initialPartner || null
  );
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePartnerRef = useRef<Conversation["partner"] | null>(activePartner);

  // Keep ref up to date for socket listener closures
  useEffect(() => {
    activePartnerRef.current = activePartner;
  }, [activePartner]);

  // Scroll messages to bottom smoothly
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Fetch current user details if id is not yet present
  useEffect(() => {
    if (!currentUserId) {
      api
        .get("/auth/me")
        .then((res) => {
          if (res.data?.user?.id) {
            setCurrentUserId(res.data.user.id);
          }
        })
        .catch((err) => console.error("Could not fetch current user session:", err));
    }
  }, [currentUserId]);

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConvs(true);
      const res = await api.get("/messages/conversations");
      setConversations(res.data?.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 2. Fetch conversation messages for active partner
  const fetchMessages = useCallback(async (partnerId: string) => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/messages/${partnerId}`);
      setMessages(res.data?.messages || []);

      // Notify socket that conversation is opened and read
      const socket = getSocket();
      socket?.emit("mark_read", { partnerId });

      // Clear unread count locally
      setConversations((prev) =>
        prev.map((c) =>
          c.partner.id === partnerId ? { ...c, unreadCount: 0 } : c
        )
      );
      onRefreshUnreadCount?.();
    } catch (err) {
      console.error("Failed to fetch messages for partner:", err);
    } finally {
      setLoadingMessages(false);
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [scrollToBottom]);

  // Handle active partner change
  useEffect(() => {
    if (activePartner) {
      fetchMessages(activePartner.id);
      setIsPartnerTyping(false);
    } else {
      setMessages([]);
    }
  }, [activePartner, fetchMessages]);

  // If initialPartner was passed from outside (e.g. profile button), ensure selected
  useEffect(() => {
    if (initialPartner) {
      setActivePartner(initialPartner);
    }
  }, [initialPartner]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isPartnerTyping, scrollToBottom]);

  // 3. Socket.io Connection and Real-Time Event Handlers
  useEffect(() => {
    const socket = connectSocket();

    // Listen for updated online users
    const handleOnlineUsers = (userIds: string[]) => {
      setOnlineUserIds(new Set(userIds));
    };

    // Listen for incoming message
    const handleNewMessage = (msg: DirectMessage) => {
      const currentActive = activePartnerRef.current;

      // Check if message belongs to current active open conversation
      if (
        currentActive &&
        (msg.senderId === currentActive.id || msg.receiverId === currentActive.id)
      ) {
        setMessages((prev) => {
          // Avoid duplicate additions
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [
            ...prev,
            {
              ...msg,
              isSelf: msg.senderId === currentUserId,
            },
          ];
        });

        // If from partner in active chat, mark as read immediately
        if (msg.senderId === currentActive.id) {
          socket.emit("mark_read", { partnerId: currentActive.id });
        }
      }

      // Update conversations list in sidebar
      setConversations((prev) => {
        const partnerId =
          msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
        const exists = prev.some((c) => c.partner.id === partnerId);

        if (!exists) {
          // Re-fetch conversations to include new user details
          fetchConversations();
          return prev;
        }

        return prev
          .map((c) => {
            if (c.partner.id === partnerId) {
              const isActiveChat = currentActive?.id === partnerId;
              return {
                ...c,
                lastMessage: {
                  id: msg.id,
                  content: msg.content,
                  createdAt: msg.createdAt,
                  senderId: msg.senderId,
                  isSelf: msg.senderId === currentUserId,
                },
                unreadCount:
                  isActiveChat || msg.senderId === currentUserId
                    ? 0
                    : c.unreadCount + 1,
              };
            }
            return c;
          })
          .sort(
            (a, b) =>
              new Date(b.lastMessage.createdAt).getTime() -
              new Date(a.lastMessage.createdAt).getTime()
          );
      });
    };

    // Listen for sender message acknowledgement (replaces optimistic temporary message)
    const handleMessageSent = (data: {
      tempId?: string;
      message: DirectMessage;
    }) => {
      if (data.tempId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.tempId ? { ...data.message, isSelf: true } : m))
        );
      }
    };

    // Listen for partner typing indicator
    const handleUserTyping = (data: { senderId: string }) => {
      if (activePartnerRef.current && data.senderId === activePartnerRef.current.id) {
        setIsPartnerTyping(true);
      }
    };

    const handleUserStopTyping = (data: { senderId: string }) => {
      if (activePartnerRef.current && data.senderId === activePartnerRef.current.id) {
        setIsPartnerTyping(false);
      }
    };

    // Listen for read receipts
    const handleMessagesRead = (data: { readBy: string; partnerId: string }) => {
      if (activePartnerRef.current && data.readBy === activePartnerRef.current.id) {
        setMessages((prev) =>
          prev.map((m) => (m.isSelf ? { ...m, isRead: true } : m))
        );
      }
    };

    socket.on("online_users", handleOnlineUsers);
    socket.on("new_message", handleNewMessage);
    socket.on("message_sent", handleMessageSent);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("online_users", handleOnlineUsers);
      socket.off("new_message", handleNewMessage);
      socket.off("message_sent", handleMessageSent);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [currentUserId, fetchConversations]);

  // Handle typing input and debounce stop_typing notification
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (!activePartner) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("typing", { receiverId: activePartner.id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { receiverId: activePartner.id });
    }, 2000);
  };

  // 4. Send Message via Socket.io
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = inputText.trim();
    if (!cleanContent || !activePartner) return;

    const socket = getSocket();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Create optimistic message
    const optimisticMessage: DirectMessage = {
      id: tempId,
      senderId: currentUserId || "self",
      receiverId: activePartner.id,
      content: cleanContent,
      createdAt: new Date().toISOString(),
      isRead: false,
      isSelf: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");

    // Emit send_message through Socket.io
    if (socket?.connected) {
      socket.emit("send_message", {
        receiverId: activePartner.id,
        content: cleanContent,
        tempId,
      });
      socket.emit("stop_typing", { receiverId: activePartner.id });
    } else {
      // Fallback to HTTP POST if socket is temporarily reconnecting
      api
        .post(`/messages/${activePartner.id}`, { content: cleanContent })
        .then((res) => {
          if (res.data?.message) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? { ...res.data.message, isSelf: true } : m
              )
            );
          }
        })
        .catch((err) => console.error("HTTP send message failed:", err));
    }

    // Update conversation snippet in sidebar
    setConversations((prev) => {
      const exists = prev.some((c) => c.partner.id === activePartner.id);
      if (!exists) {
        return [
          {
            partner: activePartner,
            lastMessage: {
              id: tempId,
              content: cleanContent,
              createdAt: new Date().toISOString(),
              senderId: currentUserId || "self",
              isSelf: true,
            },
            unreadCount: 0,
          },
          ...prev,
        ];
      }

      return prev
        .map((c) =>
          c.partner.id === activePartner.id
            ? {
                ...c,
                lastMessage: {
                  id: tempId,
                  content: cleanContent,
                  createdAt: new Date().toISOString(),
                  senderId: currentUserId || "self",
                  isSelf: true,
                },
              }
            : c
        )
        .sort(
          (a, b) =>
            new Date(b.lastMessage.createdAt).getTime() -
            new Date(a.lastMessage.createdAt).getTime()
        );
    });
  };

  // Helper formatting for timestamps
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((c) =>
    c.partner.username.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className={styles.container}>
      {/* LEFT COLUMN: Conversations List */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Messages</h2>
          <button
            type="button"
            className={styles.newChatBtn}
            onClick={() => setIsNewChatOpen(true)}
            title="Start new conversation"
            aria-label="Start new conversation"
          >
            <SquarePen size={18} />
          </button>
        </div>

        <div className={styles.searchWrap}>
          <div className={styles.searchBar}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.conversationsList}>
          {loadingConvs ? (
            <div className={styles.spinner} />
          ) : filteredConversations.length === 0 ? (
            <div className={styles.chatEmpty} style={{ padding: "2.5rem 1rem" }}>
              <p style={{ margin: 0, fontSize: "0.875rem" }}>
                {searchFilter ? "No conversations found" : "No messages yet."}
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = activePartner?.id === c.partner.id;
              const isPartnerOnline = onlineUserIds.has(c.partner.id);

              return (
                <button
                  type="button"
                  key={c.partner.id}
                  className={`${styles.conversationItem} ${
                    isSelected ? styles.activeConversation : ""
                  }`}
                  onClick={() => setActivePartner(c.partner)}
                >
                  <div className={styles.avatarContainer}>
                    {c.partner.profilePictureUrl ? (
                      <img
                        src={c.partner.profilePictureUrl}
                        alt={c.partner.username}
                        className={styles.avatar}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {c.partner.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isPartnerOnline && <span className={styles.onlineBadge} />}
                  </div>

                  <div className={styles.convMeta}>
                    <div className={styles.convTop}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className={styles.convUsername}>
                          {c.partner.username}
                        </span>
                        {c.partner.isGuestSandbox && (
                          <span className={styles.guestBadgeSmall}>Guest</span>
                        )}
                      </div>
                      <span className={styles.convTime}>
                        {formatTime(c.lastMessage?.createdAt)}
                      </span>
                    </div>

                    <div className={styles.convBottom}>
                      <p
                        className={`${styles.convSnippet} ${
                          c.unreadCount > 0 ? styles.unreadSnippet : ""
                        }`}
                      >
                        {c.lastMessage?.isSelf ? "You: " : ""}
                        {c.lastMessage?.content || "No messages yet"}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className={styles.unreadBadge}>{c.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT COLUMN: Active Chat Panel */}
      <main className={styles.chatArea}>
        {activePartner ? (
          <>
            {/* Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderUser}>
                <div className={styles.avatarContainer}>
                  {activePartner.profilePictureUrl ? (
                    <img
                      src={activePartner.profilePictureUrl}
                      alt={activePartner.username}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {activePartner.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {onlineUserIds.has(activePartner.id) && (
                    <span className={styles.onlineBadge} />
                  )}
                </div>

                <div className={styles.chatHeaderDetails}>
                  <div className={styles.chatHeaderName}>
                    <span>{activePartner.username}</span>
                    {activePartner.isGuestSandbox && (
                      <span className={styles.guestBadgeSmall}>Guest</span>
                    )}
                  </div>
                  <span
                    className={`${styles.chatHeaderStatus} ${
                      onlineUserIds.has(activePartner.id)
                        ? styles.statusOnline
                        : ""
                    }`}
                  >
                    {onlineUserIds.has(activePartner.id)
                      ? "Online now"
                      : "Offline"}
                  </span>
                </div>
              </div>

              {onOpenProfile && (
                <button
                  type="button"
                  className={styles.profileBtn}
                  onClick={() => onOpenProfile(activePartner.username)}
                  title="View user profile"
                >
                  <User size={14} style={{ display: "inline", marginRight: 4 }} />
                  Profile
                </button>
              )}
            </div>

            {/* Messages Body */}
            <div className={styles.messagesStream}>
              {loadingMessages ? (
                <div className={styles.spinner} />
              ) : messages.length === 0 ? (
                <div className={styles.chatEmpty}>
                  <div className={styles.chatEmptyIcon}>
                    <MessageSquare size={32} />
                  </div>
                  <h3 className={styles.chatEmptyTitle}>Say hello!</h3>
                  <p className={styles.chatEmptyDesc}>
                    Send a direct message to start a conversation with @
                    {activePartner.username}.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isSelf =
                    Boolean(m.isSelf) ||
                    (Boolean(currentUserId) && m.senderId === currentUserId);

                  return (
                    <div
                      key={m.id}
                      className={`${styles.messageRow} ${
                        isSelf ? styles.selfRow : styles.partnerRow
                      }`}
                    >
                      <div
                        className={`${styles.bubble} ${
                          isSelf ? styles.selfBubble : styles.partnerBubble
                        }`}
                      >
                        <div>{m.content}</div>
                        <div
                          className={`${styles.metaRow} ${
                            isSelf ? styles.selfMeta : styles.partnerMeta
                          }`}
                        >
                          <span>{formatTime(m.createdAt)}</span>
                          {isSelf && (
                            <span className={styles.readIcon}>
                              {m.isRead ? (
                                <CheckCheck size={13} strokeWidth={2.5} />
                              ) : (
                                <Check size={13} strokeWidth={2.5} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Real-time Typing Bubble Indicator */}
              {isPartnerTyping && (
                <div className={styles.typingRow}>
                  <div className={styles.typingBubble}>
                    <div className={styles.typingDot} />
                    <div className={styles.typingDot} />
                    <div className={styles.typingDot} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {activePartner.username} is typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            <form className={styles.inputForm} onSubmit={handleSendMessage}>
              <input
                type="text"
                className={styles.inputField}
                placeholder={`Message @${activePartner.username}...`}
                value={inputText}
                onChange={handleInputChange}
                autoFocus
              />
              <button
                type="submit"
                className={styles.sendBtn}
                disabled={!inputText.trim()}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className={styles.chatEmpty}>
            <div className={styles.chatEmptyIcon}>
              <MessageSquare size={36} />
            </div>
            <h3 className={styles.chatEmptyTitle}>Your Messages</h3>
            <p className={styles.chatEmptyDesc}>
              Choose an existing conversation from the list or start a new chat with
              any member of the community.
            </p>
            <button
              type="button"
              className={styles.startChatBtn}
              onClick={() => setIsNewChatOpen(true)}
            >
              Start a Conversation
            </button>
          </div>
        )}
      </main>

      {/* New Chat Picker Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        currentUsername={currentUsername}
        onSelectUser={(user) => {
          setActivePartner(user);
        }}
      />
    </div>
  );
};

