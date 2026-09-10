// lib/d1.ts — D1 helpers for the asetemyt public mirror.
// D1 is a READ mirror of Firestore's public collections (directorio_consultores_asetemyt,
// directorio_software_asetemyt). Writes still go to Firestore (source-of-truth).
//
// Binding name in wrangler.toml: `DB` (D1 database, type `d1`).
// Cloudflare D1 has no "per-row read quota" — the 5M rows/day free tier is more than
// enough to serve /directorio/* indefinitely.
//
// Why this file exists: see migration history. Originally the public endpoints hit
// Firestore's REST API, gated by a 24h KV cache. Two incidents (2026-09-08 quota 429,
// 2026-09-09 KV 1000 puts/day exhausted) made that fragile. D1 replaces both:
//   - No 20k-reads/day cap (Firestore Spark)
//   - No 1000-puts/day cap on cache invalidation (KV Free)
//   - ~50ms latency on full listing (1024 rows) vs ~1.7s wrangler-cli overhead

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
