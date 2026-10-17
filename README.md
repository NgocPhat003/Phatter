<div align="center">

# 🐦 Phatter

**A full-stack Twitter/X clone built with modern web technologies**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=flat&logo=socket.io)](https://socket.io)
[![Prisma](https://img.shields.io/badge/Prisma-8-2D3748?style=flat&logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-4169E1?style=flat&logo=postgresql&logoColor=white)](https://neon.tech)
[![Zustand](https://img.shields.io/badge/Zustand-5-orange?style=flat)](https://zustand-demo.pmnd.rs)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite)](https://vite.dev)
[![PNPM](https://img.shields.io/badge/pnpm-Workspaces-F69220?style=flat&logo=pnpm&logoColor=white)](https://pnpm.io)

[Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [API Reference](#-api-reference)

</div>

---

## ✨ Features

### 🔐 Security-First Authentication
- **Dual-Token System** — short-lived Access Tokens (15 min) + long-lived Refresh Tokens (7 days) stored in `HttpOnly` cookies to protect against XSS
- **Refresh Token Rotation (RTR)** — every `/refresh` call issues a brand-new token and invalidates the previous one
- **Replay Attack Detection** — reusing a rotated token triggers full session-family revocation across all devices
- **SHA-256 Token Hashing** — raw tokens are never stored in the database, only their hashes
- **Axios 401 Interceptor** with mutex lock — silently refreshes tokens in the background and retries queued requests

### 🌐 OAuth 2.0 Social Login
- **GitHub** and **Google** OAuth flows
- Auto-generated unique usernames for social accounts

### 🏠 Feeds & Posts
- **Global feed** (all posts) and **Following feed** (only followed users)
- Create posts with optional image uploads via **Cloudinary**
- Sort by newest or trending
- Auto-extract **#hashtags** on post creation

### 🏷️ Hashtag System
- Trending hashtags sidebar with post counts
- Dedicated hashtag pages (`/hashtags/:tag`) filtering posts by tag

### 💬 Real-Time Direct Messages
- WebSocket-powered chat via **Socket.io**
- Typing indicators, read receipts, and online presence indicators
- Unread message badge count

### 🔔 Notifications
- In-app notifications for: likes, comments, replies, and follows
- Real-time delivery via Socket.io
- Unread notification count badge

### 👥 Social Graph
- Follow / Unfollow users
- Follower & Following counts on profiles
- User directory

### 🔖 Bookmarks
- Save posts to your personal bookmark collection

### 💭 Comments & Replies
- Nested comment threads (replies to replies)

### 🖼️ Profiles
- Editable bio and profile picture
- Per-user post history

### 🎭 Guest Sandbox
- Try the app without signing up — no account required

---

## 🏗️ Architecture

```
Phatter/                        ← PNPM Monorepo
├── apps/
│   ├── client/                 ← React 19 + Vite (Frontend)
│   └── server/                 ← Express 5 + Socket.io (Backend API)
├── packages/
│   ├── db/                     ← Prisma 8 client + schema (shared)
│   └── validation/             ← Zod schemas (shared, used by both apps)
```

### Frontend (`apps/client`)
```
src/
├── features/           ← Feature-sliced architecture
│   ├── posts/
│   ├── messages/
│   ├── notifications/
│   ├── hashtags/
│   ├── follows/
│   ├── bookmarks/
│   └── users/
├── store/              ← Zustand global state
│   ├── useAuthStore.ts
│   ├── useNotificationStore.ts
│   └── usePostStore.ts
├── layouts/            ← MainLayout, sidebar, nav
├── routes/             ← Page-level route components
├── lib/                ← Axios instance with interceptor
└── hooks/              ← Custom React hooks
```

### Backend (`apps/server`)
```
src/modules/
├── auth/               ← Register, Login, OAuth, Refresh, Logout
├── posts/              ← CRUD, feed queries, hashtag extraction
├── comments/           ← Nested comment threads
├── likes/
├── bookmarks/
├── follows/
├── users/              ← Profile, directory
├── messages/           ← DM persistence
├── conversations/      ← Conversation list
├── notifications/      ← Fan-out on write
├── tags/               ← Hashtag trending
└── uploads/            ← Cloudinary integration
```

### Database Schema (PostgreSQL via NeonDB)

```
User ──< Post ──< Comment (self-referential, nested)
     ──< Like
     ──< Bookmark
     ──< DirectMessage (sender / receiver)
     ──< Notification (recipient / actor)
     ──< Follows (self-referential mesh)
     ──< RefreshToken   ← RTR sessions with family tracking
Post ──< PostTag >── Tag
```

---

## 🛡️ Auth Flow

```
                    ┌─────────────────────────────────────────┐
                    │           Browser (HttpOnly Cookies)    │
                    │  accessToken (15min)  refreshToken (7d) │
                    └────────────────┬────────────────────────┘
                                     │
          ┌──────── 200 OK ──────────┤ ─── 401 ───────────────────────┐
          │                          │                                 │
    Protected Route            Express API               POST /api/auth/refresh
          │                          │                        │
          │                    auth.middleware           Verify hash(RT)
          │                    verifies AT JWT           Issue new AT + RT
          │                                              Rotate token family
          └──────────────────────────┴─────────────────────────────────┘
```

**Replay Attack Protection:** If a stolen/rotated token is replayed, the entire token family (all sessions) is revoked immediately.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v20+
- [pnpm](https://pnpm.io) v9+ (`npm install -g pnpm`)
- A [NeonDB](https://neon.tech) PostgreSQL database (free tier works)
- A [Cloudinary](https://cloudinary.com) account for image uploads (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/NgocPhat003/Phatter.git
cd Phatter
pnpm install
```

### 2. Configure Environment Variables

Copy the example env files and fill in your credentials:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/client/.env.example apps/client/.env
```

**`apps/server/.env`**

```env
# Database
DATABASE_URL="postgresql://user:password@your-neon-host/phatter?sslmode=require"

# JWT Secrets (use long random strings — e.g. openssl rand -base64 64)
ACCESS_TOKEN_SECRET="your-access-token-secret"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"
ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# OAuth — GitHub
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3000/api/auth/github/callback"

# OAuth — Google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# App
CLIENT_URL="http://localhost:5173"
PORT=3000
```

**`apps/client/.env`**

```env
VITE_SERVER_URL="http://localhost:3000"
```

### 3. Push the Database Schema

```bash
pnpm --filter phatter-db exec prisma db push
```

### 4. Run the Development Server

```bash
pnpm dev
```

This starts both the client (`http://localhost:5173`) and server (`http://localhost:3000`) in parallel.

---

## 📡 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Create a new account | — |
| `POST` | `/api/auth/login` | Login with email + password | — |
| `POST` | `/api/auth/refresh` | Rotate refresh token, issue new access token | RT cookie |
| `POST` | `/api/auth/logout` | Revoke session | AT |
| `GET` | `/api/auth/github` | Start GitHub OAuth flow | — |
| `GET` | `/api/auth/google` | Start Google OAuth flow | — |
| `GET` | `/api/posts` | Get global feed | AT |
| `POST` | `/api/posts` | Create a post | AT |
| `GET` | `/api/posts/following` | Get following feed | AT |
| `GET` | `/api/posts/:id/comments` | Get comments for a post | AT |
| `POST` | `/api/comments` | Add a comment or reply | AT |
| `POST` | `/api/likes` | Like / unlike a post | AT |
| `GET` | `/api/bookmarks` | Get bookmarked posts | AT |
| `POST` | `/api/bookmarks` | Bookmark / unbookmark a post | AT |
| `GET` | `/api/users/:username` | Get user profile | AT |
| `POST` | `/api/follows` | Follow / unfollow a user | AT |
| `GET` | `/api/tags/trending` | Get trending hashtags | AT |
| `GET` | `/api/messages/:partnerUsername` | Get DM history | AT |
| `GET` | `/api/notifications` | Get notifications | AT |
| `POST` | `/api/uploads/image` | Upload image to Cloudinary | AT |

*AT = Access Token (via cookie) · RT = Refresh Token (via cookie)*

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 19 |
| **Build Tool** | Vite 8 |
| **Language** | TypeScript 5+ |
| **Routing** | React Router v7 |
| **State Management** | Zustand 5 |
| **Styling** | CSS Modules |
| **HTTP Client** | Axios (with interceptor) |
| **Real-time** | Socket.io Client 4 |
| **Icons** | Lucide React |
| **Backend Framework** | Express 5 |
| **Runtime** | Node.js 20+ |
| **ORM** | Prisma 8 |
| **Database** | PostgreSQL (NeonDB serverless) |
| **Auth** | JWT (`jsonwebtoken`), bcryptjs |
| **File Uploads** | Multer + Cloudinary |
| **Real-time** | Socket.io 4 |
| **Monorepo** | PNPM Workspaces |
| **Validation** | Zod (shared package) |

---

## 📁 Project Structure

```
Phatter/
├── apps/
│   ├── client/                 # React frontend
│   │   ├── src/
│   │   │   ├── features/       # Domain-driven feature modules
│   │   │   ├── store/          # Zustand stores
│   │   │   ├── layouts/        # Shell components
│   │   │   ├── routes/         # Page components
│   │   │   ├── lib/            # Axios, socket setup
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── types/          # Shared TS types
│   │   └── vite.config.ts
│   └── server/
│       └── src/
│           ├── modules/        # Feature-based API modules
│           └── shared/         # Middleware, utils, config
├── packages/
│   ├── db/                     # Prisma schema + client
│   └── validation/             # Zod schemas (shared)
├── pnpm-workspace.yaml
└── package.json
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 👤 Author

**NgocPhat003** · [GitHub](https://github.com/NgocPhat003)

---

<div align="center">
  <sub>Built with ❤️ as a portfolio project</sub>
</div>

