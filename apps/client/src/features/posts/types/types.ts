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