import { Temporal } from "@js-temporal/polyfill";
(globalThis as any).Temporal = Temporal;
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Core middleware
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
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

app.listen(PORT, () => {
    console.log(`[Server]: Phatter API running on ${PORT}`);
});