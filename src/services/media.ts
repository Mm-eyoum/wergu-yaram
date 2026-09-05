import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from "@/services/db";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { apiDelete, apiUpload } from "./apiClient";
import { usesD1 } from "./dbRouting";
import { auth, db, storage } from "./firebase";

export type MediaCategory = "image" | "video" | "audio" | "document";

export interface MediaItem {
  id: string;
  filenameOriginal: string;
  storagePath: string;
  url: string;
  mimeType: string;
  category: MediaCategory;
  size: number;
  width?: number;
  height?: number;
  altText?: string;
  title?: string;
  caption?: string;
  folder?: string;
  uploadedBy: string;
  createdAt: number | null;
}

const MAX_BYTES = 25 * 1024 * 1024;

/** Map a MIME type to a coarse library category. */
export function categoryOf(mime: string): MediaCategory {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

/** Read natural dimensions of an image File (best-effort, browser only). */
function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || typeof window === "undefined") return resolve(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Upload one file to the CMS media library: Storage bytes + a Firestore index
 * doc. Validates type/size client-side (Storage rules enforce server-side too).
 */
export async function uploadMedia(file: File, folder?: string): Promise<MediaItem> {
  if (!storage || !db) throw new Error("Firebase non configuré.");
  const actor = auth?.currentUser;
  if (!actor) throw new Error("Vous devez être connecté.");

  const category = categoryOf(file.type);
  if (category === "document" && file.type !== "application/pdf")
    throw new Error("Type de fichier non autorisé.");
  if (file.size > MAX_BYTES) throw new Error("Le fichier ne doit pas dépasser 25 Mo.");

  // R2 via le Worker. Corrige au passage un bug d'orphelins : la séquence
  // actuelle (uploadBytes → getDownloadURL → setDoc) abandonne l'objet dans le
  // bucket si la dernière étape échoue. Côté serveur, l'objet est supprimé si
  // l'insertion en base échoue.
  if (usesD1("storage")) {
    const uploaded = await apiUpload<{
      id: string;
      url: string;
      storagePath: string;
      mimeType: string;
      size: number;
    }>(`/api/v1/uploads/media${folder ? `?folder=${encodeURIComponent(folder)}` : ""}`, file);
    const dims = await readImageSize(file);
    return {
      id: uploaded.id,
      filenameOriginal: file.name,
      storagePath: uploaded.storagePath,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      category,
      size: uploaded.size,
      ...(dims ? { width: dims.width, height: dims.height } : {}),
      folder,
      altText: "",
      title: "",
      caption: "",
      uploadedBy: actor.uid,
      createdAt: Date.now(),
    };
  }

  const docRef = doc(collection(db, "media"));
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const year = new Date().getFullYear();
  const storagePath = `media/${year}/${docRef.id}.${ext}`;
  const objectRef = ref(storage, storagePath);

  await uploadBytes(objectRef, file, { contentType: file.type });
  const url = await getDownloadURL(objectRef);
  const size = await readImageSize(file);

  const data = {
    filenameOriginal: file.name,
    storagePath,
    url,
    mimeType: file.type,
    category,
    size: file.size,
    ...(size ? { width: size.width, height: size.height } : {}),
    folder: folder ?? null,
    altText: "",
    title: "",
    caption: "",
    uploadedBy: actor.uid,
    createdAt: serverTimestamp(),
  };
  await setDoc(docRef, data);

  return {
    id: docRef.id,
    ...data,
    folder: folder ?? undefined,
    createdAt: Date.now(),
  } as MediaItem;
}

export interface ListMediaOptions {
  category?: MediaCategory;
  folder?: string;
  cursor?: number | null;
  pageSize?: number;
}

export interface MediaPage {
  items: MediaItem[];
  nextCursor: number | null;
}

/** List media, newest first, with simple cursor (createdAt millis) pagination. */
export async function listMedia(opts: ListMediaOptions = {}): Promise<MediaPage> {
  if (!db) return { items: [], nextCursor: null };
  const pageSize = opts.pageSize ?? 60;
  const constraints = [];
  if (opts.category) constraints.push(where("category", "==", opts.category));
  if (opts.folder) constraints.push(where("folder", "==", opts.folder));
  constraints.push(orderBy("createdAt", "desc"));
  if (opts.cursor) constraints.push(startAfter(Timestamp.fromMillis(opts.cursor)));
  constraints.push(fbLimit(pageSize));

  const snap = await getDocs(query(collection(db, "media"), ...constraints));
  const items: MediaItem[] = snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt as Timestamp | null;
    return {
      id: d.id,
      filenameOriginal: data.filenameOriginal as string,
      storagePath: data.storagePath as string,
      url: data.url as string,
      mimeType: data.mimeType as string,
      category: data.category as MediaCategory,
      size: data.size as number,
      width: data.width as number | undefined,
      height: data.height as number | undefined,
      altText: (data.altText as string) ?? "",
      title: (data.title as string) ?? "",
      caption: (data.caption as string) ?? "",
      folder: (data.folder as string | null) ?? undefined,
      uploadedBy: data.uploadedBy as string,
      createdAt: ts ? ts.toMillis() : null,
    };
  });
  const last = items[items.length - 1];
  const nextCursor = items.length === pageSize && last?.createdAt ? last.createdAt : null;
  return { items, nextCursor };
}

/** Edit alt text / title / caption on a media item. */
export async function updateMediaMeta(
  id: string,
  patch: { altText?: string; title?: string; caption?: string },
): Promise<void> {
  if (!db) throw new Error("Firebase non configuré.");
  await updateDoc(doc(db, "media", id), { ...patch, updatedAt: serverTimestamp() });
}

/** Delete a media item: Storage object first, then the Firestore index doc. */
export async function deleteMedia(item: Pick<MediaItem, "id" | "storagePath">): Promise<void> {
  // Côté serveur : la ligne d'index est supprimée d'abord, l'objet ensuite —
  // un objet resté seul est inoffensif, une ligne pointant dans le vide non.
  if (usesD1("storage")) {
    await apiDelete(`/api/v1/media/${encodeURIComponent(item.id)}`);
    return;
  }

  if (!storage || !db) throw new Error("Firebase non configuré.");
  try {
    await deleteObject(ref(storage, item.storagePath));
  } catch {
    // Object may already be gone; still remove the index entry.
  }
  await deleteDoc(doc(db, "media", item.id));
}
