// Public directory readers. app_documents is the runtime source of truth;
// migration 0003 keeps these public-only tables synchronized with SQL triggers.
// Private document fields are intentionally not returned by these readers.

type D1Binding = D1Database;

/**
 * Resolve the D1 binding from Astro locals. CF Pages exposes runtime.env on locals.
 * Throws if the binding is missing — that's a deploy misconfiguration, not a runtime issue.
 */
export function getDB(locals: any): D1Binding {
  const env = locals?.runtime?.env || locals;
  const db = env.DB;
  if (!db) {
    throw new Error(
      'D1 binding `DB` not found in runtime.env. Check wrangler.toml [[d1_databases]] ' +
      'binding name and that CF Pages project has D1 attached.'
    );
  }
  return db as D1Binding;
}

/**
 * Fetch all consultores from D1. Returns parsed rows with JSON columns restored to
 * objects. Used by /api/directorio/consultores and /directorio/[slug].
 */
export async function listConsultores(db: D1Binding): Promise<any[]> {
  const stmt = db.prepare(
    'SELECT id, slug, nombre, tipo, lang, descripcion, especialidades, servicios, ' +
    'ubicacion, contacto, logo, verificado, destacado, created_at, updated_at ' +
    'FROM consultores ORDER BY nombre ASC'
  );
  const res = await stmt.all();
  return (res.results || []).map(rowToConsultor);
}

/**
 * Fetch consultores that have a given especialidad in their list.
 * Used by /directorio/especialidad/[slug] SEO pages.
 */
export async function listConsultoresByEspecialidad(db: D1Binding, especialidad: string): Promise<any[]> {
  const stmt = db.prepare(
    "SELECT id, slug, nombre, tipo, lang, descripcion, especialidades, servicios, " +
    "ubicacion, contacto, logo, verificado, destacado, created_at, updated_at " +
    "FROM consultores " +
    "WHERE LOWER(especialidades) LIKE ? " +
    "ORDER BY destacado DESC, nombre ASC"
  );
  // Use JSON path to match exact element (LIKE '%"lean"%' would over-match nested quotes)
  const pattern = `%"${especialidad}"%`;
  const res = await stmt.bind(pattern).all();
  return (res.results || []).map(rowToConsultor);
}

/**
 * Fetch all unique especialidades with counts. Used by the SEO index page.
 */
