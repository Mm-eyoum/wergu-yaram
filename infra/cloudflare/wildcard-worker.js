/**
 * Cloudflare Worker — sous-domaines partenaires wildcard pour Wergu Yaram.
 *
 * But : servir le SPA (déployé sur Firebase Hosting `werguyaram.web.app`) sous
 * n'importe quel `<slug>.werguyaram.org`, en gardant le sous-domaine dans la barre
 * d'adresse — l'app résout alors le tenant côté client (src/lib/tenantHost.ts).
 *
 * Pourquoi un proxy : Firebase Hosting renvoie 404 si on lui présente un Host
 * inconnu (`xyz.werguyaram.org`). Le Worker récupère donc le contenu en
 * présentant Host = werguyaram.web.app, et le ressert tel quel.
 *
 * Route à configurer : `*.werguyaram.org/*` (cf. README ci-dessous).
 * IMPORTANT : garder les sous-domaines de service (chat, …) en DNS-only (gris)
 * pour que le Worker NE s'exécute PAS dessus. Garde aussi ici une liste de
 * sécurité au cas où.
 */
const ORIGIN = "werguyaram.web.app"; // site Firebase Hosting déployé

// Sous-domaines réservés (services) qui ne doivent jamais être proxifiés vers
// l'app. Doublon défensif de RESERVED_SUBS côté app + des records DNS-only.
const RESERVED = new Set(["www", "app", "admin", "api", "chat"]);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const sub = url.hostname.split(".")[0];

    // Filet de sécurité : si un réservé arrive ici (mal configuré en DNS), ne pas
    // le détourner vers l'app — renvoyer une 404 explicite plutôt que de casser
    // le service (ex. chat). En pratique, ces hôtes doivent être en DNS-only.
    if (RESERVED.has(sub)) {
      return new Response("Reserved subdomain — configure as DNS-only.", { status: 404 });
    }

    // Reconstruit l'URL vers l'origine Firebase (même chemin + query). Le Host est
    // dérivé de cette URL → Firebase sert le site déployé (et non un 404).
    const originUrl = new URL(url.pathname + url.search, `https://${ORIGIN}`);
    const originReq = new Request(originUrl, request);

    // redirect: manual → on réécrit les redirections qui repointeraient vers
    // werguyaram.web.app, pour que le navigateur reste sur le sous-domaine.
    const resp = await fetch(originReq, { redirect: "manual" });
    const location = resp.headers.get("location");
    if (location && location.includes(ORIGIN)) {
      const headers = new Headers(resp.headers);
      headers.set("location", location.replaceAll(`https://${ORIGIN}`, `https://${url.host}`));
      return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
    }
    return resp;
  },
};
