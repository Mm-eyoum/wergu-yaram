import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/services/firebase";
import { createUserProfile, fetchUserProfile } from "@/services/users";
import type { AppUser } from "@/types/domain";
import { AuthContext, type AuthContextValue, type RegisterInput } from "./auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          setUser(await fetchUserProfile(fbUser));
        } catch {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            role: "patient_public",
            status: "active",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase non configuré.");
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    if (!auth) throw new Error("Firebase non configuré.");
    const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
    if (input.displayName) {
      await updateProfile(cred.user, { displayName: input.displayName });
    }
    await createUserProfile(cred.user, {
      displayName: input.displayName,
      region: input.region,
      interests: input.interests,
    });
    setUser(await fetchUserProfile(cred.user));
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Firebase non configuré.");
    await signInWithPopup(auth, googleProvider);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) throw new Error("Firebase non configuré.");
    await sendPasswordResetEmail(auth, email);
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth?.currentUser) return;
    setUser(await fetchUserProfile(auth.currentUser));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      login,
      register,
      loginWithGoogle,
      resetPassword,
      logout,
      refreshProfile,
    }),
    [user, loading, login, register, loginWithGoogle, resetPassword, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
