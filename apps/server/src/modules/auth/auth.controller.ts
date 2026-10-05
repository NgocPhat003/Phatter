import type { Request, Response } from "express";
import { db } from "phatter-db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { signAuthToken } from "../../shared/utils/jwt.util.js";
import { jwtConfig } from "../../shared/config/jwt.config.js";
import { pool } from "../../shared/db/pg.js";

// Helper: Ensure a unique username for social logins
const getUniqueUsername = async (desiredName: string): Promise<string> => {
  let clean = desiredName.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 18);
  if (!clean || clean.length < 3) {
    clean = `user_${crypto.randomBytes(3).toString("hex")}`;
  }

  const existing = await db.orm.public.User?.where({ username: clean }).first();
  if (!existing) {
    return clean;
  }

  return `${clean.slice(0, 14)}_${crypto.randomBytes(2).toString("hex")}`;
};

// ----------------------------------------------------
// Standard Login & Register with Password Security
// ----------------------------------------------------

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, bio } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: "Username and email are required" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username or email already taken
    const existingCheck = await pool.query(
      'SELECT id, username, email FROM "user" WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [cleanUsername, cleanEmail]
    );

    if (existingCheck.rows.length > 0) {
      const match = existingCheck.rows[0];
      if (match.username.toLowerCase() === cleanUsername.toLowerCase()) {
        return res.status(400).json({ error: "Username is already taken" });
      }
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Securely hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${crypto.randomBytes(10).toString("hex")}`;

    const insertRes = await pool.query(
      `
      INSERT INTO "user" (id, username, email, "passwordHash", bio, "isGuestSandbox", "createdAt")
      VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
      RETURNING id, username, email, bio, "profilePictureUrl", "isGuestSandbox"
      `,
      [userId, cleanUsername, cleanEmail, passwordHash, bio ? bio.trim() : null]
    );

    const newUser = insertRes.rows[0];

    const token = signAuthToken({
      userId: newUser.id,
      isGuestSandbox: false,
    });

    res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);

    res.status(201).json({
      status: "success",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        bio: newUser.bio,
        profilePictureUrl: newUser.profilePictureUrl,
        isGuestSandbox: false,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: "Failed to register account" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: "Username/email and password are required" });
    }

    const clean = identifier.trim();

    // Query user by username or email
    const queryRes = await pool.query(
      `
      SELECT id, username, email, "passwordHash", bio, "profilePictureUrl", "isGuestSandbox"
      FROM "user"
      WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [clean]
    );

    if (queryRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const user = queryRes.rows[0];

    // If account has passwordHash, verify with bcrypt
    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res
          .status(401)
          .json({ error: "Invalid username/email or password" });
      }
    } else {
      // Legacy user without a password: set their password now
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE "user" SET "passwordHash" = $1 WHERE id = $2', [
        newHash,
        user.id,
      ]);
    }

    const token = signAuthToken({
      userId: user.id,
      isGuestSandbox: user.isGuestSandbox,
    });

    res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);

    res.json({
      status: "success",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePictureUrl: user.profilePictureUrl,
        isGuestSandbox: user.isGuestSandbox,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Failed to sign in" });
  }
};

// ----------------------------------------------------
// GitHub OAuth
// ----------------------------------------------------

export const initiateGithubAuth = (_req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

  // If no credentials in .env, seamlessly route to development simulated login
  if (!clientId || clientId === "your_oauth_app_id") {
    return res.redirect(`/api/auth/mock-oauth?provider=github`);
  }

  const redirectUri = encodeURIComponent(`http://localhost:3000/api/auth/github/callback`);
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  res.redirect(githubUrl);
};

