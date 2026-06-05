// GET /api/admin/outreach/list — List all outreachs (admin only)
// Query params:
//   status:    filter by status (draft|sent|failed). Empty = all.
//   replied:   "true" | "false" — filter by reply state. Empty = all.
//   slug:      filter by slug
//   limit:     max results (default 100, max 500)
//
// Cache: short (60s) — admin panel; mutations bust keys per-slug via the
// send endpoint if needed. Listed here for visibility.
//
// Returns: { outreachs: [...] } with all fields including emailsPrevios summary.

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreListAll } from '../../../lib/firestore-rest';
import { getCached, invalidate } from '../../../lib/cache';

const OUTREACH_COLLECTION = 'outreach_asetemyt';
const ADMIN_CACHE_TTL = 60;
const ADMIN_CACHE_KEY_PREFIX = 'cache:admin:outreach:list:v1';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const statusFilter = url.searchParams.get('status') || '';
    const repliedFilter = url.searchParams.get('replied') || '';
    const slugFilter = url.searchParams.get('slug') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);

    // Cache key includes all filters so different filter combinations don't
    // poison each other.
    const cacheKey = `${ADMIN_CACHE_KEY_PREFIX}:${statusFilter || 'all'}:${repliedFilter || 'all'}:${slugFilter || 'all'}:${limit}`;

    const outreachs = await getCached(
      env,
      cacheKey,
      async () => {
        const all = await firestoreListAll(env, OUTREACH_COLLECTION);

        // Sort by contactoNumero desc, then sentAt desc
        const sorted = all
          .map((o: any) => ({
            id: o.id,
            slug: o.slug || '',
            collection: o.collection || '',
            fichaNombre: o.fichaNombre || '',
            fichaEmail: o.fichaEmail || '',
            contactoNumero: Number(o.contactoNumero || 0),
            subject: o.subject || '',
            bodySnippet: (o.body || '').substring(0, 200),
            body: o.body || '',
            sentAt: o.sentAt || '',
            sentBy: o.sentBy || '',
            status: o.status || 'draft',
            replied: !!o.replied,
            repliedAt: o.repliedAt || null,
            lastReplyFrom: o.lastReplyFrom || '',
            lastReplyAt: o.lastReplyAt || null,
            emailsPrevios: o.emailsPrevios || [],
            messageId: o.messageId || '',
            failureReason: o.failureReason || '',
            createdAt: o.createdAt || '',
            notes: o.notes || '',
          }))
          .sort((a: any, b: any) => {
            // Sent first, then by sentAt desc, then by contactoNumero desc
            if (a.status === 'sent' && b.status !== 'sent') return -1;
            if (b.status === 'sent' && a.status !== 'sent') return 1;
            const at = (a.sentAt || a.createdAt || '').toString();
            const bt = (b.sentAt || b.createdAt || '').toString();
            return bt.localeCompare(at);
          });

        // Apply filters
        let filtered = sorted;
        if (statusFilter) filtered = filtered.filter((o) => o.status === statusFilter);
        if (repliedFilter === 'true') filtered = filtered.filter((o) => o.replied);
        if (repliedFilter === 'false') filtered = filtered.filter((o) => !o.replied);
        if (slugFilter) filtered = filtered.filter((o) => o.slug === slugFilter);

        return filtered.slice(0, limit);
      },
      ADMIN_CACHE_TTL
    );

    return new Response(JSON.stringify({
      outreachs,
      total: outreachs.length,
      filters: { status: statusFilter, replied: repliedFilter, slug: slugFilter, limit },
    }), { status: 200 });
  } catch (err: any) {
    console.error('Outreach list error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// POST is used to invalidate the cache after a send/draft.
// Body: { invalidateAll: true } or { slug: "..." }
export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    if (payload.invalidateAll) {
      // Invalidate every variation of the list cache
      await invalidate(env, [
        `${ADMIN_CACHE_KEY_PREFIX}:all:all:all:100`,
        `${ADMIN_CACHE_KEY_PREFIX}:sent:all:all:100`,
        `${ADMIN_CACHE_KEY_PREFIX}:sent:false:all:100`,
        `${ADMIN_CACHE_KEY_PREFIX}:sent:true:all:100`,
      ]);
    } else if (payload.slug) {
      await invalidate(env, [
        `${ADMIN_CACHE_KEY_PREFIX}:all:all:${payload.slug}:100`,
        `${ADMIN_CACHE_KEY_PREFIX}:sent:all:${payload.slug}:100`,
      ]);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
