/**
 * Cloudflare Worker — sous-domaines de `werguyaram.org`.
 *
 * Rôle historique : servir le SPA (déployé sur Firebase Hosting) sous n'importe
 * quel `<slug>.werguyaram.org` en gardant le sous-domaine dans la barre
 * d'adresse — l'app résout ensuite le tenant côté client (src/lib/tenantHost.ts).
 * Firebase Hosting renvoie 404 sur un Host inconnu ; le Worker « blanchit » donc
 * le Host en présentant `werguyaram.web.app`.
 *
 * Ce Worker disparaîtra au Lot 1 de la migration Cloudflare, quand un Worker à
 * assets statiques servira `dist/` nativement sur tous les hôtes.
 *
 * ⚠️ La route `*.werguyaram.org/*` s'exécute AVANT l'origine, y compris sur les
 * enregistrements DNS proxifiés qui ont leur propre destination. C'est la cause
 * des deux corrections ci-dessous.
 */

const ORIGIN = "werguyaram.web.app"; // site Firebase Hosting déployé
const APEX = "werguyaram.org";
const CHATWOOT = "https://app.chatwoot.com"; // le support tourne sur Chatwoot Cloud

/**
 * Sous-domaines de service qui ne doivent JAMAIS être proxifiés vers l'app.
 * Doublon défensif de RESERVED_SUBS côté app (src/lib/tenantHost.ts).
 */
const RESERVED = new Set(["app", "admin", "api"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const sub = url.hostname.split(".")[0];

    // --- `www` : redirection canonique vers l'apex ---------------------------
    // Bug corrigé : `www` figurait dans RESERVED et recevait donc un 404 « Reserved
    // subdomain », alors que c'est un hôte PUBLIC avec son propre enregistrement A.
    // Toute visite sur www.werguyaram.org tombait sur une page d'erreur.
    if (sub === "www") {
      return Response.redirect(`https://${APEX}${url.pathname}${url.search}`, 301);
    }

    // --- `media` : fichiers servis depuis R2 --------------------------------
    // Le bucket a bien un domaine personnalisé, mais cette route s'exécute avant
    // lui et le détournerait vers le SPA. On sert donc l'objet directement via le
    // binding : un saut réseau de moins qu'un proxy.
    if (sub === "media") {
      if (!env.MEDIA) return new Response("Stockage indisponible.", { status: 503 });
      const key = decodeURIComponent(url.pathname.replace(/^\//, ""));
      if (!key) return new Response("Clé manquante.", { status: 400 });

      const object = await env.MEDIA.get(key);
      if (!object) return new Response("Introuvable.", { status: 404 });

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      // Les clés sont immuables (chemin = identité du fichier) : cache long.
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("access-control-allow-origin", "*");
      return new Response(object.body, { headers });
    }

    // --- `chat` : le support est sur Chatwoot Cloud --------------------------
    // Rien n'a jamais été auto-hébergé ici (cf. docs/chatwoot-repair.md) ;
    // un 404 laissait croire à une panne. On redirige vers l'hôte réel.
    if (sub === "chat") {
      return Response.redirect(CHATWOOT, 302);
    }

    // Filet de sécurité pour les sous-domaines de service restants.
    if (RESERVED.has(sub)) {
      return new Response("Reserved subdomain — configure as DNS-only.", { status: 404 });
    }

    // --- Espaces partenaires : proxy vers l'origine Firebase -----------------
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
