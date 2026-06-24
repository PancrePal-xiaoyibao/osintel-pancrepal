import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Try to load configurations from config file or env fallback
import firebaseConfigLocal from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigLocal.apiKey || (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigLocal.authDomain || (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigLocal.projectId || (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigLocal.storageBucket || (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigLocal.messagingSenderId || (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigLocal.appId || (import.meta as any).env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase app safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };
