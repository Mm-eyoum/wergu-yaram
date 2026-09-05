/**
 * Lecture du catalogue depuis Firestore (Admin SDK) — partagé par les indexeurs
 * de recherche (Typesense Cloud et index in-browser Orama).
 *
 * Lit en direct quand GOOGLE_APPLICATION_CREDENTIALS est défini (donc les pages
 * créées/éditées au CMS sont indexées) ; renvoie null sinon, pour que l'appelant
 * retombe sur le contenu mock bundlé — l'indexeur ne plante jamais.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { SearchContent } from "../../src/data/mockSearchIndex";

/** Hit minimal pour les "pages" organisations (pas de facets structurées). */
export interface OrgHit {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  meta?: string;
  verified?: boolean;
  badge?: string;
  keywords: string;
}

/** Init the Admin SDK once; returns null when credentials are absent. */
export function getDb(): Firestore | null {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  if (getApps().length === 0) initializeApp({ credential: applicationDefault() });
  return getFirestore();
}

/** A document is public unless explicitly unpublished in the CMS. */
function isPublic(data: Record<string, unknown>): boolean {
  return data.published !== false;
}

/**
 * Read the catalog collections live from Firestore. Returns null without
 * credentials (or on error/empty) so the caller falls back to the bundled mock.
 */
export async function fetchLiveCatalog(db: Firestore | null): Promise<SearchContent | null> {
  if (!db) {
    console.log("ℹ︎ GOOGLE_APPLICATION_CREDENTIALS absent → contenu mock indexé");
    return null;
  }
  try {
    const read = async (name: string) => {
      const snap = await db.collection(name).get();
      return snap.docs.map((d) => d.data() as Record<string, unknown>).filter(isPublic);
    };
    const [medications, pathologies, articles, facilities, communities, events, equipmentNeeds, partners, formations] =
      await Promise.all([
        read("medications"),
        read("pathologies"),
        read("articles"),
        read("facilities"),
        read("communities"),
        read("events"),
        read("equipmentNeeds"),
        read("partners"),
        read("formations"),
      ]);
    const content = {
      medications,
      pathologies,
      articles,
      facilities,
      communities,
      events,
      equipmentNeeds,
      partners,
      formations,
    } as unknown as SearchContent;
    const total = Object.values(content).reduce((n, list) => n + (list as unknown[]).length, 0);
    if (total === 0) {
      console.log("ℹ︎ Firestore vide → contenu mock indexé");
      return null;
    }
    console.log(`✓ contenu Firestore chargé (${total} documents)`);
    return content;
  } catch (err) {
    console.log(`ℹ︎ Firestore inaccessible (${(err as Error)?.message ?? err}) → contenu mock indexé`);
    return null;
  }
}

/** Active organization "pages" as search hits. Resilient: [] on any failure. */
export async function fetchActiveOrgHits(db: Firestore | null): Promise<OrgHit[]> {
  if (!db) {
    console.log("ℹ︎ GOOGLE_APPLICATION_CREDENTIALS absent → organisations non indexées");
    return [];
  }
  let snap;
  try {
    snap = await db.collection("organizations").where("status", "==", "active").get();
  } catch (err) {
    console.log(`ℹ︎ organisations inaccessibles (${(err as Error)?.message ?? err}) → ignorées`);
    return [];
  }
  return snap.docs.map((doc) => {
    const o = doc.data() as Record<string, unknown>;
    const isFacility = o.type === "healthcare_facility";
    const place = [o.city, o.region].filter(Boolean).join(", ");
    const claimed = o.claimStatus === "claimed";
    return {
      id: `org:${doc.id}`,
      type: isFacility ? "etablissement" : "partenaire",
      title: (o.name as string) ?? "",
      description: (o.description as string) || (o.address as string) || place,
      href: `/structures/${doc.id}`,
      meta: place,
      verified: claimed,
      badge: claimed ? "Annuaire" : "Non réclamée",
      keywords: [o.name, o.city, o.region, o.address].filter(Boolean).join(" "),
    };
  });
}
