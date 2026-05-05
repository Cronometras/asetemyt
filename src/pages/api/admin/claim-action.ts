// POST /api/admin/claim-action — Approve or reject a claim (admin only)
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreGet, firestoreUpdate, firestoreQuery } from '../../../lib/firestore-rest';

// Admin UIDs — add yours here
const ADMIN_UIDS = ['REPLACE_WITH_YOUR_FIREBASE_UID'];

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';

  const user = await getAuthUser(request, projectId);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  if (!ADMIN_UIDS.includes(user.user_id)) {
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

  // If approved, mark the listing for payment (ownerUid set after Stripe payment)
  // The user will be directed to pay via Stripe, which sets verificado + ownerUid

  return new Response(JSON.stringify({ success: true, status: newStatus }), { status: 200 });
};

// GET /api/admin/claims — List pending claims (admin only)
export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';

  const user = await getAuthUser(request, projectId);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  if (!ADMIN_UIDS.includes(user.user_id)) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  const pendingClaims = await firestoreQuery(env, 'claims_asetemyt', 'estado', 'EQUAL', { stringValue: 'pending' });
  return new Response(JSON.stringify({ claims: pendingClaims }), { status: 200 });
};
