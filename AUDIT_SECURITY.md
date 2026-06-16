# AUDIT SÉCURITÉ — Wergu Yaram

> Approche inspirée OWASP. **Aucun test offensif** n'a été réalisé (analyse statique du code, de la config et des règles Firestore uniquement). Surface d'attaque réduite : SPA cliente + Firebase, sans serveur custom.

## Synthèse

Le socle Firebase est **plutôt bien configuré** (deny-by-default, rôles figés, dégradation sans config, secrets non commités). Les risques réels concernent : **l'usurpation d'auteur** sur le contenu communautaire, **l'absence de validation de forme** des documents, **des dépendances vulnérables**, et l'**absence d'outillage/processus admin sécurisé**. La gravité est aujourd'hui atténuée par le fait que **le front n'écrit quasiment rien** en base — mais ces failles deviendront actives dès la mise en service réelle.

---

## Registre des risques

### [SEC-01] Usurpation d'auteur sur posts & threads (impersonation)
- **Catégorie** : Broken Access Control (OWASP A01) · **Gravité** : Haute · **Priorité** : P1
- **Fichier** : `firestore.rules:51` (posts), `:58` (threads)
- **Description** : `allow create: if isSignedIn();` ne vérifie pas que `request.resource.data.authorUid == request.auth.uid`. Un utilisateur authentifié peut créer un post/thread en se déclarant **auteur sous l'UID d'un autre** (ou sans `authorUid`, cassant ensuite update/delete).
- **Scénario** : un utilisateur malveillant publie un contenu diffamatoire en l'attribuant à un médecin vérifié.
- **Impact** : atteinte à la réputation, contenu non imputable, contournement de la propriété (update/delete).
- **Correction** :
  ```
  allow create: if isSignedIn()
    && request.resource.data.authorUid == request.auth.uid;
  ```
  + ajouter `authorUid` aux modèles (cf. BE-01).
- **Effort** : Faible · **Quick win** : Oui

### [SEC-02] Absence de validation de forme (mass assignment / intégrité)
- **Catégorie** : A08 Data Integrity · **Gravité** : Moyenne-Haute · **Priorité** : P1
- **Fichier** : `firestore.rules` (posts, threads, conversations, messages)
- **Description** : aucun `hasOnly([...])`, aucun contrôle de type/longueur. Un client peut écrire des champs arbitraires : compteurs (`likes`, `votes`, `views`), badges (`verified`, `solved`), timestamps falsifiés.
- **Scénario** : gonfler artificiellement votes/vues, s'auto-attribuer le badge « vérifié ».
- **Correction** : valider strictement les clés autorisées et leurs types dans chaque `create`/`update` ; calculer les compteurs côté serveur (transactions/Functions) plutôt que de les laisser écrire au client.
- **Effort** : Moyen · **Quick win** : Non

### [SEC-03] Dépendances vulnérables (Firebase / undici)
- **Catégorie** : A06 Vulnerable Components · **Gravité** : Haute · **Priorité** : P1
- **Preuve** : `npm audit` → **12 vulnérabilités (9 modérées, 3 hautes)**, chaîne `firebase 10.13 → @firebase/* → undici`.
- **Impact** : surface de vulnérabilité côté SDK ; `undici` est surtout exploité côté Node, mais la dette doit être résorbée.
- **Correction** : mettre à jour Firebase (`npm audit fix --force` implique un bump majeur potentiel → **tester le build/auth** après). Cible : Firebase ≥ dernière 10.x/11.x corrigée.
- **Effort** : Faible (mise à jour) + tests · **Quick win** : Oui (avec validation)

