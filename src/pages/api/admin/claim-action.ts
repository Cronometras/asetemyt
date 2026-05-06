// POST /api/admin/claim-action — Approve or reject a claim (admin only)
// GET /api/admin/claims — List pending and approved claims (admin only)
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreGet, firestoreUpdate, firestoreQuery } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  const { claimId, action } = await request.json(); // action: 'approve' | 'reject'
  if (!claimId || !['approve', 'reject'].includes(action)) {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 });
  }

  const claim = await firestoreGet(env, 'claims_asetemyt', claimId);
  if (!claim) return new Response(JSON.stringify({ error: 'Solicitud no encontrada' }), { status: 404 });

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  await firestoreUpdate(env, 'claims_asetemyt', claimId, {
    estado: { stringValue: newStatus },
    reviewedAt: { timestampValue: new Date().toISOString() },
  });

  return new Response(JSON.stringify({ success: true, status: newStatus }), { status: 200 });
};

// GET /api/admin/claims — List pending and approved claims (admin only)
export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  // Fetch pending AND approved claims
  const [pendingClaims, approvedClaims] = await Promise.all([
    firestoreQuery(env, 'claims_asetemyt', 'estado', 'EQUAL', { stringValue: 'pending' }),
    firestoreQuery(env, 'claims_asetemyt', 'estado', 'EQUAL', { stringValue: 'approved' }),
  ]);

  return new Response(JSON.stringify({ pending: pendingClaims, approved: approvedClaims }), { status: 200 });
};
