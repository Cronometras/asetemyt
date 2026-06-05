// GET /api/admin/outreach/contacted-slugs — Lightweight endpoint for the UI
// to know which fichas have been contacted (and how many times + when).
//
// Returns: { contacted: [{ slug, collection, count, lastSentAt, replied, lastReplyAt, fichaNombre, fichaEmail }] }
//
// Cached 60s. Mutations on /api/admin/outreach/send POST to /api/admin/outreach/list
// with invalidateAll to bust this cache too.

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../../lib/auth-server';
import { isAdmin } from '../../../../lib/admin';
import { firestoreListAll } from '../../../../lib/firestore-rest';
import { getCached } from '../../../../lib/cache';

const OUTREACH_COLLECTION = 'outreach_asetemyt';
const ADMIN_CACHE_TTL = 60;
const ADMIN_CACHE_KEY = 'cache:admin:outreach:contacted-slugs:v1';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const contacted = await getCached(
      env,
      ADMIN_CACHE_KEY,
      async () => {
        const all = await firestoreListAll(env, OUTREACH_COLLECTION);
        // Group by slug
        const bySlug = new Map<string, any>();
        for (const o of all) {
          if (!o.slug) continue;
          const existing = bySlug.get(o.slug);
          if (!existing) {
            bySlug.set(o.slug, {
              slug: o.slug,
              collection: o.collection || '',
              fichaNombre: o.fichaNombre || '',
              fichaEmail: o.fichaEmail || '',
              count: 0,
              lastSentAt: o.sentAt || '',
              replied: !!o.replied,
              lastReplyAt: o.repliedAt || null,
              contactos: [],
            });
          }
          const acc = bySlug.get(o.slug);
          acc.count += 1;
          if ((o.sentAt || '') > (acc.lastSentAt || '')) acc.lastSentAt = o.sentAt || '';
          if (o.replied) {
            acc.replied = true;
            if ((o.repliedAt || '') > (acc.lastReplyAt || '')) acc.lastReplyAt = o.repliedAt;
          }
          acc.contactos.push({
            numero: Number(o.contactoNumero || 0),
            sentAt: o.sentAt || '',
            status: o.status,
            replied: !!o.replied,
          });
        }
        // Sort by lastSentAt desc
        return Array.from(bySlug.values()).sort((a, b) =>
          (b.lastSentAt || '').localeCompare(a.lastSentAt || ''),
        );
      },
      ADMIN_CACHE_TTL
    );

    return new Response(JSON.stringify({ contacted, total: contacted.length }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
