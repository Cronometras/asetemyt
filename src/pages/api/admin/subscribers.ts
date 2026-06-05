// GET /api/admin/subscribers — List newsletter subscribers (admin only)
// PATCH — Update subscriber status
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreQuery, firestoreUpdate, toFirestoreValue } from '../../../lib/firestore-rest';
import { getCached } from '../../../lib/cache';

// Admin cache TTL: short (60s) — admin sees fresh data on manual refresh.
// Critical here: the original code ran 3 separate firestoreQuery calls
// (active / canceled / past_due) per refresh. With 60s cache, that's
// 3 reads per minute-per-admin at most, not 3 × visits.
const ADMIN_CACHE_TTL = 60;
const ADMIN_CACHE_KEY_SUBSCRIBERS = 'cache:admin:subscribers:v1';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });

  try {
    const status = url.searchParams.get('status') || '';
    const search = url.searchParams.get('search') || '';

    const subs = await getCached(
      env,
      ADMIN_CACHE_KEY_SUBSCRIBERS,
      async () => {
        // Single cached payload contains all statuses — filtering happens
        // after the cache hit (cheap in-memory work).
        const [active, canceled, pastDue] = await Promise.all([
          firestoreQuery(env, 'newsletter_subscribers', 'status', 'EQUAL', { stringValue: 'active' }),
          firestoreQuery(env, 'newsletter_subscribers', 'status', 'EQUAL', { stringValue: 'canceled' }),
          firestoreQuery(env, 'newsletter_subscribers', 'status', 'EQUAL', { stringValue: 'past_due' }),
        ]);
        return [...active, ...canceled, ...pastDue]
          .sort((a: any, b: any) => (b.subscribedAt || '').localeCompare(a.subscribedAt || ''));
      },
      ADMIN_CACHE_TTL
    );

    let filtered = subs;
    if (status) filtered = filtered.filter((s: any) => s.status === status);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((s: any) => (s.email || '').toLowerCase().includes(q) || (s.company || '').toLowerCase().includes(q));
    }

    return new Response(JSON.stringify({ subscribers: filtered }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });

  try {
    const { id, status } = await request.json();
    if (!id || !status) return new Response(JSON.stringify({ error: 'id y status requeridos' }), { status: 400 });
    if (!['active', 'canceled'].includes(status)) return new Response(JSON.stringify({ error: 'Status inválido' }), { status: 400 });

    await firestoreUpdate(env, 'newsletter_subscribers', id, { status: toFirestoreValue(status) });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
