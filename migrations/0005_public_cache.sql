-- 0005: public listing cache + index tuning (applied 2026-10-08 via D1 API;
-- kept here so fresh environments reproduce the schema).
--
-- Background: the Free plan hard-caps D1 at 5M rows read/day (enforced since
-- 2026-09-01) and uncached public directory pages were burning ~1.4M rows/day.

-- Expression index for the accent/case-insensitive city lookup used by
-- listConsultoresByCity (was a full SCAN per request).
CREATE INDEX IF NOT EXISTS idx_consultores_ciudad
  ON consultores(LOWER(IFNULL(json_extract(ubicacion, '$.ciudad'), '')));

-- Listing order indexes: avoid a TEMP B-TREE sort of the full table on every
-- public listing query.
CREATE INDEX IF NOT EXISTS idx_consultores_listing_order
  ON consultores(verificado DESC, destacado DESC, nombre ASC);
CREATE INDEX IF NOT EXISTS idx_software_listing_order
  ON software(verificado DESC, destacado DESC, nombre ASC);

-- Generation counter for the public read-through cache (src/lib/public-cache.ts).
-- Bumped by d1-documents.ts on any write to a public listing collection.
INSERT INTO app_migration_state (name, value) VALUES ('public_cache_gen', '0')
  ON CONFLICT(name) DO NOTHING;
