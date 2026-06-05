// GET /api/admin/leads — List leads (admin only)
// PATCH — Update lead status
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreListAll, firestoreUpdate, toFirestoreValue } from '../../../lib/firestore-rest';
import { getCached } from '../../../lib/cache';

// Admin cache TTL: short (60s) so the admin sees fresh-ish data on a manual
// refresh, but re-opening the panel or a back-button navigation does NOT
// burn N Firestore reads per click.
const ADMIN_CACHE_TTL = 60;
const ADMIN_CACHE_KEY_LEADS = 'cache:admin:leads:v1';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const statusFilter = url.searchParams.get('status') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Cache the unfiltered, sorted leads list keyed by status+limit. A different
    // (status, limit) pair → different cache key, so the same data isn't
    // served under mismatched filter combinations. Caching the full list
    // (not just the first 50) means status-filtered queries still hit
    // the cache without a second Firestore read.
    const cacheKey = `${ADMIN_CACHE_KEY_LEADS}:${statusFilter || 'all'}:${limit}`;
    const leads = await getCached(
      env,
      cacheKey,
      async () => {
        const all = await firestoreListAll(env, 'leads_asetemyt');
        return all
          .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, limit);
      },
      ADMIN_CACHE_TTL
    );

    return new Response(JSON.stringify({ leads }), { status: 200 });
  } catch (err: any) {
    console.error('Admin leads error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'id y status requeridos' }), { status: 400 });
    }

    const validStatuses = ['new', 'sent', 'contacted', 'closed'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: `Status inválido. Usar: ${validStatuses.join(', ')}` }), { status: 400 });
    }

    await firestoreUpdate(env, 'leads_asetemyt', id, {
      status: toFirestoreValue(status),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('Admin leads PATCH error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
