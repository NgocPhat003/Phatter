import { create } from "zustand";
import { api } from "../lib/api";

interface NotificationState {
  unreadNotificationsCount: number;
  unreadMessagesCount: number;

  // Actions
  setUnreadNotificationsCount: (count: number) => void;
  setUnreadMessagesCount: (count: number) => void;
  incrementNotifications: () => void;
  decrementNotifications: () => void;
  incrementMessages: () => void;
  decrementMessages: () => void;
  fetchUnreadCounts: () => Promise<void>;
  resetCounts: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadNotificationsCount: 0,
  unreadMessagesCount: 0,

  setUnreadNotificationsCount: (count) =>
    set({ unreadNotificationsCount: Math.max(0, count) }),

  setUnreadMessagesCount: (count) =>
    set({ unreadMessagesCount: Math.max(0, count) }),

  incrementNotifications: () =>
    set((state) => ({ unreadNotificationsCount: state.unreadNotificationsCount + 1 })),

  decrementNotifications: () =>
    set((state) => ({
      unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1),
    })),

  incrementMessages: () =>
    set((state) => ({ unreadMessagesCount: state.unreadMessagesCount + 1 })),

  decrementMessages: () =>
    set((state) => ({
      unreadMessagesCount: Math.max(0, state.unreadMessagesCount - 1),
    })),

  fetchUnreadCounts: async () => {
    try {
      const [messagesRes, notifsRes] = await Promise.allSettled([
        api.get("/messages/unread-count"),
        api.get("/notifications/unread-count"),
      ]);

      set({
        unreadMessagesCount:
          messagesRes.status === "fulfilled"
            ? messagesRes.value.data?.unreadCount || 0
            : 0,
        unreadNotificationsCount:
          notifsRes.status === "fulfilled"
            ? notifsRes.value.data?.unreadCount || 0
            : 0,
      });
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
    }
  },

  resetCounts: () =>
    set({
      unreadNotificationsCount: 0,
      unreadMessagesCount: 0,
    }),
}));

