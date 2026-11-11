import { Temporal } from "@js-temporal/polyfill";
if (!(globalThis as any).Temporal) {
  (globalThis as any).Temporal = Temporal;
}
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { db } from "phatter-db";
import authRoutes from "./modules/auth/auth.routes.js";
import postsRoutes from "./modules/posts/posts.routes.js";
import likesRoutes from "./modules/likes/likes.routes.js";
import commentsRoutes from "./modules/comments/comments.routes.js";
import uploadsRoutes from "./modules/uploads/uploads.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import followsRoutes from "./modules/follows/follows.routes.js";
import messagesRoutes from "./modules/messages/messages.routes.js";
import bookmarksRoutes from "./modules/bookmarks/bookmarks.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import { env } from "./shared/config/env.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";

/**
 * Configured Express application instance without side-effect network binding.
 * Exported separately from index.ts so Supertest integration tests can mount
 * the full middleware and routing stack cleanly in memory.
 */
export const app: Express = express();

// Trust reverse proxy (Render / Railway / Cloud load balancers) for HTTPS cookies
app.set("trust proxy", 1);

// Core middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        origin === env.CLIENT_ORIGIN ||
        origin === "https://phatter-ngocphat003.vercel.app" ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1");

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin not allowed: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Mounting routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/follows", followsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/bookmarks", bookmarksRoutes);
app.use("/api/notifications", notificationsRoutes);

// Lightweight Gateway Ping (Atmospheric Shield - Zero DB overhead)
app.get(["/api/status", "/status"], (_req, res) => {
  res.status(200).json({
    status: "live",
    service: "phatter-api",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

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

// Centralized error handling middleware (must be registered after all routes)
app.use(errorHandler);

export default app;
