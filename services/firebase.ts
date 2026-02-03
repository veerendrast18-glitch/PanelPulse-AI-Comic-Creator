
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAkAUYjl1TN5sBGmC61Ny4IkpHl75aXS-w",
  authDomain: "panel-pulse-ai-comic-creator.firebaseapp.com",
  projectId: "panel-pulse-ai-comic-creator",
  storageBucket: "panel-pulse-ai-comic-creator.firebasestorage.app",
  messagingSenderId: "768885053036",
  appId: "1:768885053036:web:afcb76c8428ec129946a49"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
