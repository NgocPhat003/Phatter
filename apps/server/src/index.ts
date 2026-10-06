import { Temporal } from "@js-temporal/polyfill";
(globalThis as any).Temporal = Temporal;
import http from "http";
import express  from "express";  
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { db } from "phatter-db";
import authRoutes from "./modules/auth/auth.routes.js";
import postsRoutes from "./modules/posts/posts.routes.js";
import likesRoutes from "./modules/likes/likes.routes.js";
import commentsRoutes from "./modules/comments/comments.routes.js";
import uploadsRoutes from "./modules/uploads/uploads.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import messagesRoutes from "./modules/messages/messages.routes.js";
import bookmarksRoutes from "./modules/bookmarks/bookmarks.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import { setupSocketServer } from "./modules/messages/messages.socket.js";
import { initMessagesTable } from "./modules/messages/messages.db.js";
import { initBookmarksTable } from "./modules/bookmarks/bookmarks.db.js";
import { initNotificationsTable } from "./modules/notifications/notifications.db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for both Express and Socket.io
const httpServer = http.createServer(app);

// Setup Socket.io real-time engine
setupSocketServer(httpServer);

// Core middleware
app.use(cors({
    origin: [
      process.env.CLIENT_ORIGIN || "http://localhost:5173",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Mounting routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/bookmarks", bookmarksRoutes);
app.use("/api/notifications", notificationsRoutes);

// Database Health Check Route
app.get("/api/health", async (_req, res) => {
    try {
        const result = await db.orm.public.User.aggregate((a) => ({
      total: a.count(),
    }));

    const userCount = result[0]?.total ? Number(result[0].total) : 0;

    res.json({
      status: "ok",
      database: "connected",
      registeredUsers: userCount,
      timestamp: new Date().toISOString(),
    });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Database connection failed",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

httpServer.listen(PORT, async () => {
    console.log(`[Server]: Phatter API and Socket.io running on ${PORT}`);
    await initMessagesTable();
    await initBookmarksTable();
    await initNotificationsTable();
});
