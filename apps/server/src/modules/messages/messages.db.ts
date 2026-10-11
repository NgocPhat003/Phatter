import { db } from "phatter-db";

/**
 * Initializes the direct_messages table (handled by Prisma ORM contract).
 */
export const initMessagesTable = async () => {
  // Handled natively by Prisma ORM contract model DirectMessage
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
  const msg = await db.orm.public.DirectMessage?.create({
    id,
    senderId,
    receiverId,
    content,
    isRead: false,
  });

  return {
    id: msg.id,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    content: msg.content,
    createdAt: msg.createdAt,
    isRead: msg.isRead,
  };
};

/**
 * Fetches message history between two users in chronological order.
 */
export const fetchConversationMessages = async (
  userA: string,
  userB: string
): Promise<MessageRecord[]> => {
  const sent = (await db.orm.public.DirectMessage?.where({ senderId: userA, receiverId: userB }).all()) || [];
  const received = (await db.orm.public.DirectMessage?.where({ senderId: userB, receiverId: userA }).all()) || [];
  const combined = [...sent, ...received];

  combined.sort(
    (a: any, b: any) => new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime()
  );

  return combined.slice(-100).map((m: any) => ({
    id: m.id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    content: m.content,
    createdAt: String(m.createdAt),
    isRead: m.isRead,
  }));
};

/**
 * Fetches the list of active conversations for a user, including the last message and unread count.
 */
export const fetchUserConversations = async (userId: string) => {
  const sent = (await db.orm.public.DirectMessage?.where({ senderId: userId }).all()) || [];
  const received = (await db.orm.public.DirectMessage?.where({ receiverId: userId }).all()) || [];
  const all = [...sent, ...received];

  // Group by partnerId
  const convMap = new Map<string, any[]>();
  for (const m of all) {
    const partnerId = String(m.senderId) === String(userId) ? m.receiverId : m.senderId;
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, []);
    }
    convMap.get(partnerId)!.push(m);
  }

  const convList: any[] = [];
  for (const [partnerId, msgs] of convMap.entries()) {
    msgs.sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
    const last = msgs[0];
    const unreadCount = msgs.filter((m) => String(m.receiverId) === String(userId) && !m.isRead).length;

    convList.push({
      lastMessageId: last.id,
      partnerId,
      lastSenderId: last.senderId,
      lastMessageContent: last.content,
      lastMessageAt: String(last.createdAt),
      unreadCount,
    });
  }

  convList.sort((a, b) => new Date(String(b.lastMessageAt)).getTime() - new Date(String(a.lastMessageAt)).getTime());
  return convList;
};

/**
 * Marks all incoming messages from a specific sender as read.
 */
export const markConversationRead = async (receiverId: string, senderId: string) => {
  const unread = (await db.orm.public.DirectMessage?.where({ receiverId, senderId, isRead: false }).all()) || [];
  await Promise.all(
    unread.map(async (m: any) => {
      await db.orm.public.DirectMessage?.where({ id: m.id }).update({ isRead: true });
    })
  );
};
