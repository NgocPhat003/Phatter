import { create } from "zustand";

interface PostState {
  activeFeed: "for-you" | "following";
  activeSort: "latest" | "popular" | "oldest";

  // Actions
  setActiveFeed: (feed: "for-you" | "following") => void;
  setActiveSort: (sort: "latest" | "popular" | "oldest") => void;
}

export const usePostStore = create<PostState>((set) => ({
  activeFeed: "for-you",
  activeSort: "latest",

  setActiveFeed: (feed) => set({ activeFeed: feed }),
  setActiveSort: (sort) => set({ activeSort: sort }),
}));

