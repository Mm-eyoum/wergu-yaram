-- Tables financières. Écrites EXCLUSIVEMENT par le serveur : firestore.rules
-- déclarait `allow write: if false` pour toutes. Aucune route client ne doit
-- pouvoir y écrire — c'est testé par la suite d'autorisation.

CREATE TABLE pricing_plans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  line_of_business TEXT NOT NULL CHECK (line_of_business IN
                    ('donations', 'pages', 'events', 'content', 'data', 'partners')),
  model           TEXT NOT NULL CHECK (model IN
                    ('one_time', 'subscription', 'commission', 'freemium')),
  price           INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  billing_period  TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'one_time')),
  features        TEXT NOT NULL DEFAULT '[]',
  limits          TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  trial_days      INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_plans_active ON pricing_plans(is_active, sort_order);

-- Un abonnement par cible : l'id de document EST l'id de la cible
-- (orgId ou facilitySlug), comme aujourd'hui dans Firestore.
CREATE TABLE subscriptions (
  id                       TEXT PRIMARY KEY,
  subscriber_uid           TEXT NOT NULL,
  org_id                   TEXT,
  facility_slug            TEXT,
  plan_id                  TEXT NOT NULL,
  status                   TEXT NOT NULL CHECK (status IN
                             ('active', 'cancelled', 'past_due', 'trialing')),
  -- Conservées en ISO-8601 : le code compare déjà des chaînes ISO
  -- (remindDueSubscriptions), et l'ordre lexicographique ISO == l'ordre chronologique.
  current_period_start     TEXT NOT NULL,
  current_period_end       TEXT NOT NULL,
  cancel_at_period_end     INTEGER NOT NULL DEFAULT 0,
  renewal_reminded         INTEGER NOT NULL DEFAULT 0,
  provider                 TEXT NOT NULL DEFAULT 'bictorys',
  provider_subscription_id TEXT,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL,
  CHECK ((org_id IS NOT NULL) <> (facility_slug IS NOT NULL))  -- exactement une cible
);
CREATE INDEX idx_subs_subscriber ON subscriptions(subscriber_uid, created_at DESC);
CREATE INDEX idx_subs_due        ON subscriptions(status, current_period_end);

CREATE TABLE transactions (
  id                      TEXT PRIMARY KEY,
  type                    TEXT NOT NULL CHECK (type IN
                            ('donation', 'donation_tip', 'subscription', 'ticket',
                             'commission', 'refund', 'payout', 'sponsorship')),
  line_of_business        TEXT NOT NULL,
  payer_uid               TEXT,
  ref_id                  TEXT,
  amount                  INTEGER NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'XOF',
  fees                    INTEGER NOT NULL DEFAULT 0,
  platform_amount         INTEGER NOT NULL DEFAULT 0,
  net_amount              INTEGER NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL CHECK (status IN
                            ('pending', 'completed', 'failed', 'refunded')),
  payment_method          TEXT,
  provider_transaction_id TEXT,
  metadata                TEXT,
  created_at              INTEGER NOT NULL
);
CREATE INDEX idx_txn_status ON transactions(status, created_at DESC);
CREATE INDEX idx_txn_payer  ON transactions(payer_uid, created_at DESC);

CREATE TABLE donations (
  id                      TEXT PRIMARY KEY,
  need_id                 TEXT NOT NULL,
  donor_uid               TEXT,   -- NULL : don anonyme (autorisé)
  donor_name              TEXT,
  amount                  INTEGER NOT NULL,
  tip_amount              INTEGER NOT NULL DEFAULT 0,
  currency                TEXT NOT NULL DEFAULT 'XOF',
  status                  TEXT NOT NULL DEFAULT 'pending',
  provider                TEXT NOT NULL DEFAULT 'bictorys',
  provider_transaction_id TEXT,
  checkout_url            TEXT,
  paid_at                 INTEGER,
  created_at              INTEGER NOT NULL
);
-- Porte le compteur anti-abus de createBictorysCharge (20 dons/heure/donateur),
-- qui était une requête d'agrégation .count() côté Firestore.
CREATE INDEX idx_don_donor ON donations(donor_uid, created_at DESC);
CREATE INDEX idx_don_need  ON donations(need_id);

CREATE TABLE pending_charges (
  id                      TEXT PRIMARY KEY,
  kind                    TEXT NOT NULL CHECK (kind IN ('subscription', 'ticket')),
  payer_uid               TEXT NOT NULL,
  plan_id                 TEXT,
  org_id                  TEXT,
  facility_slug           TEXT,
  event_id                TEXT,
  quantity                INTEGER,
  commission_rate         REAL,
  amount                  INTEGER NOT NULL,
  billing_period          TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending',
  provider_transaction_id TEXT,
  checkout_url            TEXT,
  created_at              INTEGER NOT NULL,
  updated_at              INTEGER NOT NULL
);
CREATE INDEX idx_pending_payer ON pending_charges(payer_uid, created_at DESC);

CREATE TABLE tickets (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL,
  buyer_uid  TEXT NOT NULL,
  quantity   INTEGER NOT NULL,
  amount     INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'valid',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_tickets_buyer ON tickets(buyer_uid, created_at DESC);
CREATE INDEX idx_tickets_event ON tickets(event_id);

CREATE TABLE commissions (
  id                TEXT PRIMARY KEY,
  transaction_id    TEXT NOT NULL,
  beneficiary_uid   TEXT NOT NULL DEFAULT '',
  gross_amount      INTEGER NOT NULL,
  commission_rate   REAL    NOT NULL,
  commission_amount INTEGER NOT NULL,
  net_amount        INTEGER NOT NULL,
  payout_status     TEXT NOT NULL DEFAULT 'pending'
                      CHECK (payout_status IN ('pending', 'processed', 'paid')),
  payout_date       TEXT,
  payout_reference  TEXT,
  created_at        INTEGER NOT NULL
);
CREATE INDEX idx_comm_beneficiary ON commissions(beneficiary_uid, created_at DESC);

-- Recalculée de façon idempotente par le cron quotidien de 02:00.
-- id = {YYYY-MM}_{lineOfBusiness}
CREATE TABLE revenue_reports (
  id                 TEXT PRIMARY KEY,
  period             TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  date               TEXT NOT NULL,
  line_of_business   TEXT NOT NULL,
  gross_revenue      INTEGER NOT NULL DEFAULT 0,
  fees               INTEGER NOT NULL DEFAULT 0,
  commissions        INTEGER NOT NULL DEFAULT 0,
  net_revenue        INTEGER NOT NULL DEFAULT 0,
  transactions_count INTEGER NOT NULL DEFAULT 0,
  new_customers      INTEGER NOT NULL DEFAULT 0,
  churned_customers  INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL
);
CREATE INDEX idx_revenue_date ON revenue_reports(date DESC);
