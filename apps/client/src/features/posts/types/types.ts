export interface Author {
  id: string;
  username: string;
  profilePictureUrl: string | null;
  isGuestSandbox: boolean;
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