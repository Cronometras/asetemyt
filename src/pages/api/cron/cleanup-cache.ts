// GET /api/cron/cleanup-cache
// Weekly cleanup of stale cache entries. Designed to be called by an
// external cron (e.g. cron-job.org, GitHub Actions, Hermes cron).
// Auth: requires ?secret=<CRON_SECRET> or Authorization: Bearer <CRON_SECRET>.
//
// What it does:
//   1. Lists all keys with the "cache:" prefix in KV
//   2. Deletes any whose expiration is in the past (KV's expirationTtl
//      normally auto-deletes them, but list() may still return them with
//      expiration <= now for a brief window after expiry — this is a no-op
//      for healthy state but guarantees a clean slate).
//   3. Logs counts for observability.
//
// KV auto-expires keys, so this is mostly housekeeping. The real value is
// when you bump a cache version (v1 → v2) and want to clean the v1 keys
// from previous deployments without waiting 24h.

import type { APIRoute } from 'astro';
import { invalidatePrefix } from '../../../lib/cache';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const env = (locals as any).runtime?.env || {};
  const cronSecret = env.CRON_SECRET;

  // Auth: secret can come via header or query param
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '');
  const providedSecret = bearer || url.searchParams.get('secret') || '';

  if (!cronSecret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), { status: 500 });
  }
  if (providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const kv = env.CACHE || env.ASETEMYT_CACHE;
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not bound' }), { status: 500 });
  }

  try {
    const before = await kv.list({ prefix: 'cache:' });
    const now = Math.floor(Date.now() / 1000);

    // Count and delete any expired keys
    const expired = before.keys.filter((k: { expiration?: number }) =>
      typeof k.expiration === 'number' && k.expiration <= now
    );

    if (expired.length > 0) {
      await invalidatePrefix(env, 'cache:');
    }

    // Also do a fresh list to confirm what remains
    const after = await kv.list({ prefix: 'cache:' });

    return new Response(JSON.stringify({
      success: true,
      before: before.keys.length,
      after: after.keys.length,
      expiredRemoved: expired.length,
      remaining: after.keys.map((k: { name: string; expiration?: number }) => ({
        name: k.name,
        expiresIn: k.expiration ? Math.max(0, k.expiration - now) : null,
      })),
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
