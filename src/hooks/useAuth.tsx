"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import type { AppUser } from "@/types";

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return; // guard: auth is null during SSR
    const unsub = onAuthStateChanged(auth, fbUser => {
      setUser(fbUser ? {
        uid:         fbUser.uid,
        displayName: fbUser.displayName,
        email:       fbUser.email,
        photoURL:    fbUser.photoURL,
      } : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const msg  = (err as { message?: string }).message ?? "Unknown error";
      console.error("[Auth] signInWithPopup error:", code, msg);

      // Map common Firebase error codes to friendly messages
      if (code === "auth/popup-closed-by-user") {
        setAuthError("Bạn đã đóng popup đăng nhập. Vui lòng thử lại.");
      } else if (code === "auth/popup-blocked") {
        setAuthError("Trình duyệt đang chặn popup. Vui lòng cho phép popup và thử lại.");
      } else if (code === "auth/unauthorized-domain") {
        setAuthError(
          `Domain "${window.location.hostname}" chưa được thêm vào Authorized Domains trên Firebase Console.`
        );
      } else if (code === "auth/cancelled-popup-request") {
        // Ignore — another popup was already pending
      } else {
        setAuthError(`Lỗi đăng nhập (${code}): ${msg}`);
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
