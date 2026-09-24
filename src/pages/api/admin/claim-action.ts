// POST /api/admin/claim-action — Approve or reject a claim (admin only)
// GET /api/admin/claims — List pending and approved claims (admin only)
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreGet, firestoreUpdate, firestoreQuery } from '../../../lib/firestore-rest';
import { paymentTransaction, PaymentError, paymentFailure } from '../../../lib/payment-store';
import { findListingBySlug } from '../../../lib/firestore-rest';
import { getCached } from '../../../lib/cache';

// Admin cache TTL: short (60s) — admin sees fresh-ish data on refresh, but
// re-opening the claims panel doesn't re-run 2 full queries per click.
const ADMIN_CACHE_TTL = 60;
const ADMIN_CACHE_KEY_CLAIMS = 'cache:admin:claims:v1';

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
  try {
    const found = await findListingBySlug(env, claim.slug);
    if (!found) throw new PaymentError(404, 'Ficha no encontrada.');
    await paymentTransaction(env, async tx => {
      const current = await tx.get('claims_asetemyt', claimId);
      if (!current || current.estado !== 'pending') throw new PaymentError(409, 'La solicitud ya ha sido revisada.');
      if (action === 'approve') {
        const listing = await tx.get(found.collection, found.listing.id);
        if (!listing || (listing.ownerUid && listing.ownerUid !== current.uid)) throw new PaymentError(409, 'La ficha ya tiene otro propietario.');
        const profile = await tx.get('users_asetemyt', current.uid) || {};
        await tx.put(found.collection, found.listing.id, { ...listing, ownerUid: current.uid, ownerEmail: current.email || '' });
        await tx.put('users_asetemyt', current.uid, { ...profile, fichasReclamadas: [...new Set([...(profile.fichasReclamadas || []), current.slug])] });
      }
      await tx.put('claims_asetemyt', claimId, { ...current, estado: newStatus, reviewedAt: new Date().toISOString(), reviewedBy: user.user_id });
      await tx.put('admin_audit', crypto.randomUUID(), { action: 'claim-' + action, target: claimId, uid: user.user_id, createdAt: new Date().toISOString() });
    });
    return Response.json({ success: true, status: newStatus });
  } catch (error) { return paymentFailure(error); }

};

// GET /api/admin/claims — List pending and approved claims (admin only)
export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  // Single cached payload for both statuses.
  const result = await getCached(
    env,
    ADMIN_CACHE_KEY_CLAIMS,
    async () => {
      const [pendingClaims, approvedClaims] = await Promise.all([
        firestoreQuery(env, 'claims_asetemyt', 'estado', 'EQUAL', { stringValue: 'pending' }),
        firestoreQuery(env, 'claims_asetemyt', 'estado', 'EQUAL', { stringValue: 'approved' }),
      ]);
      return { pending: pendingClaims, approved: approvedClaims };
    },
    ADMIN_CACHE_TTL
  );

  return new Response(JSON.stringify(result), { status: 200 });
};
