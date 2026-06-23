import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Guard: skip Firebase init during SSR prerender when env vars are missing
function getApp(): FirebaseApp {
  if (!firebaseConfig.apiKey) {
    // During SSR/prerender the env vars are not available – return a stub
    // that will never be actually used (all firebase calls are client-only).
    throw new Error(
      "Firebase env vars are not set. Make sure NEXT_PUBLIC_FIREBASE_* variables are configured."
    );
  }
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

const isBrowser = typeof window !== "undefined";

// Lazy singleton – only initialised in the browser
const app = isBrowser ? getApp() : (getApps()[0] ?? null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth          = isBrowser ? getAuth(app!)          : (null as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db            = isBrowser ? getFirestore(app!)     : (null as any);
export const googleProvider = new GoogleAuthProvider();

// Firestore collection refs (as strings for use with collection())
export const COLLECTIONS = {
  campaigns: "campaigns",
  content:   "content",
  bookings:  "bookings",
  kpis:      "kpis",
  resource_quotas: "resource_quotas",
  teams: "teams",
  resources: "resources",
  activity_logs: "activity_logs",
} as const;
