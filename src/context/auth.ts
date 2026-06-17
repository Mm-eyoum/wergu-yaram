import { createContext } from "react";
import type { AppUser } from "@/types/domain";

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  region?: string;
  phone?: string;
  language?: string;
  interests?: string[];
}

export interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-read the signed-in user's profile from Firestore (after a self-edit). */
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
