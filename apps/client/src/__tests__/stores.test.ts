import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosResponse } from "axios";

const socketMocks = vi.hoisted(() => ({
  disconnectSocket: vi.fn(),
}));

const onlineMocks = vi.hoisted(() => ({
  resetOnlineUsersTracker: vi.fn(),
}));

vi.mock("../lib/socket", () => ({
  disconnectSocket: socketMocks.disconnectSocket,
  connectSocket: vi.fn(),
  getSocket: vi.fn(() => null),
}));

vi.mock("../hooks/useOnlineUsers", () => ({
  resetOnlineUsersTracker: onlineMocks.resetOnlineUsersTracker,
}));

import { api } from "../lib/api";
import { useAuthStore } from "../store/useAuthStore";
import { useNotificationStore } from "../store/useNotificationStore";
import { usePostStore } from "../store/usePostStore";
import { useThemeStore } from "../store/useThemeStore";

describe("Client Zustand Stores", () => {
  describe("useAuthStore", () => {
    beforeEach(() => {
      useAuthStore.setState({
        currentUser: null,
        checkingAuth: true,
        isAuthenticated: false,
      });
      vi.restoreAllMocks();
    });

    it("setCurrentUser authenticates and clears checkingAuth", () => {
      useAuthStore.getState().setCurrentUser({
        id: "usr_1",
        username: "sarah_dev",
        email: "sarah@phatter.com",
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.checkingAuth).toBe(false);
      expect(state.currentUser?.username).toBe("sarah_dev");
    });

    it("updateCurrentUser merges partial profile updates without mutating null state", () => {
      useAuthStore.getState().updateCurrentUser({ bio: "Should remain null" });
      expect(useAuthStore.getState().currentUser).toBeNull();

      useAuthStore.getState().setCurrentUser({
        id: "usr_1",
        username: "sarah_dev",
        bio: "Old bio",
      });
      useAuthStore.getState().updateCurrentUser({ bio: "Updated bio" });

      expect(useAuthStore.getState().currentUser).toMatchObject({
        id: "usr_1",
        username: "sarah_dev",
        bio: "Updated bio",
      });
    });

    it("fetchSession populates user on 200 and clears auth state on 401 failure", async () => {
      vi.spyOn(api, "get").mockResolvedValueOnce({
        data: { user: { id: "usr_99", username: "alexchen" } },
      } as AxiosResponse);

      await useAuthStore.getState().fetchSession();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().currentUser?.username).toBe("alexchen");
      expect(useAuthStore.getState().checkingAuth).toBe(false);

      vi.spyOn(api, "get").mockRejectedValueOnce(new Error("Unauthorized"));
      await useAuthStore.getState().fetchSession();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().currentUser).toBeNull();
      expect(useAuthStore.getState().checkingAuth).toBe(false);
    });

    it("logout calls /auth/logout, disconnects socket, resets online users, and clears state", async () => {
      useAuthStore.getState().setCurrentUser({
        id: "usr_1",
        username: "sarah_dev",
      });

      const postSpy = vi
        .spyOn(api, "post")
        .mockResolvedValueOnce({} as AxiosResponse);

      await useAuthStore.getState().logout();

      expect(postSpy).toHaveBeenCalledWith("/auth/logout");
      expect(socketMocks.disconnectSocket).toHaveBeenCalledTimes(1);
      expect(onlineMocks.resetOnlineUsersTracker).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().currentUser).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("useNotificationStore", () => {
    beforeEach(() => {
      useNotificationStore.getState().resetCounts();
      vi.restoreAllMocks();
    });

    it("increments, decrements, and clamps unread counts at zero", () => {
      const store = useNotificationStore.getState();

      store.incrementNotifications();
      store.incrementNotifications();
      expect(useNotificationStore.getState().unreadNotificationsCount).toBe(2);

      store.decrementNotifications();
      store.decrementNotifications();
      store.decrementNotifications(); // Should clamp at 0
      expect(useNotificationStore.getState().unreadNotificationsCount).toBe(0);

      store.setUnreadMessagesCount(-5);
      expect(useNotificationStore.getState().unreadMessagesCount).toBe(0);

      store.incrementMessages();
      expect(useNotificationStore.getState().unreadMessagesCount).toBe(1);
      store.decrementMessages();
      expect(useNotificationStore.getState().unreadMessagesCount).toBe(0);
    });

    it("fetchUnreadCounts tolerates partial endpoint failures via Promise.allSettled", async () => {
      vi.spyOn(api, "get").mockImplementation(async (url: string) => {
        if (url === "/messages/unread-count") {
          return { data: { unreadCount: 4 } } as AxiosResponse;
        }
        throw new Error("Notifications endpoint temporary failure");
      });

      await useNotificationStore.getState().fetchUnreadCounts();

      expect(useNotificationStore.getState().unreadMessagesCount).toBe(4);
      expect(useNotificationStore.getState().unreadNotificationsCount).toBe(0);
    });
  });

  describe("usePostStore", () => {
    it("updates activeFeed and activeSort preferences", () => {
      usePostStore.getState().setActiveFeed("following");
      usePostStore.getState().setActiveSort("popular");

      expect(usePostStore.getState().activeFeed).toBe("following");
      expect(usePostStore.getState().activeSort).toBe("popular");

      usePostStore.getState().setActiveFeed("for-you");
      usePostStore.getState().setActiveSort("latest");
    });
  });

  describe("useThemeStore", () => {
    beforeEach(() => {
      window.localStorage.clear();
      useThemeStore.getState().setTheme("light");
    });

    it("toggles between light and dark mode, persisting to localStorage and document", () => {
      expect(useThemeStore.getState().theme).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");

      useThemeStore.getState().toggleTheme();

      expect(useThemeStore.getState().theme).toBe("dark");
      expect(window.localStorage.getItem("phatter-theme")).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(document.documentElement.style.colorScheme).toBe("dark");

      useThemeStore.getState().toggleTheme();

      expect(useThemeStore.getState().theme).toBe("light");
      expect(window.localStorage.getItem("phatter-theme")).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });
});
