import { doc, serverTimestamp, updateDoc } from "@/services/db";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { auth, db, storage } from "./firebase";
import { apiUpload } from "./apiClient";
import { usesD1 } from "./dbRouting";

/**
 * Self-service profile edits. Only fields a user is allowed to change —
 * NOT role/status (Firestore rules forbid that for owners).
 */
export interface ProfilePatch {
  displayName?: string;
  region?: string;
  interests?: string[];
  photoURL?: string | null;
  phone?: string;
  smsConsent?: boolean;
  whatsappConsent?: boolean;
}

export async function updateOwnProfile(uid: string, patch: ProfilePatch): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, "users", uid), { ...patch, updatedAt: serverTimestamp() });
  // Keep the Firebase Auth record in sync (used by Google/avatar fallbacks).
  if (auth?.currentUser && (patch.displayName !== undefined || patch.photoURL !== undefined)) {
    await updateProfile(auth.currentUser, {
      displayName: patch.displayName ?? auth.currentUser.displayName ?? undefined,
      photoURL: patch.photoURL ?? auth.currentUser.photoURL ?? undefined,
    });
  }
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Upload an avatar to `users/{uid}/avatar/...` and return its public URL.
 * Validates type/size client-side (Storage rules enforce it server-side too).
 */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Le fichier doit être une image.");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("L'image ne doit pas dépasser 5 Mo.");

  // R2 via le Worker : les contrôles (propriété, type, taille) que faisait
  // `storage.rules` sont désormais appliqués côté serveur, et la clé d'objet
  // reste identique à l'ancien chemin Storage.
  if (usesD1("storage")) {
    const { url } = await apiUpload<{ url: string }>("/api/v1/uploads/avatar", file);
    return url;
  }

  if (!storage) throw new Error("Firebase non configuré.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const objectRef = ref(storage, `users/${uid}/avatar/photo.${ext}`);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}
