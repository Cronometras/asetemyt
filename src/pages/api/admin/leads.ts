// GET /api/admin/leads — List leads (admin only)
// PATCH — Update lead status
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreListAll, firestoreUpdate, toFirestoreValue } from '../../../lib/firestore-rest';

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

    const allLeads = await firestoreListAll(env, 'leads_asetemyt');

    // Sort by createdAt descending
    allLeads.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    let filtered = allLeads;
    if (statusFilter) {
      filtered = allLeads.filter((l: any) => l.status === statusFilter);
    }

    return new Response(JSON.stringify({ leads: filtered.slice(0, limit) }), { status: 200 });
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