### [SEC-04] Validation de participants à la création de conversation
- **Catégorie** : A01 · **Gravité** : Moyenne · **Priorité** : P2
- **Fichier** : `firestore.rules:66-67`
- **Description** : `create` exige que l'auteur soit dans `participants`, mais n'empêche pas d'ajouter des participants arbitraires ni de borner la taille du tableau. Combiné au modèle `Conversation` **sans champ `participants`** (`domain.ts:240`), la messagerie réelle est à la fois non sécurisée et non fonctionnelle.
- **Correction** : valider `participants` (taille, format UID, présence de l'auteur, pas de doublons) ; aligner le modèle.
- **Effort** : Moyen · **Quick win** : Non

### [SEC-05] Clé API Firebase présente dans `.env.local`
- **Catégorie** : Secrets / A05 Misconfiguration · **Gravité** : Faible-Moyenne · **Priorité** : P2
- **Constat** : `.env.local` contient une clé API web Firebase (type relevé, **valeur non divulguée dans ce rapport**). ✅ Le fichier est **dans `.gitignore`** et **non suivi** par git (vérifié via `git ls-files`).
- **Nuance** : une clé API web Firebase est, par conception, exposée côté client (présente dans le bundle). Ce **n'est pas un secret** au sens classique ; la sécurité repose sur les **règles Firestore** et la config Auth, pas sur le secret de la clé.
- **Risques réels** : (a) si la clé était un jour committée publiquement → faciliter l'abus si les règles sont faibles ; (b) **App Check absent** → pas de protection contre l'usage de la clé hors de l'app légitime.
- **Correction** : restreindre la clé (referrers/domaines dans la console GCP), activer **Firebase App Check**, surveiller l'usage. Ne jamais committer `.env.local`.
- **Effort** : Faible-Moyen · **Quick win** : partiel

### [SEC-06] Provisioning admin & seed non sécurisés
- **Catégorie** : A05 · **Gravité** : Moyenne · **Priorité** : P2
- **Fichier** : `scripts/seed.ts`
- **Description** : seed via **SDK client** soumis aux règles, alors qu'aucun admin n'existe initialement → incitation à **relâcher les règles** temporairement (risque d'oubli = base ouverte). Pas de script de création du premier admin.
- **Correction** : seed via **Admin SDK** (compte de service, hors règles) ; script `set-admin` ; procédure documentée.
- **Effort** : Moyen · **Quick win** : doc = Oui

### [SEC-07] Gestion d'erreurs masquant l'état réel
- **Catégorie** : A09 Logging/Monitoring · **Gravité** : Faible-Moyenne · **Priorité** : P2
- **Fichiers** : `AuthContext.tsx:57-66`, `users.ts:37-44`
- **Description** : `catch` muets + fallback `patient_public/active`. Aucune télémétrie d'erreur. Un incident de lecture profil peut faire passer un compte pour « actif patient ».
- **Correction** : logger (Sentry/Crashlytics) ; ne pas fabriquer de statut actif par défaut ; afficher un état d'erreur.
- **Effort** : Faible-Moyen · **Quick win** : partiel

### [SEC-08] App Check / rate limiting / abus
- **Catégorie** : A04 Insecure Design · **Gravité** : Moyenne · **Priorité** : P2
- **Description** : pas d'App Check, pas de protection anti-abus sur la création de comptes / futurs posts. Firebase Auth applique un rate-limit basique, mais rien au niveau applicatif.
- **Correction** : App Check (reCAPTCHA), quotas, modération.
- **Effort** : Moyen · **Quick win** : Non

---

## Analyse OWASP (synthèse)

| Catégorie OWASP | État | Commentaire |
|-----------------|------|-------------|
| A01 Broken Access Control | ⚠️ | Impersonation posts/threads (SEC-01), statut sans effet (cf. ROLES RP-01) |
| A02 Cryptographic Failures | ✅ | Auth/HTTPS gérés par Firebase |
| A03 Injection (XSS/NoSQL) | ✅ | React échappe le JSX ; pas de `dangerouslySetInnerHTML` ; pas de requêtes string |
| A04 Insecure Design | ⚠️ | Pas d'App Check, pas de modération/anti-abus |
| A05 Misconfiguration | ⚠️ | Seed/admin (SEC-06), clé non restreinte (SEC-05) |
| A06 Vulnerable Components | ⚠️ | 12 vulnérabilités deps (SEC-03) |
| A07 Auth Failures | ✅⚠️ | Auth Firebase solide ; mdp min 6 (faible), erreurs génériques |
| A08 Data Integrity | ⚠️ | Pas de validation de forme (SEC-02) |
| A09 Logging/Monitoring | ❌ | Aucun logging d'erreur applicatif (SEC-07) |
| A10 SSRF | ✅ | N/A (pas de serveur/fetch d'URL) |

### IDOR
- `users/{uid}` : ✅ protégé (`isOwner || isAdmin`).
- `conversations` : ✅ protégé par `participants` (mais modèle à aligner).
- Posts/threads : ⚠️ lisibles publiquement (par design) ; faille = sur la **création** (SEC-01), pas la lecture.
- Contenu public : ✅ lecture publique assumée, écriture admin.

### XSS / Injection
- ✅ Aucun usage de `dangerouslySetInnerHTML`, `eval`, ni interpolation HTML brute détecté. React protège par défaut. Vigilance future si du contenu utilisateur (posts) est rendu.

---

## Priorisation des corrections sécurité

| Priorité | Actions |
|----------|---------|
| **P1** | SEC-01 (rules authorUid), SEC-02 (validation de forme), SEC-03 (deps) |
| **P2** | SEC-04 (participants), SEC-05 (restreindre clé + App Check), SEC-06 (admin/seed), SEC-07 (logging), SEC-08 (anti-abus) |
| **Transverse** | Écrire des **tests de règles Firestore** (émulateur) avant toute mise en service des écritures |

**Score sécurité : 55/100.** Bonnes fondations (deny-by-default, rôles figés, pas d'escalade, pas d'XSS, secrets non commités), mais failles d'access control sur la création de contenu, validation serveur quasi nulle, dépendances vulnérables, et absence d'App Check/logging/outillage admin sécurisé. Le risque est aujourd'hui latent (peu d'écritures) mais deviendra réel dès la mise en production des fonctionnalités.
