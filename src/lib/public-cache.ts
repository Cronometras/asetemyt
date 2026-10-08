// Public read-through cache for heavy D1 listing queries (Workers Cache API).
//
// Context (2026-10-08): the Free plan allows 5M D1 rows read/day and HARD-FAILS
// after that (enforced since 2026-09-01). The public directory readers scan
// hundreds of rows per request (listConsultores ≈ 657, listSoftware ≈ 201,
// aggregates ≈ 657 each), so uncached traffic was burning ~1.4M rows/day.
//
// Design: entries are keyed by a data generation counter stored in
// app_migration_state ('public_cache_gen'). Any mutation on a public listing
// collection bumps the counter, which invalidates every cached listing
// globally and immediately (the key itself changes). Writes to other
// collections (leads, pending, payments…) do NOT bump it, so spam submits
// cannot thrash the cache. TTL is only garbage collection for abandoned keys.
//
// The cache stores JSON-safe parsed rows. Falls back to the fetcher when the
// Cache API is unavailable (node build step, local dev without workerd).

export const PUBLIC_LISTING_COLLECTIONS = new Set([
  'directorio_consultores_asetemyt',
  'directorio_software_asetemyt',
]);

const GEN_NAME = 'public_cache_gen';
const TTL_SECONDS = 3600;

type Database = ReturnType<typeof import('./d1').getDB>;

export async function getPublicCacheGeneration(db: Database): Promise<string> {
  const row = await db
    .prepare('SELECT value FROM app_migration_state WHERE name = ?')
    .bind(GEN_NAME)
    .first();
  return (row?.value as string) ?? '0';
}

/** Invalidate every public cached listing at once. Call after listing writes. */
export async function bumpPublicCacheGeneration(db: Database): Promise<void> {
  await db
    .prepare(
      "INSERT INTO app_migration_state (name, value) VALUES (?1, '1') " +
        'ON CONFLICT(name) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)'
    )
    .bind(GEN_NAME)
    .run();
}

/**
 * Read-through cache for public, read-mostly data.
 *
 * `keyBase` must be a fixed identifier per dataset (plus sanitized params for
 * the by-city / by-especialidad readers). Pass `null` to bypass the cache for
 * untrusted/parametrized input that failed sanitization.
 */
export async function cachedPublic<T>(
  db: Database,
  keyBase: string | null,
  fetcher: () => Promise<T>
): Promise<T> {
  const cache = (globalThis as any).caches?.default;
  if (!cache || !keyBase) return fetcher();

  const gen = await getPublicCacheGeneration(db);
  const key = new Request(`https://asetemyt-public-cache.internal/${keyBase}/g${gen}`);
  try {
    const hit = await cache.match(key);
    if (hit) return (await hit.json()) as T;
  } catch {
    // cache read failure — fall through to the fetcher
  }

  const value = await fetcher();
  try {
    await cache.put(
      key,
      new Response(JSON.stringify(value), {
        headers: { 'Cache-Control': `max-age=${TTL_SECONDS}, s-maxage=${TTL_SECONDS}` },
      })
    );
  } catch {
    // cache write failure — never block the response
  }
  return value;
}

/** Cache key for URL-derived params; null (= bypass) when the param is not a plain slug. */
export function safeParamKey(prefix: string, param: string): string | null {
  const p = (param || '').toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(p)) return null;
  return `${prefix}${p}`;
}
