// Server-side cache helper for public, read-mostly data.
// Backed by Cloudflare KV — survives across Worker invocations, shared
// across all visitors. Used to slash Firestore read quota.
//
// Usage pattern:
//
//   // At the top of an API route:
//   const { getCached } = await import('../../../lib/cache');
//
//   const data = await getCached(
//     env,                                  // locals.runtime.env from Astro
//     'cache:directorio:consultores:v1',    // versioned cache key
//     async () => {                         // fetcher — only called on MISS
//       const docs = await firestoreListAll(env, 'directorio_consultores_asetemyt');
//       return docs;
//     },
//     86400                                 // TTL in seconds (24h default)
//   );
//
//   // On a mutation that should invalidate:
//   const { invalidate } = await import('../../../lib/cache');
//   await invalidate(env, ['cache:directorio:consultores:v1']);
//
// Cache key convention: `cache:<scope>:<name>:v<version>`
// - scope: top-level surface ("directorio", "jobs", "reviews")
// - name:  the data being cached ("consultores", "active", "all")
// - version: bump (v1 → v2) when the shape of the cached data changes

// We import the KVNamespace type lazily from unstorage to avoid pulling
// @cloudflare/workers-types into the bundle (it's already a transitive dep).
// If you want the official CF type, install @cloudflare/workers-types and
// replace the import below.
type KVNamespaceLike = {
  get(key: string, type: 'json'): Promise<unknown>;
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>;
};

const DEFAULT_TTL_SECONDS = 86400; // 24h

interface CacheEnv {
  // Cloudflare KV namespace. Bound as `CACHE` in Cloudflare Pages dashboard.
  // We accept any name to make local dev (where KV isn't bound) a no-op.
  CACHE?: KVNamespaceLike;
  // Some deployments bind under a different name. Accept both.
  ASETEMYT_CACHE?: KVNamespaceLike;
}

function getKV(env: CacheEnv): KVNamespaceLike | null {
  return env.CACHE || env.ASETEMYT_CACHE || null;
}

/**
 * Read from cache, or compute & store on miss.
 *
 * Returns whatever the fetcher returns. If KV is not bound (local dev or
 * KV binding misconfigured), falls back to a direct call to the fetcher.
 * This means local dev "just works" without needing wrangler.
 */
export async function getCached<T>(
  env: CacheEnv,
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
  const kv = getKV(env);

  // 1. Try cache
  if (kv) {
    try {
      const hit = await kv.get(key, 'json');
      if (hit !== null && hit !== undefined) {
        return hit as T;
      }
    } catch (e) {
      // Cache read failed — log and fall through to fetcher.
      console.warn(`[cache] read miss/error for ${key}:`, (e as Error).message);
    }
  }

  // 2. Compute fresh value — but DON'T cache on transient errors.
  //    Quota-exceeded (429) and network errors are transient; caching them
  //    would propagate the failure for the full TTL.
  let value: T;
  try {
    value = await fetcher();
  } catch (e) {
    console.warn(`[cache] fetcher threw for ${key} — NOT caching, propagating error:`, (e as Error).message);
    throw e;
  }

  // 3. Store in cache (best-effort — never block the response on cache writes)
  if (kv) {
    try {
      // expirationTtl: KV auto-deletes after this many seconds.
      // We add a small jitter so all keys don't expire at the same instant.
      const ttl = ttlSeconds + Math.floor(Math.random() * 60);
      await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
    } catch (e) {
      console.warn(`[cache] write failed for ${key}:`, (e as Error).message);
    }
  }

  return value;
}

/**
 * Invalidate one or more cache keys. Called from mutation endpoints
 * (claim, add listing, admin edit, etc.) so the next read repopulates
 * with fresh data.
 *
 * Pass an array of full keys, or pass a versioned prefix and a list of
 * known names:
 *
 *   await invalidate(env, ['cache:directorio:consultores:v1']);
 *   // or invalidate all versions of a scope:
 *   await invalidatePrefix(env, 'cache:directorio:consultores:');
 */
export async function invalidate(env: CacheEnv, keys: string[]): Promise<void> {
  const kv = getKV(env);
  if (!kv) return; // local dev — no-op

  // KV delete is best-effort. We do all deletes in parallel.
  await Promise.all(
    keys.map(async (key) => {
      try {
        await kv.delete(key);
      } catch (e) {
        console.warn(`[cache] invalidate failed for ${key}:`, (e as Error).message);
      }
    })
  );
}

/**
 * Invalidate every key under a prefix. Use sparingly — KV's `list()`
 * is eventually consistent and costs 1 read per listed key, so prefer
 * the targeted `invalidate()` when you know the exact key.
 */
export async function invalidatePrefix(env: CacheEnv, prefix: string): Promise<void> {
  const kv = getKV(env);
  if (!kv) return;

  try {
    const listed = await kv.list({ prefix });
    if (listed.keys.length === 0) return;
    await Promise.all(
      listed.keys.map(async (k: { name: string }) => {
        try {
          await kv.delete(k.name);
        } catch {
          // individual delete failure — ignore
        }
      })
    );
  } catch (e) {
    console.warn(`[cache] invalidatePrefix(${prefix}) failed:`, (e as Error).message);
  }
}

// --- Centralized cache key registry ---------------------------------------
// Bump the version (v1 → v2) when the shape of the cached data changes.
// All consumers should import keys from here so a version bump invalidates
// everything atomically across the codebase.

export const CACHE_KEYS = {
  // Public listings — invalidated by: new listing, edit listing, claim approved
  directorioConsultores: 'cache:directorio:consultores:v1',
  directorioSoftware: 'cache:directorio:software:v1',

  // Public job board — invalidated by: new job, job update
  jobsActive: 'cache:jobs:active:v1',

  // Public reviews — invalidated by: new approved review
  reviewsAll: 'cache:reviews:v1',

  // Glossary, blog, etc. (add as needed)
  // glosario: 'cache:glosario:v1',
} as const;

/** Invalidate every key in the registry. Use on major data migrations only —
 *  for normal mutations, invalidate only the affected keys. */
export async function invalidateAll(env: CacheEnv): Promise<void> {
  await invalidate(env, Object.values(CACHE_KEYS));
}
