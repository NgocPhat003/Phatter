import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

export const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,  // Always send cookies with every request
});

// ─── Silent Refresh Interceptor ───────────────────────────────────────────────
//
// WHAT THIS DOES:
// When any API request returns 401 (access token expired), this interceptor:
// 1. Calls POST /api/auth/refresh (which rotates the refresh token and sets new cookies)
// 2. Retries the original failed request automatically
// The user sees nothing — no logout, no error flash.
//
// RACE CONDITION PROTECTION:
// If 5 parallel API calls all get 401 at the same moment, we must NOT fire 5 refresh requests.
// (The 2nd refresh would fail because the 1st already rotated the token.)
// Solution: A mutex lock (isRefreshing) + a queue (failedQueue).
// - First 401: sets isRefreshing = true, fires ONE refresh request
// - Subsequent 401s: added to failedQueue (they wait)
// - When refresh succeeds: drain the queue — all pending requests retry automatically
// - When refresh fails: reject all queued requests (session is truly expired → user must log in)

let isRefreshing = false;

type QueueItem = {
  resolve: () => void;
  reject: (error: any) => void;
};

let failedQueue: QueueItem[] = [];

const drainQueue = (error: any | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  // ✅ Success path: pass through unchanged
  (response) => response,

  // ❌ Error path: intercept 401s for silent refresh
  async (error) => {
    const originalRequest = error.config;

    // Don't intercept 401 errors that are already being retried,
    // or auth endpoints (login, register, refresh, logout)
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    if (error.response?.status !== 401 || originalRequest?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another 401 came in while we're already refreshing.
      // Add to queue — it will be retried when the active refresh completes.
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        // Retry the original request (cookies now have the new access token)
        return api(originalRequest);
      });
    }

    // First 401: take the lock and fire the refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Call refresh endpoint — server reads the refresh_token cookie,
      // rotates it, and sets a new access_token + refresh_token cookie pair
      await api.post("/auth/refresh");

      // Refresh succeeded — release the lock and drain the queue
      drainQueue(null);

      // Retry the original request with the new access_token cookie
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed (session truly expired or compromised)
      // Drain the queue with the error so all pending requests reject too
      drainQueue(refreshError);

      // Reset global auth store immediately so the UI cleanly switches to login
      useAuthStore.getState().setCurrentUser(null);

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);