import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Determine backend URL (fallback to localhost:3000 in dev)
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
  : "http://localhost:3000";

/**
 * Gets the current active socket instance, or null if not connected.
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Initializes and connects the Socket.io client connection.
 * Sends browser cookies automatically via `withCredentials: true`.
 */
export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Socket.io]: Connected with ID", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket.io]: Connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket.io]: Disconnected:", reason);
    });
  } else if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

/**
 * Disconnects and cleans up the active socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
