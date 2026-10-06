export interface Author {
  id: string;
  username: string;
  profilePictureUrl: string | null;
  isGuestSandbox: boolean;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author | null;
  parentId?: string | null;
  replyToUsername?: string | null;
  replies?: Comment[];
}

export interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: Author | null;
  engagement: {
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    isBookmarked?: boolean;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  bio: string | null;
  profilePictureUrl: string | null;
  isGuestSandbox: boolean;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface DirectoryUser {
  id: string;
  username: string;
  profilePictureUrl: string | null;
  bio: string | null;
  isGuestSandbox: boolean;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface CurrentUser {
  id?: string;
  username: string;
  email?: string;
  profilePictureUrl?: string | null;
  bio?: string | null;
  isGuestSandbox?: boolean;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  isSelf?: boolean;
}

export interface Conversation {
  partner: {
    id: string;
    username: string;
    profilePictureUrl: string | null;
    isGuestSandbox: boolean;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    isSelf: boolean;
  };
  unreadCount: number;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string;
  type: "like" | "comment" | "reply" | "follow";
  postId?: string | null;
  commentId?: string | null;
  content?: string | null;
  postSnippet?: string | null;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    profilePictureUrl: string | null;
    isGuestSandbox: boolean;
  } | null;
}