import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import crypto from "crypto";
import { verifyAuthToken } from "../../shared/utils/jwt.util.js";
import { jwtConfig } from "../../shared/config/jwt.config.js";
import { insertMessage, markConversationRead } from "./messages.db.js";

// Global reference to the Socket.io server instance
let io: SocketIOServer | null = null;

// Track active online users: Map<userId, activeSocketConnectionCount>
const onlineUsers = new Map<string, number>();

/**
 * Helper to parse cookies from raw cookie header string.
 */
function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((pair) => {
    const [name, ...rest] = pair.split("=");
    if (name) {
      cookies[name.trim()] = decodeURIComponent(rest.join("=").trim());
    }
  });

  return cookies;
}

/**
 * Initializes and configures the Socket.io real-time engine.
 */
export function setupSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  /**
   * STEP 1: Handshake Authentication Middleware
   * Socket.io middleware runs once during the initial HTTP handshake.
   * We extract the JWT from the HTTP cookie or auth payload.
   */
  io.use((socket: Socket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie;
      const cookies = parseCookies(rawCookies);
      const token =
        cookies[jwtConfig.cookieName] ||
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization?.replace(/^Bearer\s+/, ""));

      if (!token) {
        return next(new Error("Authentication error: No session token provided"));
      }

      const decoded = verifyAuthToken(token);
      socket.data.user = decoded;
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  /**
   * STEP 2: Connection Lifecycle & Event Routing
   */
  io.on("connection", (socket: Socket) => {
    const userId: string = socket.data.userId;

    /**
     * STEP 3: User Room Joining
     * Each connected client automatically joins a room named after their userId.
     * This makes targeting messages easy: io.to(receiverId).emit(...)
     */
    socket.join(userId);

    // Track online status
    const currentSockets = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, currentSockets + 1);

    // Broadcast updated online users list to all connected clients
    io?.emit("online_users", Array.from(onlineUsers.keys()));

    /**
     * STEP 4: Handle "send_message" event
     * Sender transmits a direct message to a recipient.
     */
    socket.on("send_message", async (data: { receiverId: string; content: string; tempId?: string }) => {
      try {
        const { receiverId, content, tempId } = data;
        const cleanContent = content?.trim();

        if (!receiverId || !cleanContent) {
          socket.emit("message_error", {
            tempId,
            error: "Receiver ID and message content are required",
          });
          return;
        }

        if (cleanContent.length > 5000) {
          socket.emit("message_error", {
            tempId,
            error: "Message is too long (maximum 5000 characters)",
          });
          return;
        }

        const messageId = `msg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const savedMessage = await insertMessage(messageId, userId, receiverId, cleanContent);

        const payload = {
          id: savedMessage.id,
          senderId: savedMessage.senderId,
          receiverId: savedMessage.receiverId,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt,
          isRead: savedMessage.isRead,
        };

        // 1. Acknowledge back to sender (with tempId so client can replace optimistic item)
        socket.emit("message_sent", {
          tempId,
          message: payload,
        });

        // 2. Deliver message directly to receiver's private room
        io?.to(receiverId).emit("new_message", payload);

        // 3. Stop typing indicator when message is sent
        io?.to(receiverId).emit("user_stop_typing", { senderId: userId });
      } catch (error) {
        console.error("[Socket send_message Error]:", error);
        socket.emit("message_error", {
          tempId: data?.tempId,
          error: "Failed to send message",
        });
      }
    });

    /**
     * STEP 5: Real-time Typing Indicators
     */
    socket.on("typing", (data: { receiverId: string }) => {
      if (data?.receiverId) {
        io?.to(data.receiverId).emit("user_typing", { senderId: userId });
      }
    });

    socket.on("stop_typing", (data: { receiverId: string }) => {
      if (data?.receiverId) {
        io?.to(data.receiverId).emit("user_stop_typing", { senderId: userId });
      }
    });

    /**
     * STEP 6: Read Receipts
     */
    socket.on("mark_read", async (data: { partnerId: string }) => {
      try {
        if (!data?.partnerId) return;
        await markConversationRead(data.partnerId, userId);

        // Notify the partner that their messages to this user have been read
        io?.to(data.partnerId).emit("messages_read", {
          readBy: userId,
          partnerId: data.partnerId,
        });
      } catch (error) {
        console.error("[Socket mark_read Error]:", error);
      }
    });

    /**
     * STEP 7: Disconnection handling
     */
    socket.on("disconnect", () => {
      const activeCount = (onlineUsers.get(userId) || 1) - 1;
      if (activeCount <= 0) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, activeCount);
      }

      // Broadcast updated online users
      io?.emit("online_users", Array.from(onlineUsers.keys()));
    });
  });

  return io;
}

/**
 * Returns the current SocketIOServer instance (if initialized).
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}
