
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { UserAccount, UserProfile, ComicStory } from "../types";

const AUTH_STORAGE_KEY = 'panel-pulse-user-auth';
const RANKS = ["Rookie Sketcher", "Panel Pro", "Ink Master", "Graphic Legend", "Omnipotent Author"];

export const authService = {
  subscribeToAuthChanges: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Firebase Login Error:", error);
      throw error;
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  // Map Firebase User to our internal UserAccount structure
  getAccountSync: (firebaseUser: User | null): UserAccount | null => {
    if (!firebaseUser) return null;
    
    // Check if we have additional profile data stored locally
    const storedData = localStorage.getItem(`${AUTH_STORAGE_KEY}_${firebaseUser.uid}`);
    if (storedData) return JSON.parse(storedData);

    // Initial default profile
    const newAccount: UserAccount = {
      profile: {
        username: firebaseUser.displayName || 'Anonymous Author',
        avatar: firebaseUser.photoURL || '👤',
        rank: RANKS[0],
        joinDate: Date.now(),
        comicsCount: 0
      },
      savedComics: []
    };
    
    localStorage.setItem(`${AUTH_STORAGE_KEY}_${firebaseUser.uid}`, JSON.stringify(newAccount));
    return newAccount;
  },

  saveComicToAccount: (comic: ComicStory): UserAccount | null => {
    const user = auth.currentUser;
    if (!user) return null;

    const account = authService.getAccountSync(user);
    if (!account) return null;

    const comicWithMeta = { ...comic, createdAt: Date.now() };
    account.savedComics.unshift(comicWithMeta);
    account.profile.comicsCount = account.savedComics.length;
    
    const rankIndex = Math.min(Math.floor(account.profile.comicsCount / 3), RANKS.length - 1);
    account.profile.rank = RANKS[rankIndex];

    localStorage.setItem(`${AUTH_STORAGE_KEY}_${user.uid}`, JSON.stringify(account));
    return account;
  },

  deleteComicFromAccount: (timestamp: number): UserAccount | null => {
    const user = auth.currentUser;
    if (!user) return null;

    const account = authService.getAccountSync(user);
    if (!account) return null;

    account.savedComics = account.savedComics.filter(c => c.createdAt !== timestamp);
    account.profile.comicsCount = account.savedComics.length;
    
    localStorage.setItem(`${AUTH_STORAGE_KEY}_${user.uid}`, JSON.stringify(account));
    return account;
  }
};
