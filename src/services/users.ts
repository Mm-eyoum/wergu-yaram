import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import type { AppUser, Role, UserStatus } from "@/types/domain";

/** Patients are active immediately; structures/partners require validation. */
export function defaultStatusForRole(role: Role): UserStatus {
  return role === "patient_public" ? "active" : "pending";
}

interface ProfileInput {
  role: Role;
  displayName: string;
  region?: string;
  interests?: string[];
}

/** Create the Firestore profile document for a freshly registered user. */
export async function createUserProfile(user: User, input: ProfileInput): Promise<void> {
  if (!db) return;
  const status = defaultStatusForRole(input.role);
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: input.displayName || user.displayName || "",
    photoURL: user.photoURL ?? null,
    role: input.role,
    status,
    region: input.region ?? "",
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
      role: "patient_public",
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
    interests: data.interests ?? [],
  };
}
