import type { Request, Response } from "express";
import { db } from "phatter-db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { verifyRefreshToken, hashToken } from "../../shared/utils/jwt.util.js";
import { issueTokens, clearTokenCookies } from "../../shared/utils/tokens.util.js";
import { jwtConfig } from "../../shared/config/jwt.config.js";
import { RegisterSchema, LoginSchema } from "@project-phatter/validation";

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
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues?.[0]?.message || "Invalid registration data";
      return res.status(400).json({ error: errorMessage });
    }

    const { username: cleanUsername, email: cleanEmail, password, bio } = parseResult.data;

    const existingUsername = await db.orm.public.User?.where({ username: cleanUsername }).first();
    if (existingUsername) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const existingEmail = await db.orm.public.User?.where({ email: cleanEmail }).first();
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${crypto.randomBytes(10).toString("hex")}`;

    const newUser = await db.orm.public.User?.create({
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      bio: bio ? bio.trim() : null,
      isGuestSandbox: false,
    });

    if (!newUser) {
      return res.status(500).json({ error: "Failed to create account" });
    }

    // ✅ DUAL-TOKEN: Issue both access + refresh tokens (instead of single session JWT)
    await issueTokens(res, { userId: newUser.id, isGuestSandbox: false });

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
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues?.[0]?.message || "Invalid credentials format";
      return res.status(400).json({ error: errorMessage });
    }

    const { identifier: clean, password } = parseResult.data;

    let user = await db.orm.public.User?.where({ username: clean }).first();
    if (!user) {
      user = await db.orm.public.User?.where({ email: clean }).first();
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    if (user.passwordHash) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username/email or password" });
      }
    } else {
      const newHash = await bcrypt.hash(password, 10);
      await db.orm.public.User?.where({ id: user.id }).update({ passwordHash: newHash });
    }

    // ✅ DUAL-TOKEN: Issue both access + refresh tokens
    await issueTokens(res, { userId: user.id, isGuestSandbox: user.isGuestSandbox });

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
// 🔑 REFRESH TOKEN — The Heart of Dual-Token Auth
// ----------------------------------------------------
/**
 * HOW REFRESH TOKEN ROTATION WORKS (Interview-ready explanation):
 *
 * 1. Client sends the refresh_token cookie (set at login, scoped to this path only)
 * 2. We verify its JWT signature
 * 3. We look up its SHA-256 hash in the DB
 *    - Not found → token was already used (REUSE DETECTED!) → revoke entire family → force re-login
 *    - Expired → normal expiry → ask user to log in again
 *    - Found → proceed
 * 4. DELETE the old DB record (invalidating the just-used refresh token)
 * 5. Issue a NEW access token + NEW refresh token (Rotation!)
 *    - New refresh token inherits the same `family` ID
 * 6. Save the new refresh token hash to DB
 *
 * REUSE DETECTION:
 * If an attacker steals refresh token A and user refreshes first (getting token B),
 * the attacker's later attempt to use token A is caught:
 * - Token A's hash is gone from DB (deleted in step 4)
 * - We see an unrecognized hash → we know token A was from this family
 * - We delete ALL tokens in the family → both attacker and user must re-login
 */
export const refreshToken = async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies?.[jwtConfig.refreshCookieName];

  if (!incomingRefreshToken) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  try {
    // Step 1: Verify JWT signature + expiry
    const payload = verifyRefreshToken(incomingRefreshToken);

    // Step 2: Hash the incoming token and look it up in the DB
    const tokenHash = hashToken(incomingRefreshToken);
    const storedToken = await db.orm.public.RefreshToken?.where({ tokenHash }).first();

    if (!storedToken) {
      /**
       * 🚨 TOKEN REUSE DETECTED!
       * This hash is not in the DB, meaning this token was already used (deleted during rotation).
       * An attacker may have stolen it. Revoke ALL tokens for this user to be safe.
       */
      console.warn(`[Security] Refresh token reuse detected for user ${payload.userId}. Revoking all sessions.`);

      try {
        const allSessions = (await db.orm.public?.RefreshToken?.where({ userId: payload.userId }).all()) || [];
        await Promise.all(
          allSessions.map((s: any) => db.orm.public?.RefreshToken?.where({ id: s.id }).delete())
        );
      } catch (err) {
        console.error("Failed to revoke session family:", err);
      }

      clearTokenCookies(res);
      return res.status(401).json({ error: "Session compromised. Please log in again." });
    }

    // Step 3: Check if token is expired in DB (belt-and-suspenders on top of JWT expiry)
    const expiresAtMs =
      (storedToken.expiresAt as any)?.epochMilliseconds ??
      new Date(storedToken.expiresAt as any).getTime();
    if (Date.now() > expiresAtMs) {
      await db.orm.public?.RefreshToken?.where({ id: storedToken.id }).delete();
      clearTokenCookies(res);
      return res.status(401).json({ error: "Refresh token expired. Please log in again." });
    }

    // Step 4: Delete the old refresh token (it must NEVER be usable again)
    const family = storedToken.family;
    await db.orm.public?.RefreshToken?.where({ id: storedToken.id }).delete();

    // Step 5: Issue fresh access + refresh tokens, passing the same family for rotation tracking
    await issueTokens(
      res,
      { userId: payload.userId, isGuestSandbox: payload.isGuestSandbox },
      family  // 👈 Keeps the rotation chain in the same family for reuse detection
    );

    return res.json({ status: "success", message: "Tokens refreshed" });
  } catch (error: any) {
    // JWT signature invalid or expired
    clearTokenCookies(res);
    return res.status(401).json({ error: "Invalid refresh token. Please log in again." });
  }
};

// ----------------------------------------------------
// GitHub OAuth
// ----------------------------------------------------

export const initiateGithubAuth = (_req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

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

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(`${clientOrigin}/?auth_error=Failed to retrieve GitHub access token`);
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Phatter-App" },
    });
    const githubUser = await userRes.json();

    let email = githubUser.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Phatter-App" },
      });
      const emails = await emailsRes.json();
      const primary = emails.find((e: any) => e.primary && e.verified);
      email = primary ? primary.email : `${githubUser.login}@users.noreply.github.com`;
    }

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

    // ✅ DUAL-TOKEN
    await issueTokens(res, { userId: user.id, isGuestSandbox: false });
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
      return res.redirect(`${clientOrigin}/?auth_error=Failed to retrieve Google token`);
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();
    const email = googleUser.email.toLowerCase();

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

    // ✅ DUAL-TOKEN
    await issueTokens(res, { userId: user.id, isGuestSandbox: false });
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

    // ✅ DUAL-TOKEN
    await issueTokens(res, { userId: user.id, isGuestSandbox: false });
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

    // ✅ DUAL-TOKEN
    await issueTokens(res, { userId: newUser.id, isGuestSandbox: newUser.isGuestSandbox });

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

export const logout = async (req: Request, res: Response) => {
  try {
    // Revoke the refresh token from DB so it can't be used even if someone still has the cookie
    const incomingRefreshToken = req.cookies?.[jwtConfig.refreshCookieName];
    if (incomingRefreshToken) {
      const tokenHash = hashToken(incomingRefreshToken);
      const tokenRecord = await db.orm.public?.RefreshToken?.where({ tokenHash }).first();
      if (tokenRecord) {
        await db.orm.public?.RefreshToken?.where({ id: tokenRecord.id }).delete();
      }
    }
  } catch {
    // Don't block logout even if DB delete fails
  }

  clearTokenCookies(res);

  res.json({
    status: "success",
    message: "Logged out successfully",
  });
};