export const handleGithubCallback = async (req: Request, res: Response) => {
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${clientOrigin}/?auth_error=No authorization code provided`);
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("GitHub Token Error:", tokenData);
      return res.redirect(`${clientOrigin}/?auth_error=Failed to retrieve GitHub access token`);
    }

    // 2. Fetch user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "Phatter-App",
      },
    });
    const githubUser = await userRes.json();

    // 3. Resolve user email (fetch emails API if private)
    let email = githubUser.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "Phatter-App",
        },
      });
      const emails = await emailsRes.json();
      const primary = emails.find((e: any) => e.primary && e.verified);
      email = primary ? primary.email : `${githubUser.login}@users.noreply.github.com`;
    }

    // 4. Find or create user
    let user = await db.orm.public.User?.where({ email: email.toLowerCase() }).first();
    if (!user) {
      const username = await getUniqueUsername(githubUser.login || githubUser.name || "github_user");
      user = await db.orm.public.User.create({
        email: email.toLowerCase(),
        username,
        profilePictureUrl: githubUser.avatar_url || null,
        bio: githubUser.bio || "GitHub user on Phatter",
        isGuestSandbox: false,
      });
    }

    // 5. Sign JWT & set cookie
    const token = signAuthToken({
      userId: user.id,
      isGuestSandbox: false,
    });

    res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);
    res.redirect(clientOrigin);
  } catch (error) {
    console.error("GitHub Auth Callback Error:", error);
    res.redirect(`${clientOrigin}/?auth_error=GitHub authentication failed`);
  }
};

// ----------------------------------------------------
// Google (Gmail) OAuth
// ----------------------------------------------------

export const initiateGoogleAuth = (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // If no credentials in .env, seamlessly route to development simulated login
  if (!clientId || clientId === "your_google_client_id") {
    return res.redirect(`/api/auth/mock-oauth?provider=google`);
  }

  const redirectUri = encodeURIComponent(`http://localhost:3000/api/auth/google/callback`);
  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile`;
  res.redirect(googleUrl);
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${clientOrigin}/?auth_error=No authorization code provided`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `http://localhost:3000/api/auth/google/callback`;

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Google Token Error:", tokenData);
      return res.redirect(`${clientOrigin}/?auth_error=Failed to retrieve Google token`);
    }

    // 2. Fetch Google user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();

    const email = googleUser.email.toLowerCase();

    // 3. Find or create user
    let user = await db.orm.public.User?.where({ email }).first();
    if (!user) {
      const baseName = googleUser.name?.replace(/\s+/g, "_") || email.split("@")[0];
      const username = await getUniqueUsername(baseName);
      user = await db.orm.public.User.create({
        email,
        username,
        profilePictureUrl: googleUser.picture || null,
        bio: "Google account on Phatter",
        isGuestSandbox: false,
      });
    }

    // 4. Sign JWT & set cookie
    const token = signAuthToken({
      userId: user.id,
      isGuestSandbox: false,
    });

    res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);
    res.redirect(clientOrigin);
  } catch (error) {
    console.error("Google Auth Callback Error:", error);
    res.redirect(`${clientOrigin}/?auth_error=Google authentication failed`);
  }
};

// ----------------------------------------------------
// Development / Mock Social Login (Zero Config Testing)
// ----------------------------------------------------

export const mockOAuthLogin = async (req: Request, res: Response) => {
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  try {
    const provider = req.query.provider === "google" ? "google" : "github";

    const mockEmail =
      provider === "google" ? "demo_google_user@gmail.com" : "demo_github_user@users.noreply.github.com";
    const defaultUsername = provider === "google" ? "GoogleUser" : "GitHubDev";
    const defaultAvatar =
      provider === "google"
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120"
        : "https://avatars.githubusercontent.com/u/583231?v=4";

    let user = await db.orm.public.User?.where({ email: mockEmail }).first();
    if (!user) {
      const username = await getUniqueUsername(defaultUsername);
      user = await db.orm.public.User.create({
        email: mockEmail,
        username,
        profilePictureUrl: defaultAvatar,
        bio: `Connected with ${provider === "google" ? "Google" : "GitHub"}`,
        isGuestSandbox: false,
      });
    }

    const token = signAuthToken({
      userId: user.id,
      isGuestSandbox: false,
    });

    res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);
    res.redirect(clientOrigin);
  } catch (error) {
    console.error("Mock OAuth Error:", error);
    res.redirect(`${clientOrigin}/?auth_error=Mock OAuth login failed`);
  }
};

// ----------------------------------------------------
// Guest Sandbox Session
// ----------------------------------------------------

export const createGuestSession = async (_req: Request, res: Response) => {
  try {
    const guestId = crypto.randomBytes(4).toString("hex");
    const guestUsername = `Guest_${guestId}`;

    const newUser = await db.orm.public.User.create({
      email: `${guestUsername}@sandbox.phatter.local`,
      username: guestUsername,
      isGuestSandbox: true,
      bio: "Temporary sandbox account",
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
    res.status(500).json({ error: "Failed to initialize guest sandbox" });
  }
};

// ----------------------------------------------------
// Current User & Logout
// ----------------------------------------------------

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await db.orm.public.User?.where({ id: userId }).first();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

export const logout = (_req: Request, res: Response) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  res.clearCookie("token", cookieOptions);
  res.clearCookie("jwt", cookieOptions);
  res.clearCookie("session", cookieOptions);

  res.json({
    status: "success",
    message: "Logged out successfully",
  });
};