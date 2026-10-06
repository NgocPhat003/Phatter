import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { connectSocket, getSocket } from "../lib/socket";

// Module-level global store of online user IDs
let globalOnlineUserIds = new Set<string>();
const subscribers = new Set<(ids: Set<string>) => void>();
let isTrackerInitialized = false;

function notifySubscribers() {
  const snapshot = new Set(globalOnlineUserIds);
  subscribers.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (err) {
      console.error("[useOnlineUsers] Subscriber callback error:", err);
    }
  });
}

/**
 * Resets the online users cache (used on logout).
 */
export function resetOnlineUsersTracker(): void {
  globalOnlineUserIds = new Set<string>();
  isTrackerInitialized = false;
  notifySubscribers();
}

/**
 * Initializes the global online users tracking engine via REST and Socket.io.
 */
export function initOnlineUsersTracker(): void {
  if (isTrackerInitialized) {
    // If already initialized, make sure we ask socket for latest state
    const currentSocket = getSocket();
    if (currentSocket?.connected) {
      currentSocket.emit("get_online_users");
    }
    return;
  }

  isTrackerInitialized = true;

  // 1. Initial REST fetch for instant, reliable population
  api
    .get("/messages/online-users")
    .then((res) => {
      if (Array.isArray(res.data?.onlineUserIds)) {
        globalOnlineUserIds = new Set(res.data.onlineUserIds.map((id: any) => String(id)));
        notifySubscribers();
      }
    })
    .catch((err) => {
      // In guest or logged-out situations, endpoint might 401, which is fine
      console.debug("[OnlineUsers] Initial REST fetch notice:", err?.response?.status || err?.message);
    });

  // 2. Connect socket and register real-time broadcast listeners
  const socket = connectSocket();

  const handleOnlineUsers = (userIds: string[]) => {
    if (Array.isArray(userIds)) {
      globalOnlineUserIds = new Set(userIds.map((id) => String(id)));
      notifySubscribers();
    }
  };

  socket.on("online_users", handleOnlineUsers);

  // If socket connects or reconnects, proactively request current online users
  socket.on("connect", () => {
    socket.emit("get_online_users");
  });

  if (socket.connected) {
    socket.emit("get_online_users");
  }
}

/**
 * Reactive React hook to access and observe real-time online user IDs.
 */
export function useOnlineUsers(): Set<string> {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(
    () => new Set(globalOnlineUserIds)
  );

  useEffect(() => {
    // Ensure tracker is running
    initOnlineUsersTracker();

    // Immediately synchronize with whatever is in the cache
    setOnlineUserIds(new Set(globalOnlineUserIds));

    // Request fresh online users from socket
    const socket = getSocket() || connectSocket();
    if (socket?.connected) {
      socket.emit("get_online_users");
    }

    const handleChange = (newSet: Set<string>) => {
      setOnlineUserIds(newSet);
    };

    subscribers.add(handleChange);

    return () => {
      subscribers.delete(handleChange);
    };
  }, []);

  return onlineUserIds;
}
