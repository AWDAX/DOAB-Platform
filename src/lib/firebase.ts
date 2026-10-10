/**
 * Firebase Client SDK Initialization & Helpers for DOAB Platform
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const isValidConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'undefined' &&
  firebaseConfig.apiKey.length > 5
);

// Initialize Firebase only once if config is valid
export const app = isValidConfig
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null;

// Firebase Auth Service
export const auth = app ? getAuth(app) : null;

// Fallback Mock Demo User (Zero-Config Hackathon / Evaluation Mode)
const DEMO_USER_KEY = 'doab_demo_user_v1';

export function getStoredDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Universal Auth Listener (supports real Firebase + Offline Demo fallback)
export function onDOABAuthStateChanged(callback: (user: any) => void) {
  if (auth) {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        callback(firebaseUser);
      } else {
        callback(getStoredDemoUser());
      }
    });
    return unsub;
  }

  // Fallback listener for offline demo state
  const handleStorageOrCustom = () => {
    callback(getStoredDemoUser());
  };

  callback(getStoredDemoUser());
  window.addEventListener('storage', handleStorageOrCustom);
  window.addEventListener('doab_auth_changed', handleStorageOrCustom);

  return () => {
    window.removeEventListener('storage', handleStorageOrCustom);
    window.removeEventListener('doab_auth_changed', handleStorageOrCustom);
  };
}

// Sign in with Google Popup (Graceful fallback to demo profile if Firebase unconfigured)
export async function signInWithGoogle(loginHint = null) {
  if (!auth) {
    const demoUser = {
      uid: 'doab-operator-01',
      displayName: 'Suneet Chugh',
      email: 'suneet.chugh@doab.gov.in',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      emailVerified: true,
      lastLogin: new Date().toISOString()
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    localStorage.setItem('doab_last_login', new Date().toISOString());
    window.dispatchEvent(new Event('doab_auth_changed'));
    return {
      user: demoUser,
      token: 'demo-jwt-token',
      error: null
    };
  }

  try {
    const provider = new GoogleAuthProvider();
    if (loginHint) {
      provider.setCustomParameters({ login_hint: loginHint });
    } else {
      provider.setCustomParameters({ prompt: 'select_account' });
    }
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    return {
      user: result.user,
      token,
      error: null,
    };
  } catch (error: any) {
    console.error('Firebase Google Sign-In Error:', error);
    return {
      user: null,
      token: null,
      error: error.message || 'An error occurred during sign in.',
      code: error.code,
    };
  }
}

// Sign in with Email & Password
export async function signInWithFirebaseEmail(email: string, password: string) {
  if (!auth) {
    const demoUser = {
      uid: 'doab-operator-email',
      displayName: email.split('@')[0] || 'Civic Operator',
      email: email,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=0C4A6E&color=fff`,
      emailVerified: true,
      lastLogin: new Date().toISOString()
    };
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    localStorage.setItem('doab_last_login', new Date().toISOString());
    window.dispatchEvent(new Event('doab_auth_changed'));
    return {
      user: demoUser,
      token: 'demo-jwt-token',
      error: null
    };
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    return {
      user: result.user,
      token,
      error: null,
    };
  } catch (error: any) {
    console.error('Firebase Email Sign-In Error:', error);
    return {
      user: null,
      token: null,
      error: error.message || 'Invalid credentials.',
    };
  }
}

// Sign Out
export async function firebaseSignOut() {
  localStorage.removeItem(DEMO_USER_KEY);
  window.dispatchEvent(new Event('doab_auth_changed'));
  
  if (auth) {
    try {
      await signOut(auth);
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Firebase Sign-Out Error:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: true, error: null };
}

export default app;
