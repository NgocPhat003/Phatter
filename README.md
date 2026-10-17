<div align="center">

# 🐦 Phatter

**A full-stack Twitter/X clone built with modern web technologies**

### 🚀 [Live Demo Application](https://phatter-ngocphat003.vercel.app) · [📡 API Health Status](https://phatter-api.onrender.com/api/health)

[![Vercel](https://img.shields.io/badge/Vercel-Live%20App-black?style=for-the-badge&logo=vercel)](https://phatter-ngocphat003.vercel.app)
[![Render](https://img.shields.io/badge/Render-Live%20API-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://phatter-api.onrender.com)
[![Neon](https://img.shields.io/badge/NeonDB-Serverless%20Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech)

<br/>

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=flat&logo=socket.io)](https://socket.io)
[![Prisma](https://img.shields.io/badge/Prisma-8-2D3748?style=flat&logo=prisma)](https://www.prisma.io)
[![Zod](https://img.shields.io/badge/Zod-4-3068b7?style=flat&logo=zod&logoColor=white)](https://zod.dev)
[![React Hook Form](https://img.shields.io/badge/React%20Hook%20Form-7-EC5990?style=flat&logo=reacthookform&logoColor=white)](https://react-hook-form.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-orange?style=flat)](https://zustand-demo.pmnd.rs)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite)](https://vite.dev)
[![PNPM](https://img.shields.io/badge/pnpm-Workspaces-F69220?style=flat&logo=pnpm&logoColor=white)](https://pnpm.io)

[Live Demo](#-live-demo--demo-accounts) · [Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [API Reference](#-api-reference)

</div>

---

## 🌐 Live Demo & Demo Accounts

The full-stack application is live and hosted with automatic CI/CD:
- **Client (Frontend)**: [https://phatter-ngocphat003.vercel.app](https://phatter-ngocphat003.vercel.app)
- **Server (Backend API)**: [https://phatter-api.onrender.com](https://phatter-api.onrender.com)

### Quick Test Credentials
You can test the application instantly with the **Guest Sandbox** (no account required) or with pre-seeded demo accounts:

| Username | Email | Password | Role |
|---|---|---|---|
| `sarah_dev` | `sarah@phatter.com` | `password123` | Software Engineer |
| `alexchen` | `alex@phatter.com` | `password123` | Full-stack Dev |
| `elena_ai` | `elena@phatter.com` | `password123` | AI Researcher |
| `marcus_b` | `marcus@phatter.com` | `password123` | Product Designer |
| *Guest Sandbox* | *N/A* | *N/A* | Instant Sandbox (One-Click) |

*(Note: Free-tier Render web services spin down after inactivity. If the first request takes ~30s, the instance is waking up).*

---

## ✨ Features

### 🛡️ End-to-End Type Safety & Shared Validation
- **Isomorphic Shared Package (`@project-phatter/validation`)** — single source of truth for domain schemas consumed by both frontend forms and backend controllers
- **Separation of Wire Schemas vs. Form DTOs** — client forms extend core schemas (e.g., adding `confirmPassword` equality checks) while sending clean, stripped payloads to the API
- **High-Performance Form Management** — powered by **React Hook Form** with `@hookform/resolvers/zod`, eliminating keystroke re-renders via uncontrolled inputs and native DOM refs
- **Fail-Fast Server Environment Validation** — the Express server parses all environment variables on boot via Zod, halting immediately with clear diagnostics if configurations are missing or weak
- **Standardized Error Formatting** — centralized Express error middleware translates `ZodError` issues into structured `{ status, message, errors: [{ field, message }] }` responses

### 🔐 Security-First Authentication
- **Dual-Token System** — short-lived Access Tokens (15 min) + long-lived Refresh Tokens (7 days) stored in `HttpOnly` cookies to protect against XSS
- **Refresh Token Rotation (RTR)** — every `/refresh` call issues a brand-new token and invalidates the previous one
- **Replay Attack Detection** — reusing a rotated token triggers full session-family revocation across all devices
- **SHA-256 Token Hashing** — raw tokens are never stored in the database, only their hashes
- **Axios 401 Interceptor** with mutex lock — silently refreshes tokens in the background and retries queued requests
- **Cross-Domain Cookie Support** — configured with `sameSite: "none"` and `secure: true` to support decoupled deployments (Vercel ↔ Render)

### 🌐 OAuth 2.0 Social Login
- **GitHub** and **Google** OAuth flows with dynamic callback derivation
- Auto-generated unique usernames for social accounts
- Development Mock-OAuth bypass for rapid testing

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
│   ├── client/                 ← React 19 + Vite (Frontend, hosted on Vercel)
│   └── server/                 ← Express 5 + Socket.io (Backend API, hosted on Render)
├── packages/
│   ├── db/                     ← Prisma 8 client + schema (NeonDB PostgreSQL)
│   └── validation/             ← Isomorphic Zod domain schemas (shared)
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
├── routes/             ← Page-level route components (Login with React Hook Form)
├── lib/                ← Axios instance with interceptor, socket setup
└── hooks/              ← Custom React hooks
```

### Backend (`apps/server`)
```
src/
├── modules/            ← Feature-based API modules
│   ├── auth/           ← Register, Login, OAuth, Refresh, Logout
│   ├── posts/          ← CRUD, feed queries, hashtag extraction
│   ├── comments/       ← Nested comment threads
│   ├── likes/
│   ├── bookmarks/
│   ├── follows/
│   ├── users/          ← Profile, directory
│   ├── messages/       ← DM persistence & Socket.io engine
│   ├── conversations/  ← Conversation list
│   ├── notifications/  ← Fan-out on write
│   ├── tags/           ← Hashtag trending
│   └── uploads/        ← Cloudinary integration
└── shared/
    ├── config/         ← Fail-fast env.ts, jwt.config.ts, cloudinary.config.ts
    ├── errors/         ← toAppError.ts (ZodError to structured response)
    ├── middleware/     ← auth.middleware.ts, errorHandler.ts, validate.middleware.ts
    └── utils/          ← tokens.util.ts, jwt.util.ts
```

### Shared Validation Package (`packages/validation`)
```
packages/validation/src/
├── auth.ts             ← LoginSchema, RegisterSchema, RegisterFormSchema (confirmPassword)
├── posts.ts            ← CreatePostSchema, CreateCommentSchema
├── messages.ts         ← SendMessageSchema
├── users.ts            ← UserProfileSchema (Cloudinary URL regex check)
├── common.ts           ← PaginationQuerySchema, positiveIntFromString
└── index.ts            ← Public barrel export
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

## 🛡️ Auth & Validation Flow

```
   ┌─────────────────────────────────────────────────────────────┐
   │                 Vercel Client (React 19)                    │
   │  React Hook Form + zodResolver(RegisterFormSchema)          │
   │  (Instant client-side feedback + confirmPassword check)     │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ POST (clean payload only)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                 Render Server (Express 5)                   │
   │  env.ts (Fail-fast boot validation of secrets & DB URL)     │
   │  auth.controller -> RegisterSchema.safeParse(req.body)      │
   │  errorHandler -> formats ZodError into structured JSON      │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
          ┌──────── 200 OK ───────┤ ──── 401 ────────────────────┐
          ▼                       ▼                              ▼
    Protected Route       Cross-Domain Cookies        POST /api/auth/refresh
    (Access Token 15m)    sameSite: "none", secure    Verify hash(RT) & Rotate
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

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | React 19 | Feature-sliced architecture |
| **Build Tool** | Vite 8 | Fast HMR & bundling |
| **Language** | TypeScript 5+ | End-to-end strict typing |
| **Routing** | React Router v7 | URL-synced client routing with SPA rewrites |
| **Form Management** | React Hook Form 7 | High performance, zero keystroke re-renders |
| **State Management** | Zustand 5 | Auth, post, and notification stores |
| **Styling** | CSS Modules | Modular component styling |
| **HTTP Client** | Axios | Interceptor with mutex for silent token rotation |
| **Real-time** | Socket.io 4 | WebSockets for messaging & presence |
| **Icons** | Lucide React | Modern feather-based SVG icons |
| **Backend Framework** | Express 5 | REST API + centralized error handling |
| **Runtime** | Node.js 20+ | `tsx` TypeScript runtime |
| **ORM** | Prisma 8 | Neon PostgreSQL driver |
| **Database** | PostgreSQL | Hosted on NeonDB serverless |
| **Schema Validation** | Zod (`@project-phatter/validation`) | Shared isomorphic workspace package |
| **Auth** | JWT + bcryptjs | Dual-token with RTR & session family revocation |
| **File Uploads** | Multer + Cloudinary | Cloud image storage |
| **Monorepo** | PNPM Workspaces | Shared packages (`db`, `validation`) |
| **Frontend Deployment** | Vercel | Global Edge CDN with continuous deployment |
| **Backend Deployment** | Render | Managed Node web service with WebSocket support |

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
│   │   ├── vercel.json         # SPA route rewrites for Vercel
│   │   └── vite.config.ts
│   └── server/
│       └── src/
│           ├── modules/        # Feature-based API modules
│           └── shared/         # Config (env), errors, middleware, utils
├── packages/
│   ├── db/                     # Prisma schema + client
│   └── validation/             # Modular Zod schemas & form DTOs
├── render.yaml                 # Render Blueprint for backend deployment
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
