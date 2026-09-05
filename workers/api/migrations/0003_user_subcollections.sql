-- Sous-collections users/{uid}/* aplaties en tables.
-- La clé primaire commence toujours par `uid` : la règle Firestore
-- « allow read, write: if isOwner(uid) » devient une égalité sur la clé, et un
-- oubli de filtre ne peut pas exposer les données d'un autre utilisateur.

CREATE TABLE user_favorites (
  uid        TEXT NOT NULL,
  id         TEXT NOT NULL,   -- {type}_{refId}, l'id de document d'origine
  type       TEXT NOT NULL,
  ref_id     TEXT NOT NULL,
  title      TEXT,
  href       TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (uid, id)
);
CREATE INDEX idx_fav_created ON user_favorites(uid, created_at DESC);

CREATE TABLE user_saved_searches (
  uid        TEXT NOT NULL,
  id         TEXT NOT NULL,   -- requête encodée
  query      TEXT NOT NULL,
  scope      TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (uid, id)
);
CREATE INDEX idx_saved_created ON user_saved_searches(uid, created_at DESC);

CREATE TABLE user_reminders (
  uid        TEXT NOT NULL,
  id         TEXT NOT NULL,
  title      TEXT,
  event_id   TEXT,
  due_at     TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (uid, id)
);

CREATE TABLE user_community_memberships (
  uid            TEXT NOT NULL,
  community_slug TEXT NOT NULL,
  name           TEXT,
  created_at     INTEGER NOT NULL,
  PRIMARY KEY (uid, community_slug)
);

CREATE TABLE user_conversation_reads (
  uid             TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  last_read_at    INTEGER NOT NULL,
  PRIMARY KEY (uid, conversation_id)
);

CREATE TABLE user_formation_progress (
  uid          TEXT NOT NULL,
  slug         TEXT NOT NULL,
  title        TEXT,
  completed    INTEGER NOT NULL DEFAULT 0,
  score        INTEGER,
  total        INTEGER,
  completed_at INTEGER,
  PRIMARY KEY (uid, slug)
);

-- Écrites par le serveur (webhook Chatwoot). L'id reprend `cw_{messageId}`,
-- ce qui rend la réception idempotente via ON CONFLICT.
CREATE TABLE user_notifications (
  uid        TEXT NOT NULL,
  id         TEXT NOT NULL,
  kind       TEXT NOT NULL,
  title      TEXT,
  body       TEXT,
  meta       TEXT,           -- JSON (conversationId…)
  read_at    INTEGER,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (uid, id)
);
CREATE INDEX idx_note_created ON user_notifications(uid, created_at DESC);
