import type { APIRoute } from 'astro';
import { getAuthUser, authFailureResponse } from '../../../lib/auth-server';
import { findListingBySlug, firestoreQuery, firestoreGet } from '../../../lib/firestore-rest';
import { paymentTransaction, PaymentError, paymentFailure } from '../../../lib/payment-store';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const env = (locals as any).runtime?.env || {};
  const { user, error } = await getAuthUser(request, env.FIREBASE_API_KEY);
  if (!user) return authFailureResponse(error);
  try {
    const slug = url.searchParams.get('slug');
    if (!slug) throw new PaymentError(400, 'Ficha requerida.');
    const found = await findListingBySlug(env, slug);
    if (!found) throw new PaymentError(404, 'Ficha no encontrada.');
    if (found.listing.ownerUid !== user.user_id) throw new PaymentError(403, 'No eres el propietario de esta ficha.');
    const [cases, leads, training] = await Promise.all([
      firestoreQuery(env, 'casos_estudio_asetemyt', 'slug', 'EQUAL', { stringValue: slug }),
      firestoreQuery(env, 'leads_asetemyt', 'slug', 'EQUAL', { stringValue: slug }),
      firestoreGet(env, 'formaciones_asetemyt', slug),
    ]);
    const recent = (a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    return Response.json({ ficha: { slug, nombre: found.listing.nombre, verificado: !!found.listing.verificado },
      training: training ? {description:training.description,courses:training.courses,methodology:training.methodology,format:training.format,status:training.status} : null,
      cases: cases.sort(recent).map(({ id, title, description, results, industry, method, documents, status, createdAt }: any) => ({ id, title, description, results, industry, method, documents, status, createdAt })),
      leads: leads.sort(recent).map(({ id, contactName, contactEmail, contactPhone, company, serviceNeeded, message, status, ownerNotes, createdAt }: any) => ({ id, contactName, contactEmail, contactPhone, company, serviceNeeded, message, status, ownerNotes, createdAt })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return paymentFailure(error); }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const { user, error } = await getAuthUser(request, env.FIREBASE_API_KEY);
  if (!user) return authFailureResponse(error);
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.slug !== 'string' || typeof body.id !== 'string' || !body.id ||
      !['new', 'sent', 'contacted', 'closed'].includes(body.status) ||
      typeof body.ownerNotes !== 'string' || body.ownerNotes.length > 2000) throw new PaymentError(400, 'Datos no válidos.');
    const found = await findListingBySlug(env, body.slug);
    if (!found) throw new PaymentError(404, 'Ficha no encontrada.');
    await paymentTransaction(env, async tx => {
      const listing = await tx.get(found.collection, found.listing.id);
      if (listing?.ownerUid !== user.user_id) throw new PaymentError(403, 'No eres el propietario de esta ficha.');
      const lead = await tx.get('leads_asetemyt', body.id);
      if (!lead || lead.slug !== body.slug) throw new PaymentError(404, 'Solicitud no encontrada.');
      await tx.put('leads_asetemyt', body.id, { ...lead, status: body.status, ownerNotes: body.ownerNotes,
        updatedBy: user.user_id, updatedAt: new Date().toISOString() });
    });
    return Response.json({ success: true });
  } catch (error) { return paymentFailure(error); }
};
