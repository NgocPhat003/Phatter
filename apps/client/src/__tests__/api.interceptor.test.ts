import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { api } from "../lib/api";
import { useAuthStore } from "../store/useAuthStore";

function make401Error(config: InternalAxiosRequestConfig) {
  return new AxiosError(
    "Unauthorized",
    "ERR_BAD_REQUEST",
    config,
    null,
    {
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
      data: { error: "Access token expired" },
    }
  );
}

describe("Axios 401 Silent Refresh Mutex Interceptor", () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    useAuthStore.setState({
      currentUser: { id: "usr_1", username: "sarah_dev" },
      checkingAuth: false,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("queues concurrent 401 calls behind a single POST /auth/refresh and replays all upon success", async () => {
    let refreshAttempts = 0;
    let isSessionRefreshed = false;

    const mockAdapter: AxiosAdapter = async (config) => {
      if (config.url?.includes("/auth/refresh")) {
        refreshAttempts++;
        // Small async tick to force parallel requests into the waiting queue
        await new Promise((r) => setTimeout(r, 20));
        isSessionRefreshed = true;
        return {
          data: { status: "success" },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      }

      if (!isSessionRefreshed) {
        return Promise.reject(make401Error(config));
      }

      return {
        data: { endpoint: config.url, ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };

    api.defaults.adapter = mockAdapter;

    // Fire 3 concurrent requests that will all hit an expired access token simultaneously
    const [res1, res2, res3] = await Promise.all([
      api.get("/posts"),
      api.get("/notifications"),
      api.get("/messages/conversations"),
    ]);

    expect(refreshAttempts).toBe(1);
    expect(res1.data).toEqual({ endpoint: "/posts", ok: true });
    expect(res2.data).toEqual({ endpoint: "/notifications", ok: true });
    expect(res3.data).toEqual({ endpoint: "/messages/conversations", ok: true });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("rejects queued requests and clears auth store when refresh fails", async () => {
    const mockAdapter: AxiosAdapter = async (config) => {
      return Promise.reject(make401Error(config));
    };

    api.defaults.adapter = mockAdapter;

    await expect(api.get("/posts")).rejects.toThrow();

    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("does not intercept 401 on login endpoint to avoid infinite refresh loops", async () => {
    let refreshCalled = false;

    const mockAdapter: AxiosAdapter = async (config) => {
      if (config.url?.includes("/auth/refresh")) {
        refreshCalled = true;
      }
      return Promise.reject(make401Error(config));
    };

    api.defaults.adapter = mockAdapter;

    await expect(
      api.post("/auth/login", { identifier: "u", password: "wrong" })
    ).rejects.toThrow();

    expect(refreshCalled).toBe(false);
    // Auth state remains untouched on standard login form failure
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
