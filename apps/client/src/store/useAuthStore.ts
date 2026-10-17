import { create } from "zustand";
import { api } from "../lib/api";
import { disconnectSocket } from "../lib/socket";
import { resetOnlineUsersTracker } from "../hooks/useOnlineUsers";
import type { CurrentUser } from "../features/posts/types/types";

interface AuthState {
  currentUser: CurrentUser | null;
  checkingAuth: boolean;
  isAuthenticated: boolean;

  // Actions
  setCurrentUser: (user: CurrentUser | null) => void;
  updateCurrentUser: (updates: Partial<CurrentUser>) => void;
  fetchSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  checkingAuth: true,
  isAuthenticated: false,

  setCurrentUser: (user) =>
    set({
      currentUser: user,
      isAuthenticated: !!user,
      checkingAuth: false,
    }),

  updateCurrentUser: (updates) =>
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null,
    })),

  fetchSession: async () => {
    try {
      set({ checkingAuth: true });
      const res = await api.get("/auth/me");
      const user = res.data?.user || null;
      set({
        currentUser: user,
        isAuthenticated: !!user,
        checkingAuth: false,
      });
    } catch {
      set({
        currentUser: null,
        isAuthenticated: false,
        checkingAuth: false,
      });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      disconnectSocket();
      resetOnlineUsersTracker();
      set({
        currentUser: null,
        isAuthenticated: false,
        checkingAuth: false,
      });
    }
  },
}));

