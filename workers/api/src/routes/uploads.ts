/**
 * Téléversements → R2. Remplace Firebase Storage.
 *
 * Choix : upload PROXIFIÉ par le Worker plutôt que pré-signé. Les plafonds sont
 * loin de la limite de 100 Mo par requête (5 Mo pour un avatar, 25 Mo pour un
 * média) et le Worker doit de toute façon s'exécuter pour appliquer ce que
 * `storage.rules` appliquait : propriété, type MIME, taille — puis écrire la
 * ligne d'index. Le pré-signé imposerait des identifiants S3 et une signature
 * SigV4 pour aucun gain à ces tailles.
 */
import type { Env } from "../auth/context";
import { ApiError, json } from "../lib/http";
import type { Ctx } from "../policy/types";

const MAX_AVATAR = 5 * 1024 * 1024;
const MAX_MEDIA = 25 * 1024 * 1024;

const IMAGE_TYPES = /^image\/(png|jpeg|jpg|webp|gif|avif)$/;
const MEDIA_TYPES = /^(image|video|audio)\/|^application\/pdf$/;

function extensionFor(contentType: string, filename: string): string {
  const fromName = filename.includes(".") ? filename.split(".").pop()! : "";
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
}

function categoryFor(contentType: string): "image" | "video" | "audio" | "document" {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  return "document";
}

function publicUrl(base: string, key: string): string {
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function readUpload(request: Request, maxBytes: number) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("invalid-argument", "Fichier manquant.");
  if (file.size === 0) throw new ApiError("invalid-argument", "Fichier vide.");
  if (file.size > maxBytes) {
    throw new ApiError("invalid-argument", `Fichier trop volumineux (max ${Math.round(maxBytes / 1024 / 1024)} Mo).`);
  }
  return file;
}

/** Avatar : `users/{uid}/avatar/photo.{ext}` — clé identique à l'ancien chemin Storage. */
export async function uploadAvatar(env: Env, ctx: Ctx, request: Request): Promise<Response> {
  if (!ctx.actor) throw new ApiError("unauthenticated", "Authentification requise.");
  if (ctx.actor.status === "suspended") throw new ApiError("permission-denied", "Compte suspendu.");

  const file = await readUpload(request, MAX_AVATAR);
  if (!IMAGE_TYPES.test(file.type)) {
    throw new ApiError("invalid-argument", "Seules les images sont acceptées.");
  }

  const key = `users/${ctx.actor.uid}/avatar/photo.${extensionFor(file.type, file.name)}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });

  const url = publicUrl(env.R2_PUBLIC_BASE, key);
  await env.DB.prepare("UPDATE users SET photo_url = ?1, updated_at = ?2 WHERE uid = ?3")
    .bind(url, Date.now(), ctx.actor.uid)
    .run();

  return json({ url, storagePath: key });
}

/**
 * Média du CMS : `media/{YYYY}/{id}.{ext}`.
 *
 * Corrige au passage un bug d'orphelins : côté client, `media.ts` fait
 * `uploadBytes` → `getDownloadURL` → `setDoc`, et un échec sur la dernière étape
 * laisse l'objet abandonné dans le bucket. Ici, si l'insertion en base échoue,
 * l'objet R2 est supprimé.
 */
export async function uploadMedia(env: Env, ctx: Ctx, request: Request): Promise<Response> {
  const role = ctx.actor?.role;
  if (!ctx.actor) throw new ApiError("unauthenticated", "Authentification requise.");
  if (role !== "editor" && role !== "admin" && role !== "super_admin") {
    throw new ApiError("permission-denied", "Réservé au staff éditorial.");
  }

  const file = await readUpload(request, MAX_MEDIA);
  if (!MEDIA_TYPES.test(file.type)) {
    throw new ApiError("invalid-argument", "Type de fichier non autorisé.");
  }

  const id = crypto.randomUUID();
  const key = `media/${new Date().getFullYear()}/${id}.${extensionFor(file.type, file.name)}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });

  const url = publicUrl(env.R2_PUBLIC_BASE, key);
  const now = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO media (id, filename_original, storage_path, url, mime_type, category,
                          size, alt_text, title, caption, folder, uploaded_by, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, '', '', '', ?8, ?9, ?10, ?10)`,
    )
      .bind(id, file.name, key, url, file.type, categoryFor(file.type), file.size,
            new URL(request.url).searchParams.get("folder"), ctx.actor.uid, now)
      .run();
  } catch (err) {
    await env.MEDIA.delete(key); // pas d'objet orphelin
    throw err;
  }

  return json({ id, url, storagePath: key, mimeType: file.type, size: file.size });
}

/** Suppression : base d'abord, objet ensuite (un objet resté seul est inoffensif). */
export async function deleteMedia(env: Env, ctx: Ctx, id: string): Promise<Response> {
  const role = ctx.actor?.role;
  if (role !== "editor" && role !== "admin" && role !== "super_admin") {
    throw new ApiError("permission-denied", "Réservé au staff éditorial.");
  }
  const row = await env.DB.prepare("SELECT storage_path FROM media WHERE id = ?1")
    .bind(id)
    .first<{ storage_path: string }>();
  if (!row) throw new ApiError("not-found", "Média introuvable.");

  await env.DB.prepare("DELETE FROM media WHERE id = ?1").bind(id).run();
  await env.MEDIA.delete(row.storage_path).catch(() => {
    // L'objet a pu déjà disparaître ; la ligne d'index, elle, est bien partie.
  });
  return json({ deleted: id });
}
