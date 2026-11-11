import { Temporal } from "@js-temporal/polyfill";
(globalThis as any).Temporal = Temporal;
import http from "http";
import { app } from "./app.js";
import { setupSocketServer } from "./modules/messages/messages.socket.js";
import { initMessagesTable } from "./modules/messages/messages.db.js";
import { initBookmarksTable } from "./modules/bookmarks/bookmarks.controller.js";
import { initNotificationsTable } from "./modules/notifications/notifications.db.js";
import { env } from "./shared/config/env.js";

const PORT = env.PORT;

// Create HTTP server for both Express and Socket.io
const httpServer = http.createServer(app);

// Setup Socket.io real-time engine
setupSocketServer(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`[Server]: Phatter API and Socket.io running on ${PORT}`);
  await initMessagesTable();
  await initBookmarksTable();
  await initNotificationsTable();
});
