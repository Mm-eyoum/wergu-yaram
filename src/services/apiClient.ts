/**
 * Client de l'API Wergu Yaram (Cloudflare Workers).
 *
 * Remplace à terme les accès directs à Firestore. Firebase Auth reste le
 * fournisseur d'identité : on attache simplement le jeton nous-mêmes, là où le
 * SDK callable le faisait implicitement.
 */
import { auth } from "./firebase";

/** Base de l'API. Vide en développement ⇒ chemins relatifs (même origine). */
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Reprend les codes de HttpsError pour que les `catch` existants tiennent. */
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * `getIdToken()` renvoie le jeton en cache et le renouvelle automatiquement
 * s'il expire dans moins de 5 minutes — exactement ce sur quoi reposait
 * `httpsCallable`.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) return {};
  try {
    return { Authorization: `Bearer ${await user.getIdToken()}` };
  } catch {
    return {}; // jeton indisponible : on part anonyme, l'API tranchera
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? `Erreur ${res.status}`, body.code);
  }
  return body as T;
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(data) });
export const apiPut = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(data) });
export const apiPatch = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(data) });
export const apiDelete = <T>(path: string) => request<T>(path, { method: "DELETE" });

/**
 * Téléversement multipart.
 *
 * On ne pose PAS de `Content-Type` : le navigateur doit générer lui-même la
 * frontière multipart. L'imposer casse le parsing côté Worker.
 */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Erreur ${res.status}`, body.code);
  return body as T;
}

export const isApiConfigured = Boolean(BASE) || import.meta.env.DEV;
