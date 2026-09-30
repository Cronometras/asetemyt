import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreListAll } from '../../../lib/firestore-rest';
import { paymentTransaction, PaymentError, paymentFailure } from '../../../lib/payment-store';
import { invalidate } from '../../../lib/cache';
const collections: Record<string,string> = { reviews: 'reviews_asetemyt', jobs: 'jobs_asetemyt', cases: 'casos_estudio_asetemyt', training: 'formaciones_asetemyt', history: 'admin_audit' };
export const GET: APIRoute = async ({ request, locals, url }) => {
 const env = (locals as any).runtime?.env || {};
 const { user } = await getAuthUser(request, env.FIREBASE_API_KEY || '');
 if (!user || !await isAdmin(env, user)) return Response.json({ error: 'Acceso denegado' }, { status: 403 });
 const kind = url.searchParams.get('kind') || 'reviews';
 if (!Object.hasOwn(collections, kind)) return Response.json({ error: 'Tipo no válido' }, { status: 400 });
 const items = await firestoreListAll(env, collections[kind]);
 return Response.json({ items: items.sort((a:any,b:any) => String(b.createdAt).localeCompare(String(a.createdAt))) }, { headers: { 'Cache-Control': 'no-store' } });
};
export const POST: APIRoute = async ({ request, locals }) => {
 const env = (locals as any).runtime?.env || {};
 const { user } = await getAuthUser(request, env.FIREBASE_API_KEY || '');
 if (!user || !await isAdmin(env, user)) return Response.json({ error: 'Acceso denegado' }, { status: 403 });
 try {
  const { kind, id, action } = await request.json();
  if (!Object.hasOwn(collections, kind) || kind === 'history' || typeof id !== 'string' || !['approve','reject'].includes(action)) throw new PaymentError(400, 'Datos no válidos');
  let caseSlug = '';
  await paymentTransaction(env, async tx => {
   const item = await tx.get(collections[kind], id);
   if (!item) throw new PaymentError(404, 'Contenido no encontrado');
   if (kind === 'training' && item.status !== 'pending') throw new PaymentError(409, 'La formación ya no está pendiente de revisión.');
   if (kind === 'cases') {
    if (item.status !== 'pending') throw new PaymentError(409, 'El proyecto ya no está pendiente de revisión.');
    caseSlug = item.slug;
   }
   const status = action === 'reject' ? 'rejected' : kind === 'reviews' ? 'approved' : kind === 'jobs' ? 'active' : 'published';
   await tx.put(collections[kind], id, { ...item, status, reviewedBy: user.user_id, reviewedAt: new Date().toISOString() });
   await tx.put('admin_audit', crypto.randomUUID(), { uid: user.user_id, action, collection: collections[kind], target: id, createdAt: new Date().toISOString() });
  });
  if (caseSlug) await invalidate(env, [`cache:cases:slug:v3:${caseSlug}`]);
  return Response.json({ success: true });
 } catch (error) { return paymentFailure(error); }
};
