// GET /api/admin/subscribers — List newsletter subscribers (admin only)
// PATCH — Update subscriber status
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreQuery, firestoreUpdate, toFirestoreValue } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });

  try {
    const status = url.searchParams.get('status') || '';
    const search = url.searchParams.get('search') || '';

    let subs = await firestoreQuery(env, 'newsletter_subscribers', 'status', 'EQUAL', { stringValue: 'active' });
    // Also get non-active
    const inactive = await firestoreQuery(env, 'newsletter_subscribers', 'status', 'EQUAL', { stringValue: 'canceled' });
    const pastDue = await firestoreQuery(env, 'newsletter_subscribers', 'status', 'EQUAL', { stringValue: 'past_due' });
    subs = [...subs, ...inactive, ...pastDue];

    subs.sort((a: any, b: any) => (b.subscribedAt || '').localeCompare(a.subscribedAt || ''));

    if (status) subs = subs.filter((s: any) => s.status === status);
    if (search) {
      const q = search.toLowerCase();
      subs = subs.filter((s: any) => (s.email || '').toLowerCase().includes(q) || (s.company || '').toLowerCase().includes(q));
    }

    return new Response(JSON.stringify({ subscribers: subs }), { status: 200 });
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
