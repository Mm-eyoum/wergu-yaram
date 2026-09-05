-- Les tenants eux-mêmes vivent dans `documents` (ce sont des ressources du CMS).
-- Mais deux champs en SORTENT délibérément.

-- 1) CORRECTIF DE SÉCURITÉ. Aujourd'hui firestore.rules déclare
--    `match /tenants/{slug} { allow read: if true; }` et setTenantApiKey.ts écrit
--    la clé EN CLAIR dans ce document : n'importe quel visiteur peut lire toutes
--    les clés API des bailleurs avec un seul getDoc.
--    Ici la clé n'est jamais stockée, seulement son empreinte, dans une table
--    qui n'est jamais jointe à la charge utile publique.
CREATE TABLE tenant_api_keys (
  tenant_slug  TEXT NOT NULL,
  key_hash     TEXT NOT NULL,   -- SHA-256(clé + poivre), comparé en temps constant
  label        TEXT,
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at   INTEGER,
  PRIMARY KEY (tenant_slug, key_hash)
);
CREATE INDEX idx_apikey_hash ON tenant_api_keys(key_hash) WHERE revoked_at IS NULL;

-- 2) Quota de campagnes, sorti du document pour que sa réservation soit UNE
--    instruction conditionnelle. Firestore exigeait une runTransaction ;
--    D1 n'a pas de transaction interactive, mais n'en a pas besoin ici :
--      UPDATE ... SET sent = (CASE WHEN period_key = ?1 THEN sent ELSE 0 END) + ?2
--      WHERE slug = ?3 AND (CASE ...) + ?2 <= monthly;
--    puis on lit meta.changes : 0 ⇒ quota atteint (HTTP 429).
CREATE TABLE tenant_quotas (
  tenant_slug         TEXT PRIMARY KEY,
  campaign_monthly    INTEGER NOT NULL DEFAULT 1000,
  campaign_sent       INTEGER NOT NULL DEFAULT 0,
  campaign_period_key TEXT NOT NULL DEFAULT '',   -- "YYYY-MM"
  updated_at          INTEGER NOT NULL
);

CREATE TABLE leads (
  id          TEXT PRIMARY KEY,
  tenant_slug TEXT NOT NULL CHECK (length(tenant_slug) BETWEEN 1 AND 80),
  kind        TEXT NOT NULL CHECK (kind IN ('contact', 'demo', 'candidature')),
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email       TEXT NOT NULL CHECK (length(email) BETWEEN 5 AND 200),
  phone       TEXT CHECK (phone IS NULL OR length(phone) <= 40),
  message     TEXT CHECK (message IS NULL OR length(message) <= 3000),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_leads_tenant ON leads(tenant_slug, created_at DESC);

CREATE TABLE memberships (
  id          TEXT PRIMARY KEY,
  tenant_slug TEXT NOT NULL CHECK (length(tenant_slug) BETWEEN 1 AND 80),
  uid         TEXT,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email       TEXT NOT NULL CHECK (length(email) BETWEEN 5 AND 200),
  phone       TEXT CHECK (phone IS NULL OR length(phone) <= 40),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'lapsed')),
  amount      INTEGER,
  paid_until  TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_memb_tenant ON memberships(tenant_slug, created_at DESC);
CREATE INDEX idx_memb_uid    ON memberships(uid) WHERE uid IS NOT NULL;

CREATE TABLE campaigns (
  id             TEXT PRIMARY KEY,
  tenant_slug    TEXT,   -- NULL = campagne admin globale
  title          TEXT NOT NULL,
  channel        TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  message        TEXT NOT NULL,
  segment        TEXT NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'sent', 'failed')),
  targeted_count INTEGER NOT NULL DEFAULT 0,
  -- Incrémenté par le consommateur de la Queue au fil des envois : le contrat de
  -- l'API renvoie désormais `queued`, pas `sent`, et l'UI rafraîchit cette ligne.
  sent_count     INTEGER NOT NULL DEFAULT 0,
  created_by_uid TEXT,
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_camp_tenant ON campaigns(tenant_slug, created_at DESC);

CREATE TABLE newsletter_signups (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL CHECK (length(email) BETWEEN 5 AND 200),
  source     TEXT CHECK (source IS NULL OR length(source) <= 60),
  created_at INTEGER NOT NULL
);

CREATE TABLE support_intents (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL CHECK (length(email) BETWEEN 5 AND 200),
  monthly_amount INTEGER NOT NULL CHECK (monthly_amount BETWEEN 500 AND 5000000),
  created_at     INTEGER NOT NULL
);

-- Remplace la collection `pageViews`, qui stockait UN document par vue et devait
-- être vidangée chaque nuit par aggregateTenantPageviews (lire 350 / agréger /
-- supprimer) — un contournement des limites de batch Firestore, sans raison
-- d'exister ici. Une ligne par (tenant, jour, chemin), incrémentée à l'écriture.
CREATE TABLE page_view_daily (
  tenant_slug TEXT NOT NULL,
  day         TEXT NOT NULL CHECK (length(day) = 10),
  path        TEXT NOT NULL CHECK (length(path) BETWEEN 1 AND 300),
  views       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_slug, day, path)
);
CREATE INDEX idx_pvd_tenant ON page_view_daily(tenant_slug, day);

CREATE TABLE tenant_reports (
  id          TEXT PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  kind        TEXT NOT NULL,
  data        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_treports_tenant ON tenant_reports(tenant_slug);

-- === Tables opérationnelles ===

-- Idempotence des webhooks. Insérée en PREMIÈRE instruction d'un batch() :
-- une redistribution du même événement viole la clé primaire et fait échouer
-- (donc annuler) tout le lot. Plus fort que l'idempotence actuelle, qui repose
-- sur une lecture de statut faite HORS transaction.
CREATE TABLE webhook_events (
  id          TEXT NOT NULL,
  provider    TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  PRIMARY KEY (provider, id)
);

-- Outbox transactionnel. Remplace les deux triggers Firestore
-- (onNewsletterSignup, onSupportIntent) : Cloudflare n'a pas de déclencheur de
-- base, mais une fois l'écriture passée par le Worker, « ce qui se produit
-- après » n'est que la suite du handler. La ligne d'outbox est écrite dans le
-- MÊME batch atomique que la donnée, donc aucun effet de bord n'est perdu si
-- l'envoi en Queue échoue — un cron balaie les lignes non traitées.
CREATE TABLE outbox (
  id          TEXT PRIMARY KEY,
  topic       TEXT NOT NULL,
  payload     TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  sent_at     INTEGER,
  last_error  TEXT
);
CREATE INDEX idx_outbox_pending ON outbox(created_at) WHERE sent_at IS NULL;

-- Suivi de la migration Firestore → D1, par collection.
CREATE TABLE migration_state (
  collection   TEXT PRIMARY KEY,
  last_cursor  TEXT,
  last_run_at  INTEGER,
  source_count INTEGER,
  loaded_count INTEGER
);
