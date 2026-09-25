import type { Request, Response } from "express";
import { db } from "phatter-db";
import crypto form "crypto";
import { signAuthToken } from "../../shared/utils/jwt.util.js";
import { jwtConfig } from "../../shared/config/jwt.config.js";

export const createGuestSession = async (_req: Request, res: Response) => {
    try {
        const guestId = crypto.randomBytes(4).toString("hex");
        const guestUsername = `Guest_${guestId}`;

        const newUser = await db.orm.public.User?.create({
            data: {
                email: `${guestUsername}@sandbox.phatter.local`,
                username: guestUsername,
                isGuestSandbox: true,
                bio: "Temporary sandbox account",
            },
        });

        const token = signAuthToken({
            userId: newUser.id,
            isGuestSandbox: newUser.isGuestSandbox,
        });

        res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);

        res.status(201).json({
            status: "success",
            message: "Guest sandbox session initialized",
            user: {
                id: newUser.id,
                username: newUser.username,
                isGuestSandbox: newUser.isGuestSandbox,
            },
        });
    } catch (error) {
        console.error("Sandbox Error:", error);
        res.status(500).json({ error: "Failed to initialize guest sandbox"});
    }
};

export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        if(!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await db.orm.public.User?.where({ id: userId }).first();

        if(!user) {
            return res.status(404).json({ error: "User not found"});
        }

        res.json({
            status: "success",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                profilePictureUrl: user.profilePictureUrl,
                bio: user.bio,
                isGuestSandbox: user.isGuestSandbox,
                createdAt: user.createAt,
            },
        });
    } catch (error) {
        console.error("Get User Error:", error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
};