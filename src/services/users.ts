import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import type { AppUser, Role, UserStatus } from "@/types/domain";

interface ProfileInput {
  displayName: string;
  region?: string;
  phone?: string;
  language?: string;
  interests?: string[];
}

/**
 * Create the Firestore profile for a freshly registered user.
 * Every account is created as an active `patient_public`; elevated roles
 * (`admin`/`super_admin`) are granted only via trusted Admin-SDK tooling, and
 * "pages" (facility/partner/donor) are separate {@link Organization} documents.
 */
export async function createUserProfile(user: User, input: ProfileInput): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: input.displayName || user.displayName || "",
    photoURL: user.photoURL ?? null,
    role: "patient_public" satisfies Role,
    status: "active" satisfies UserStatus,
    region: input.region ?? "",
    phone: input.phone ?? "",
    language: input.language ?? "fr",
    interests: input.interests ?? [],
    createdAt: serverTimestamp(),
  });
}

/** Read a user profile, returning a typed AppUser (or a sensible fallback). */
export async function fetchUserProfile(user: User): Promise<AppUser> {
  const fallback: AppUser = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: "patient_public",
    status: "active",
  };
  if (!db) return fallback;

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    // First Google sign-in without a profile yet — create a default patient one.
    await createUserProfile(user, {
      displayName: user.displayName ?? "",
    });
    return fallback;
  }

  const data = snap.data();
  return {
    uid: user.uid,
    email: user.email,
    displayName: data.displayName ?? user.displayName,
    photoURL: data.photoURL ?? user.photoURL,
    role: (data.role as Role) ?? "patient_public",
    status: (data.status as UserStatus) ?? "active",
    region: data.region,
    phone: data.phone as string | undefined,
    language: data.language as string | undefined,
    interests: data.interests ?? [],
  };
}

/* --- Admin operations (gated by Firestore rules) --- */

/**
 * User profiles — admin/super_admin only (rules enforce this).
 * Capped at the most recent {@link MAX_USERS} to bound Firestore reads; add
 * cursor paging when the admin console needs to walk beyond them.
 */
const MAX_USERS = 200;
export async function fetchAllUsers(): Promise<AppUser[]> {
  if (!db) return [];
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(MAX_USERS));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: (data.email as string) ?? null,
      displayName: (data.displayName as string) ?? null,
      photoURL: (data.photoURL as string | null) ?? null,
      role: (data.role as Role) ?? "patient_public",
      status: (data.status as UserStatus) ?? "active",
      region: data.region as string | undefined,
      interests: (data.interests as string[]) ?? [],
    };
  });
}

/** Suspend / reactivate an account (admin). */
export async function setUserStatus(uid: string, status: UserStatus): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, "users", uid), { status, updatedAt: serverTimestamp() });
}

/** Grant / revoke the admin role (super_admin only — rules enforce this). */
export async function setUserRole(uid: string, role: Role): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() });
}
