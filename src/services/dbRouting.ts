/**
 * Routage Firestore ↔ D1, collection par collection.
 *
 * C'est la pièce qui rend la bascule progressive praticable : le choix de la
 * source vit ICI, dans un seul fichier, au lieu d'être disséminé dans les 29
 * fichiers de services. Rebasculer une collection en cas d'incident est un
 * changement de drapeau, pas un correctif de code.
 *
 * Source des drapeaux, par ordre de priorité :
 *   1. `localStorage` — permet à un membre de l'équipe de tester en production
 *      sans affecter les autres visiteurs ;
 *   2. `VITE_DB_ROUTES` — décidé au build ;
 *   3. défaut : Firestore, car tant qu'une collection n'a pas prouvé sa parité,
 *      la source de vérité reste l'ancienne.
 */
/**
 * Modes de routage, du plus sûr au plus engageant :
 *
 *  - `firestore` : tout sur Firestore (défaut).
 *  - `d1-read`   : LECTURES sur D1, ÉCRITURES toujours sur Firestore.
 *                  Firestore reste la source de vérité, donc le retour arrière
 *                  est GRATUIT — aucune écriture n'a été faite ailleurs. C'est
 *                  le mode de bascule : il expose le nouveau chemin de lecture
 *                  au trafic réel sans rien risquer.
 *  - `d1`        : lectures ET écritures sur D1. À n'activer qu'une fois le
 *                  mode lecture validé, car un retour arrière perdrait alors
 *                  les écritures faites entre-temps.
 */
export type Backend = "firestore" | "d1-read" | "d1";

const LS_KEY = "wy.dbRoutes";

/** `"*:d1"` ou `"medications:d1,facilities:d1"`. */
function parse(spec: string | undefined | null): Map<string, Backend> {
  const map = new Map<string, Backend>();
  if (!spec) return map;
  for (const entry of spec.split(",")) {
    const [name, backend] = entry.split(":").map((s) => s.trim());
    if (!name || (backend !== "d1" && backend !== "d1-read" && backend !== "firestore")) continue;
    map.set(name, backend);
  }
  return map;
}

function localOverrides(): Map<string, Backend> {
  if (typeof window === "undefined") return new Map();
  try {
    return parse(window.localStorage.getItem(LS_KEY));
  } catch {
    return new Map(); // navigation privée, stockage bloqué : on ignore
  }
}

const buildRoutes = parse(import.meta.env.VITE_DB_ROUTES as string | undefined);

export function routeFor(collection: string): Backend {
  const overrides = localOverrides();
  return (
    overrides.get(collection) ??
    overrides.get("*") ??
    buildRoutes.get(collection) ??
    buildRoutes.get("*") ??
    "firestore"
  );
}

/** Vrai si les LECTURES doivent aller vers D1. */
export function readsFromD1(collection: string): boolean {
  const route = routeFor(collection);
  return route === "d1" || route === "d1-read";
}

/** Vrai si les ÉCRITURES doivent aller vers D1. Strictement plus restrictif. */
export function writesToD1(collection: string): boolean {
  return routeFor(collection) === "d1";
}

/**
 * Conservé pour les appelants qui ne distinguent pas lecture et écriture
 * (paiements, messagerie, téléversements) : ces flux sont indivisibles, on ne
 * peut pas en lire d'un côté et en écrire de l'autre. Ils exigent donc le mode
 * `d1` complet.
 */
export function usesD1(collection: string): boolean {
  return writesToD1(collection);
}

/** Utilitaire de console : `__wyRoutes("*:d1")` puis rechargement. */
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__wyRoutes = (spec: string | null) => {
    try {
      if (spec === null) window.localStorage.removeItem(LS_KEY);
      else window.localStorage.setItem(LS_KEY, spec);
      return `routes = ${spec ?? "(défaut)"} — rechargez la page`;
    } catch {
      return "stockage local indisponible";
    }
  };
}
