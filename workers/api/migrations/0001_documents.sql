-- Table générique des ressources éditoriales (les 12 ressources du CMS).
--
-- Pourquoi générique plutôt que 12 tables typées : leur schéma est déclaré dans
-- src/admin/content/entries/*.tsx et change à chaque demande éditoriale ; trois
-- couches du client (catalog.ts, admin/contentAdmin.ts, tenantAnalytics.ts)
-- prennent le nom de collection à l'EXÉCUTION. Une table par ressource
-- casserait ces couches et imposerait une migration D1 par nouveau champ.
--
-- Les colonnes générées donnent malgré tout des colonnes réelles indexables à
-- la couche d'autorisation, qui doit lire ownerUid/published sur le chemin chaud.
CREATE TABLE documents (
  collection    TEXT    NOT NULL,
  id            TEXT    NOT NULL,   -- slug ou id généré ; toujours présent aussi dans `data`
  data          TEXT    NOT NULL,   -- charge utile JSON, forme identique à src/types/domain.ts
  created_at    INTEGER NOT NULL,   -- epoch ms, posé par le serveur (remplace serverTimestamp())
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,            -- suppression douce, utilisée pendant la fenêtre de double écriture

  -- ⚠️ Sémantique CRITIQUE : dans catalog.ts, isPublic() vaut `published !== false`.
  -- Un champ ABSENT signifie donc « publié ». Un `WHERE published = 1` naïf sur
  -- un json_extract brut masquerait tous les documents seedés, qui n'ont pas le champ.
  published     INTEGER GENERATED ALWAYS AS
                  (CASE WHEN json_extract(data, '$.published') = 0 THEN 0 ELSE 1 END) VIRTUAL,

  tenant_slug   TEXT GENERATED ALWAYS AS (json_extract(data, '$.tenantSlug'))  VIRTUAL,
  owner_uid     TEXT GENERATED ALWAYS AS (json_extract(data, '$.ownerUid'))    VIRTUAL,
  sort_title    TEXT GENERATED ALWAYS AS
                  (COALESCE(json_extract(data, '$.name'), json_extract(data, '$.title'))) VIRTUAL,

  -- Projections propres à `facilities` ; NULL ailleurs, sans coût.
  source        TEXT GENERATED ALWAYS AS (json_extract(data, '$.source'))      VIRTUAL,
  place_id      TEXT GENERATED ALWAYS AS (json_extract(data, '$.placeId'))     VIRTUAL,
  source_org_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.sourceOrgId')) VIRTUAL,

  PRIMARY KEY (collection, id)
);

-- Couvre listOrMock (collection + published), oneOrMock (clé primaire),
-- listByTenant + tenantAnalytics.byTenant/sumFields, fetchUserFacilities,
-- fetchDirectoryFacilities, la déduplication de placesShared et
-- fetchFacilityBySourceOrgId.
CREATE INDEX idx_doc_pub_updated ON documents(collection, published, updated_at DESC);
CREATE INDEX idx_doc_sorttitle   ON documents(collection, sort_title);
CREATE INDEX idx_doc_tenant      ON documents(collection, tenant_slug) WHERE tenant_slug IS NOT NULL;
CREATE INDEX idx_doc_owner       ON documents(collection, owner_uid)   WHERE owner_uid   IS NOT NULL;
CREATE INDEX idx_fac_source      ON documents(source)        WHERE collection = 'facilities';
CREATE INDEX idx_fac_place       ON documents(place_id)      WHERE place_id      IS NOT NULL;
CREATE INDEX idx_fac_srcorg      ON documents(source_org_id) WHERE source_org_id IS NOT NULL;

-- Les 6 documents de configuration (settings/site, navigation, appearance,
-- redirects, emails, legal). siteConfig.ts en fait aujourd'hui 4+ getDoc séparés
-- au démarrage ; ils seront servis en UNE réponse mise en cache au edge.
CREATE TABLE settings (
  key        TEXT PRIMARY KEY CHECK (key IN
               ('site', 'navigation', 'appearance', 'redirects', 'emails', 'legal')),
  data       TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);
