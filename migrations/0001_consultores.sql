-- Migración 0001: tabla consultores (mirror público de Firestore)
-- Decisión producto: PK por id (Firestore docId), NO UNIQUE en slug
-- Razón: Firestore tiene 6 pares de slugs duplicados legítimos (rebranded / mismo nombre
-- distinto origen). El endpoint público sirve los 1024 docs actuales; cambiar el contrato
-- a 1018 es romper producto. La unicidad se mantiene en Firestore (source-of-truth).
-- D1 es cache de lectura — los inserts siguen yendo por Firestore + script de sync.

CREATE TABLE IF NOT EXISTS consultores (
  id TEXT PRIMARY KEY,                       -- Firestore docId
  slug TEXT NOT NULL,                       -- puede repetirse (ver arriba)
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,                       -- empresa | consultor | freelance | centro-tecnologico
  lang TEXT,                                 -- 'es' | 'en'
  descripcion TEXT,
  especialidades TEXT,                       -- JSON array
  servicios TEXT,                            -- JSON array
  ubicacion TEXT,                            -- JSON object (país ya normalizado)
  contacto TEXT,                             -- JSON object
  logo TEXT,
  verificado INTEGER DEFAULT 0,             -- 0|1
  destacado INTEGER DEFAULT 0,              -- 0|1
  created_at TEXT,                          -- ISO timestamp
  updated_at TEXT                           -- ISO timestamp
);

CREATE INDEX IF NOT EXISTS idx_consultores_slug ON consultores(slug);
CREATE INDEX IF NOT EXISTS idx_consultores_tipo ON consultores(tipo);
CREATE INDEX IF NOT EXISTS idx_consultores_updated_at ON consultores(updated_at DESC);
