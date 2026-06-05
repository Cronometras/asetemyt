// POST /api/admin/cache/purge
// Admin-only manual cache purge. Use when you need to force-refresh
// the public listings without waiting for the TTL.
//
// Body (any of):
//   { "all": true }                                  → purge every key in CACHE_KEYS
//   { "keys": ["directorioConsultores", "software"] } → purge specific (by short name)
//   {} or no body                                    → same as { "all": true } (safe default for manual purge)
//
// Response: { purged: string[], kv_write_used: number }

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../../lib/auth-server';
import { isAdmin } from '../../../../lib/admin';
import { invalidate, invalidatePrefix, invalidateAll, CACHE_KEYS } from '../../../../lib/cache';

const NAME_TO_KEY: Record<string, string> = {
  consultores: CACHE_KEYS.directorioConsultores,
  consultoresAsetemyt: CACHE_KEYS.directorioConsultores,
  directorioConsultores: CACHE_KEYS.directorioConsultores,
  software: CACHE_KEYS.directorioSoftware,
  softwareAsetemyt: CACHE_KEYS.directorioSoftware,
  directorioSoftware: CACHE_KEYS.directorioSoftware,
  jobs: CACHE_KEYS.jobsActive,
  jobsActive: CACHE_KEYS.jobsActive,
  reviews: CACHE_KEYS.reviewsAll,
  reviewsAll: CACHE_KEYS.reviewsAll,
};

async function handle(request: Request, locals: any): Promise<Response> {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  // Auth: require admin
  const { user } = await getAuthUser(request, apiKey);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autenticado.' }), { status: 401 });
  }
  const admin = await isAdmin(env, user);
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Acceso denegado.' }), { status: 403 });
  }

  // Parse body (best-effort — empty body is treated as "purge all")
  let body: { all?: boolean; keys?: string[] } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    // ignore — empty body is fine
  }

  let purged: string[] = [];

  if (body.all || (!body.keys || body.keys.length === 0)) {
    // Purge every key in the registry, then sweep any "reviews:<slug>" variants
    await invalidateAll(env);
    await invalidatePrefix(env, CACHE_KEYS.reviewsAll + ':');
    purged = ['all (registry + reviews:* variants)'];
  } else if (body.keys && body.keys.length > 0) {
    const fullKeys: string[] = [];
    for (const name of body.keys) {
      const full = NAME_TO_KEY[name] || name; // accept short names or full keys
      // For reviews we also clear every slug variant
      if (full === CACHE_KEYS.reviewsAll) {
        await invalidatePrefix(env, CACHE_KEYS.reviewsAll + ':');
        purged.push(`${name} (+ all slug variants)`);
      } else {
        fullKeys.push(full);
        purged.push(name);
      }
    }
    await invalidate(env, fullKeys);
  }

  return new Response(JSON.stringify({
    success: true,
    purged,
    message: 'Cache purgada. La próxima visita regenerará los datos desde Firestore.',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => handle(request, locals);

// GET also supported so an admin can hit it from the browser address bar
// as a quick "purge all" button.
export const GET: APIRoute = async ({ request, locals }) => handle(request, locals);
