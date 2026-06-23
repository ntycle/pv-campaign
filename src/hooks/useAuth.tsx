"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { getUserProfile, upsertUserProfile } from "@/lib/firestore";
import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import type { AppUser, UserProfile, TeamId } from "@/types";

interface AuthCtx {
  user: AppUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  /** Returns true nếu user có thể edit workspace của teamId đó */
  canEdit: (teamId: TeamId) => boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [authError, setAuthError]     = useState<string | null>(null);

  useEffect(() => {
    if (!auth) return;
    let profileUnsub: Unsubscribe | undefined;

    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        const appUser: AppUser = {
          uid:         fbUser.uid,
          displayName: fbUser.displayName,
          email:       fbUser.email,
          photoURL:    fbUser.photoURL,
        };
        setUser(appUser);

        // Listen to profile changes
        profileUnsub = onSnapshot(doc(db, "users", fbUser.uid), async (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            // First login: create a default profile (teamId = null → triggers TeamSetupModal)
            const newProfile: UserProfile = {
              uid:         fbUser.uid,
              displayName: fbUser.displayName,
              email:       fbUser.email,
              photoURL:    fbUser.photoURL,
              teamId:      null,
              role:        "team_member",
              allowedTabs: [],
            };
            await upsertUserProfile(newProfile);
            setUserProfile(newProfile);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        if (profileUnsub) profileUnsub();
        setLoading(false);
      }
    });
    return () => {
      unsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const msg  = (err as { message?: string }).message ?? "Unknown error";
      console.error("[Auth] signInWithPopup error:", code, msg);

      if (code === "auth/popup-closed-by-user") {
        setAuthError("Bạn đã đóng popup đăng nhập. Vui lòng thử lại.");
      } else if (code === "auth/popup-blocked") {
        setAuthError("Trình duyệt đang chặn popup. Vui lòng cho phép popup và thử lại.");
      } else if (code === "auth/unauthorized-domain") {
        setAuthError(
          `Domain "${window.location.hostname}" chưa được thêm vào Authorized Domains trên Firebase Console.`
        );
      } else if (code === "auth/cancelled-popup-request") {
        // Ignore
      } else {
        setAuthError(`Lỗi đăng nhập (${code}): ${msg}`);
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user || !userProfile) return;
    const updated = { ...userProfile, ...data };
    await upsertUserProfile(updated);
    setUserProfile(updated);
  };

  const canEdit = (teamId: TeamId): boolean => {
    if (!userProfile) return false;
    if (userProfile.role === "campaign_lead") return true;   // Campaign lead có thể edit tất cả
    if (userProfile.role === "viewer") return false;
    return userProfile.teamId === teamId;                    // team_member chỉ edit team mình
  };

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, authError,
      signInWithGoogle, signOut, updateProfile, canEdit,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
