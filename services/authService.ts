
import { UserAccount, UserProfile, ComicStory } from "../types";

const AUTH_STORAGE_KEY = 'panel-pulse-user-auth';

const RANKS = ["Rookie Sketcher", "Panel Pro", "Ink Master", "Graphic Legend", "Omnipotent Author"];

export const authService = {
  getAccount: (): UserAccount | null => {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  createAccount: (username: string, avatar: string): UserAccount => {
    const newAccount: UserAccount = {
      profile: {
        username,
        avatar,
        rank: RANKS[0],
        joinDate: Date.now(),
        comicsCount: 0
      },
      savedComics: []
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAccount));
    return newAccount;
  },

  saveComicToAccount: (comic: ComicStory): UserAccount | null => {
    const account = authService.getAccount();
    if (!account) return null;

    const comicWithMeta = { ...comic, createdAt: Date.now() };
    account.savedComics.unshift(comicWithMeta);
    account.profile.comicsCount = account.savedComics.length;
    
    // Update Rank
    const rankIndex = Math.min(Math.floor(account.profile.comicsCount / 3), RANKS.length - 1);
    account.profile.rank = RANKS[rankIndex];

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account));
    return account;
  },

  deleteComicFromAccount: (timestamp: number): UserAccount | null => {
    const account = authService.getAccount();
    if (!account) return null;

    account.savedComics = account.savedComics.filter(c => c.createdAt !== timestamp);
    account.profile.comicsCount = account.savedComics.length;
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(account));
    return account;
  },

  logout: () => {
    // In a real app we'd clear session, here we just keep it simple
    // but we could clear localStorage if we wanted a true reset.
  }
};
