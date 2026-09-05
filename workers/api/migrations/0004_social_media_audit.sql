-- Posts de communauté, à plat.
-- Firestore les stocke en sous-collection communities/{slug}/posts, ce qui
-- obligeait admin/moderationContent.ts à une requête collectionGroup("posts") —
-- la seule du code. À plat, la modération devient un SELECT ordinaire.
CREATE TABLE community_posts (
  id             TEXT PRIMARY KEY,
  community_slug TEXT NOT NULL,
  author_uid     TEXT NOT NULL,
  author_name    TEXT NOT NULL,
  author_role    TEXT,
  content        TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  tags           TEXT NOT NULL DEFAULT '[]',
  likes          INTEGER NOT NULL DEFAULT 0,
  comments       INTEGER NOT NULL DEFAULT 0,
  shares         INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX idx_posts_community ON community_posts(community_slug, created_at DESC);
CREATE INDEX idx_posts_created   ON community_posts(created_at DESC);  -- l'ex-collectionGroup
CREATE INDEX idx_posts_author    ON community_posts(author_uid);

CREATE TABLE forum_threads (
  id          TEXT PRIMARY KEY,
  author_uid  TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT,
  title       TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  excerpt     TEXT NOT NULL CHECK (length(excerpt) BETWEEN 1 AND 5000),
  kind        TEXT NOT NULL CHECK (kind IN ('question', 'discussion', 'conseil')),
  tags        TEXT NOT NULL DEFAULT '[]',
  answers     INTEGER NOT NULL DEFAULT 0,
  votes       INTEGER NOT NULL DEFAULT 0,
  views       INTEGER NOT NULL DEFAULT 0,
  solved      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_forum_kind    ON forum_threads(kind, created_at DESC);
CREATE INDEX idx_forum_created ON forum_threads(created_at DESC);

-- Messagerie. D1 reste l'index et le journal complet ; le Durable Object
-- ConversationDO détient la fenêtre chaude et diffuse en WebSocket, mais écrit
-- en traversée ici pour qu'aucun état ne soit prisonnier de l'objet.
CREATE TABLE conversations (
  id              TEXT PRIMARY KEY,   -- support_{uid} pour les fils de support
  kind            TEXT NOT NULL DEFAULT 'direct',
  title           TEXT,
  last_message    TEXT,
  last_sender_uid TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_conv_updated ON conversations(updated_at DESC);

-- Remplace `where("participants", "array-contains", uid)` et son index composite
-- Firestore (participants + updatedAt). Une jointure indexée répond à
-- « mes conversations triées par date », qui est une requête ENTRE entités et
-- ne peut donc pas vivre dans un Durable Object.
CREATE TABLE conversation_participants (
  conversation_id TEXT NOT NULL,
  uid             TEXT NOT NULL,
  joined_at       INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, uid)
);
CREATE INDEX idx_convpart_uid ON conversation_participants(uid);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_uid      TEXT NOT NULL,
  text            TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 5000),
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_msg_conv ON messages(conversation_id, created_at DESC);

CREATE TABLE media (
  id                TEXT PRIMARY KEY,
  filename_original TEXT NOT NULL,
  storage_path      TEXT NOT NULL,  -- clé d'objet R2, identique à l'ancien chemin GCS
  url               TEXT NOT NULL,  -- https://media.werguyaram.org/{storage_path}
  mime_type         TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN ('image', 'video', 'audio', 'document')),
  size              INTEGER NOT NULL,
  width             INTEGER,
  height            INTEGER,
  alt_text          TEXT NOT NULL DEFAULT '',
  title             TEXT NOT NULL DEFAULT '',
  caption           TEXT NOT NULL DEFAULT '',
  folder            TEXT,
  uploaded_by       TEXT NOT NULL,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);
-- created_at DESC porte aussi la pagination par curseur de media.ts, qui
-- utilisait startAfter(Timestamp.fromMillis(cursor)) : devient
-- `AND created_at < ?cursor ORDER BY created_at DESC LIMIT ?n`, sémantique identique.
CREATE INDEX idx_media_created  ON media(created_at DESC);
CREATE INDEX idx_media_category ON media(category, created_at DESC);
CREATE INDEX idx_media_folder   ON media(folder, created_at DESC);

CREATE TABLE audit_logs (
  id             TEXT PRIMARY KEY,
  actor_uid      TEXT NOT NULL,
  actor_name     TEXT,
  action         TEXT NOT NULL CHECK (action IN
                   ('create', 'update', 'delete', 'publish', 'unpublish',
                    'status_change', 'role_change', 'approve', 'reject')),
  resource_type  TEXT NOT NULL,
  resource_id    TEXT NOT NULL,
  resource_title TEXT,
  changes        TEXT,   -- diff JSON
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_audit_actor    ON audit_logs(actor_uid, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, created_at DESC);
CREATE INDEX idx_audit_action   ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_created  ON audit_logs(created_at DESC);

-- firestore.rules déclarait `allow update, delete: if false` — une garantie qui
-- ne tenait que tant que les règles étaient justes. Ici elle est appliquée par
-- le moteur, y compris contre un Worker bogué.
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
  BEGIN SELECT RAISE(ABORT, 'audit_logs est append-only'); END;
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
  BEGIN SELECT RAISE(ABORT, 'audit_logs est append-only'); END;
