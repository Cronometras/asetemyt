-- Migración 0002: tabla software (mirror público de Firestore)
-- Misma decisión que consultores: PK por id, no UNIQUE en slug.

CREATE TABLE IF NOT EXISTS software (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT,                                 -- pwa | desktop | cloud | etc.
  lang TEXT,
  descripcion TEXT,
  categorias TEXT,                           -- JSON array
  funcionalidades TEXT,                      -- JSON array
  pricing TEXT,                              -- JSON object (planes, free trial, etc.)
  fabricante TEXT,
  contacto TEXT,                             -- JSON object
  logo TEXT,
  verificado INTEGER DEFAULT 0,
  destacado INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_software_slug ON software(slug);
CREATE INDEX IF NOT EXISTS idx_software_updated_at ON software(updated_at DESC);
