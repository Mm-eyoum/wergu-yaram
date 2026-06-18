/**
 * Build-time catalog loader — fetches the public catalog collections from
 * Firestore using the Admin SDK, so the SEO pipeline (sitemap, prerender, OG
 * images) reflects live content including pages created/edited via the CMS.
 *
 * Returns null when Firestore is unavailable (no credentials, empty project, or
 * a fetch error) so callers can fall back to the bundled mock baseline — the
 * build never breaks.
 *
 * Credentials resolve via Application Default Credentials, exactly like
 * scripts/seedContentAdmin.ts (GOOGLE_APPLICATION_CREDENTIALS or
 * `gcloud auth application-default login`).
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { loadEnv } from "vite";

const COLLECTIONS = [
  "medications",
  "pathologies",
  "articles",
  "facilities",
  "communities",
  "equipmentNeeds",
  "events",
];

/** A document is public unless explicitly unpublished in the CMS. */
function isPublic(data) {
  return data?.published !== false;
}

/**
 * @returns {Promise<import("../src/seo/routes").SeoContent | null>}
 */
export async function loadLiveContent() {
  // VITE_* vars live in .env files, so resolve them the same way the app does.
  const env = loadEnv("production", process.cwd(), "");
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.VITE_FIREBASE_PROJECT_ID ??
    env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.log("ℹ SEO: aucun projet Firebase configuré — repli sur le contenu mock.");
    return null;
  }

  try {
    if (getApps().length === 0) {
      initializeApp({ credential: applicationDefault(), projectId });
    }
    const db = getFirestore();

    const entries = await Promise.all(
      COLLECTIONS.map(async (name) => {
        const snap = await db.collection(name).get();
        const docs = snap.docs.map((d) => d.data()).filter(isPublic);
        return [name, docs];
      }),
    );

    const content = Object.fromEntries(entries);
    const total = Object.values(content).reduce((n, list) => n + list.length, 0);
    if (total === 0) {
      console.log("ℹ SEO: Firestore vide — repli sur le contenu mock.");
      return null;
    }

    console.log(
      `✓ SEO: contenu Firestore chargé (${COLLECTIONS.map((c) => `${c}:${content[c].length}`).join(", ")}).`,
    );
    return content;
  } catch (err) {
    console.log(`ℹ SEO: Firestore inaccessible (${err?.message ?? err}) — repli sur le contenu mock.`);
    return null;
  }
}
