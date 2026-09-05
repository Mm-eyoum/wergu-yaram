-- Racine de l'autorisation. Les rôles ne sont PAS dans les custom claims Firebase
-- (le projet n'en utilise aucun) : ils vivent ici, lus à chaque requête
-- authentifiée par une lecture sur clé primaire.
--
-- Conséquence favorable : une suspension prend effet à la requête suivante, là où
-- un modèle à base de claims devrait attendre l'expiration du jeton (1 h).
CREATE TABLE users (
  uid              TEXT PRIMARY KEY,
  email            TEXT,
  display_name     TEXT,
  photo_url        TEXT,
  -- Les CHECK portent l'énumération que firestore.rules validait à la main :
  -- désormais appliquée SOUS l'application, donc inviolable même par un Worker bogué.
  role             TEXT NOT NULL DEFAULT 'patient_public'
                     CHECK (role IN ('patient_public', 'health_pro', 'editor', 'admin', 'super_admin')),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('pending', 'active', 'suspended')),
  region           TEXT,
  phone            TEXT,
  language         TEXT DEFAULT 'fr',
  interests        TEXT NOT NULL DEFAULT '[]',  -- tableau JSON
  home_coords      TEXT,                        -- objet JSON {lat, lng}
  sms_consent      INTEGER NOT NULL DEFAULT 0,
  whatsapp_consent INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE INDEX idx_users_created ON users(created_at DESC);  -- fetchAllUsers, plafonné à 200
CREATE INDEX idx_users_role    ON users(role);

-- Ciblage de sendCampaign. Aujourd'hui la fonction charge TOUS les utilisateurs
-- (limit 2000) et filtre les centres d'intérêt en mémoire ; normaliser permet un
-- WHERE indexé et supprime ce balayage.
CREATE TABLE user_interests (
  uid      TEXT NOT NULL,
  interest TEXT NOT NULL,
  PRIMARY KEY (uid, interest)
);
CREATE INDEX idx_user_interests_interest ON user_interests(interest);

-- Pages « organisation » (partenaires et donateurs).
--
-- NOTE : type='healthcare_facility' est en cours de retrait — la consolidation
-- vers `facilities` (documents) est faite au Lot 0 via
-- scripts/migrateHealthOrgsToFacilities.ts. La colonne reste pour les données
-- historiques, mais aucune création de ce type ne doit être acceptée par l'API.
CREATE TABLE organizations (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL CHECK (type IN ('healthcare_facility', 'partner', 'partner_donor')),
  name             TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 150),
  owner_uid        TEXT NOT NULL,
  manager_uids     TEXT NOT NULL DEFAULT '[]',  -- tableau JSON
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'active', 'suspended')),
  region           TEXT,
  description      TEXT,
  logo             TEXT,
  address          TEXT,
  city             TEXT,
  lat              REAL,   -- coords aplaties : ouvre les requêtes par boîte englobante
  lng              REAL,
  category         TEXT,
  sector           TEXT,
  source           TEXT CHECK (source IS NULL OR source IN ('user', 'imported')),
  place_id         TEXT,
  claim_status     TEXT CHECK (claim_status IS NULL
                     OR claim_status IN ('unclaimed', 'claim_pending', 'claimed')),
  phone            TEXT,
  hours            TEXT,
  rating           REAL,
  photo_url        TEXT,
  plan_tier        TEXT CHECK (plan_tier IS NULL OR plan_tier IN ('verified', 'pro')),
  plan_id          TEXT,
  featured         INTEGER NOT NULL DEFAULT 0,
  subscribed_until TEXT,
  profile          TEXT,   -- charge utile JSON libre, propre au type
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
-- Reprend les 3 index composites Firestore sur organizations.
CREATE INDEX idx_orgs_owner   ON organizations(owner_uid, created_at DESC);
CREATE INDEX idx_orgs_type    ON organizations(type, status, created_at DESC);
CREATE INDEX idx_orgs_status  ON organizations(status, created_at DESC);
CREATE INDEX idx_orgs_place   ON organizations(place_id) WHERE place_id IS NOT NULL;

CREATE TABLE claim_requests (
  id             TEXT PRIMARY KEY,
  facility_slug  TEXT,
  facility_name  TEXT,
  org_id         TEXT,   -- historique : réclamations antérieures à l'unification
  org_name       TEXT,
  requester_uid  TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  justification  TEXT NOT NULL CHECK (length(justification) BETWEEN 1 AND 2000),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_claims_requester ON claim_requests(requester_uid, created_at DESC);
CREATE INDEX idx_claims_status    ON claim_requests(status, created_at DESC);

CREATE TABLE professional_verification_requests (
  id              TEXT PRIMARY KEY,
  requester_uid   TEXT NOT NULL,
  requester_name  TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  justification   TEXT NOT NULL CHECK (length(justification) BETWEEN 1 AND 5000),
  license_number  TEXT,
  specialties     TEXT NOT NULL DEFAULT '[]',  -- tableau JSON
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_pvr_status    ON professional_verification_requests(status, created_at DESC);
CREATE INDEX idx_pvr_requester ON professional_verification_requests(requester_uid);
