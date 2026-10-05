import { pool } from "../../shared/db/pg.js";
export { pool };

/**
 * Initializes the direct_messages table if it does not already exist.
 */
export const initMessagesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id VARCHAR(64) PRIMARY KEY,
        sender_id VARCHAR(64) NOT NULL,
        receiver_id VARCHAR(64) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dm_participants ON direct_messages(sender_id, receiver_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dm_created_at ON direct_messages(created_at DESC);`);
    console.log("[Messages DB]: direct_messages table ready.");
  } catch (error) {
    console.error("[Messages DB Init Error]:", error);
  }
};

export interface MessageRecord {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

/**
 * Persists a new message into the database.
 */
export const insertMessage = async (
  id: string,
  senderId: string,
  receiverId: string,
  content: string
): Promise<MessageRecord> => {
  const result = await pool.query(
    `
    INSERT INTO direct_messages (id, sender_id, receiver_id, content, created_at, is_read)
    VALUES ($1, $2, $3, $4, NOW(), FALSE)
    RETURNING id, sender_id AS "senderId", receiver_id AS "receiverId", content, created_at AS "createdAt", is_read AS "isRead"
    `,
    [id, senderId, receiverId, content]
  );
  return result.rows[0];
};

/**
 * Fetches message history between two users in chronological order.
 */
export const fetchConversationMessages = async (
  userA: string,
  userB: string
): Promise<MessageRecord[]> => {
  const result = await pool.query(
    `
    SELECT id, sender_id AS "senderId", receiver_id AS "receiverId", content, created_at AS "createdAt", is_read AS "isRead"
    FROM direct_messages
    WHERE (sender_id = $1 AND receiver_id = $2)
       OR (sender_id = $2 AND receiver_id = $1)
    ORDER BY created_at ASC
    LIMIT 100
    `,
    [userA, userB]
  );
  return result.rows;
};

/**
 * Fetches the list of active conversations for a user, including the last message and unread count.
 */
export const fetchUserConversations = async (userId: string) => {
  const result = await pool.query(
    `
    WITH user_messages AS (
      SELECT 
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        is_read,
        CASE 
          WHEN sender_id = $1 THEN receiver_id 
          ELSE sender_id 
        END AS partner_id
      FROM direct_messages
      WHERE sender_id = $1 OR receiver_id = $1
    ),
    ranked_messages AS (
      SELECT 
        *,
        ROW_NUMBER() OVER(PARTITION BY partner_id ORDER BY created_at DESC) as rn
      FROM user_messages
    )
    SELECT 
      rm.id AS "lastMessageId",
      rm.partner_id AS "partnerId",
      rm.sender_id AS "lastSenderId",
      rm.content AS "lastMessageContent",
      rm.created_at AS "lastMessageAt",
      (
        SELECT COUNT(*)::int 
        FROM direct_messages 
        WHERE receiver_id = $1 AND sender_id = rm.partner_id AND is_read = FALSE
      ) AS "unreadCount"
    FROM ranked_messages rm
    WHERE rm.rn = 1
    ORDER BY rm.created_at DESC;
    `,
    [userId]
  );
  return result.rows;
};

/**
 * Marks all incoming messages from a specific sender as read.
 */
export const markConversationRead = async (receiverId: string, senderId: string) => {
  await pool.query(
    `
    UPDATE direct_messages
    SET is_read = TRUE
    WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE
    `,
    [receiverId, senderId]
  );
};