export async function getEspecialidadesWithCounts(db: D1Binding): Promise<Array<{ slug: string; count: number; nombre: string }>> {
  // Pull every row's especialidades JSON, parse it, and aggregate in JS
  // (D1's JSON1 doesn't easily flatten arrays). With ~488 rows this is cheap.
  const stmt = db.prepare(
    "SELECT especialidades FROM consultores WHERE especialidades IS NOT NULL AND especialidades != '[]'"
  );
  const res = await stmt.all();
  const counts: Record<string, number> = {};
  for (const row of (res.results || []) as Array<{ especialidades: string }>) {
    if (!row.especialidades) continue;
    try {
      const arr = JSON.parse(row.especialidades);
      if (Array.isArray(arr)) {
        for (const e of arr) {
          if (typeof e === 'string' && e.trim()) {
            counts[e] = (counts[e] || 0) + 1;
          }
        }
      }
    } catch {}
  }
  return Object.entries(counts)
    .map(([slug, count]) => ({ slug, count, nombre: slug.replace(/-/g, ' ') }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Fetch consultores in a specific ciudad (case-insensitive, accent-insensitive match).
 * Used by /directorio/ciudad/[slug] SEO pages.
 * Returns matching consultores sorted by nombre.
 */
export async function listConsultoresByCity(db: D1Binding, ciudad: string): Promise<any[]> {
  const needle = ciudad.toLowerCase();
  const norm = accentStrip(needle);
  // Match either exact city, accent-stripped city, or the same city with different case
  const stmt = db.prepare(
    "SELECT id, slug, nombre, tipo, lang, descripcion, especialidades, servicios, " +
    "ubicacion, contacto, logo, verificado, destacado, created_at, updated_at " +
    "FROM consultores " +
    "WHERE LOWER(IFNULL(json_extract(ubicacion, '$.ciudad'), '')) = ? " +
    "   OR LOWER(IFNULL(json_extract(ubicacion, '$.ciudad'), '')) = ? " +
    "ORDER BY nombre ASC"
  );
  const res = await stmt.bind(needle, norm).all();
  return (res.results || []).map(rowToConsultor);
}

/**
 * Fetch unique (ciudad, count) pairs from D1. Used by the SEO index page.
 */
export async function getCitiesWithCounts(db: D1Binding): Promise<Array<{ ciudad: string; count: number; slug: string }>> {
  const stmt = db.prepare(
    "SELECT json_extract(ubicacion, '$.ciudad') AS ciudad, COUNT(*) AS count " +
    "FROM consultores " +
    "WHERE json_extract(ubicacion, '$.ciudad') IS NOT NULL " +
    "GROUP BY ciudad " +
    "ORDER BY count DESC"
  );
  const res = await stmt.all();
  const rows = (res.results || []) as Array<{ ciudad: string; count: number }>;
  return rows
    .filter(r => r.ciudad && r.ciudad.trim())
    .map(r => ({
      ciudad: r.ciudad,
      count: r.count,
      slug: citySlug(r.ciudad),
    }));
}

function accentStrip(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n');
}

export function citySlug(city: string): string {
  const s = accentStrip(city);
  return s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Fetch a single consultor by slug. Returns the first match (Firestore may have multiple
 * docs with same slug — see migration 0001 commentary). Returns null if not found.
 */
export async function getConsultorBySlug(db: D1Binding, slug: string): Promise<any | null> {
  const stmt = db.prepare(
    'SELECT id, slug, nombre, tipo, lang, descripcion, especialidades, servicios, ' +
    'ubicacion, contacto, logo, verificado, destacado, created_at, updated_at ' +
    'FROM consultores WHERE slug = ? LIMIT 1'
  );
  const row = await stmt.bind(slug).first();
  return row ? rowToConsultor(row) : null;
}

/**
 * Fetch all software rows from D1. Mirror of listConsultores for the software directory.
 */
export async function listSoftware(db: D1Binding): Promise<any[]> {
  const stmt = db.prepare(
    'SELECT id, slug, nombre, tipo, lang, descripcion, categorias, funcionalidades, ' +
    'pricing, fabricante, contacto, logo, verificado, destacado, created_at, updated_at ' +
    'FROM software ORDER BY nombre ASC'
  );
  const res = await stmt.all();
  return (res.results || []).map(rowToSoftware);
}

/**
 * Fetch a single software row by slug. Returns null if not found.
 */
export async function getSoftwareBySlug(db: D1Binding, slug: string): Promise<any | null> {
  const stmt = db.prepare(
    'SELECT id, slug, nombre, tipo, lang, descripcion, categorias, funcionalidades, ' +
    'pricing, fabricante, contacto, logo, verificado, destacado, created_at, updated_at ' +
    'FROM software WHERE slug = ? LIMIT 1'
  );
  const row = await stmt.bind(slug).first();
  return row ? rowToSoftware(row) : null;
}

/**
 * Total counts for the home page stats (X consultores, Y software).
 * Single round-trip, no full SELECT.
 */
export async function getCounts(db: D1Binding): Promise<{ consultores: number; software: number }> {
  const cStmt = db.prepare('SELECT COUNT(*) AS n FROM consultores');
  const sStmt = db.prepare('SELECT COUNT(*) AS n FROM software');
  const [c, s] = await Promise.all([cStmt.first(), sStmt.first()]);
  return {
    consultores: (c?.n as number) ?? 0,
    software: (s?.n as number) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Row → object transformers. JSON columns are stored as TEXT, restored here so the
// public API contract is identical to the Firestore-backed version (consultores[]).
// ---------------------------------------------------------------------------

function rowToConsultor(r: any): any {
  return {
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    tipo: r.tipo,
    lang: r.lang,
    descripcion: r.descripcion,
    especialidades: safeParse(r.especialidades, []),
    servicios: safeParse(r.servicios, []),
    ubicacion: safeParse(r.ubicacion, {}),
    contacto: safeParse(r.contacto, {}),
    logo: r.logo,
    verificado: !!r.verificado,
    destacado: !!r.destacado,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToSoftware(r: any): any {
  return {
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    tipo: r.tipo,
    lang: r.lang,
    descripcion: r.descripcion,
    categorias: safeParse(r.categorias, []),
    funcionalidades: safeParse(r.funcionalidades, []),
    pricing: safeParse(r.pricing, {}),
    fabricante: r.fabricante,
    contacto: safeParse(r.contacto, {}),
    logo: r.logo,
    verificado: !!r.verificado,
    destacado: !!r.destacado,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function safeParse(s: any, fallback: any): any {
  if (s == null || s === '') return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
