// POST /api/ficha/claim — Submit a claim request for a listing
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreCreate, findListingBySlug } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';

  console.log('[CLAIM] Request received, method:', request.method);
  console.log('[CLAIM] Authorization header present:', !!request.headers.get('authorization'));
  console.log('[CLAIM] Cookie header present:', !!request.headers.get('cookie'));

  const user = await getAuthUser(request, projectId);
  if (!user) {
    console.log('[CLAIM] Auth failed — returning 401');
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  console.log('[CLAIM] Auth success, user:', user.email || user.user_id);

  const { slug, nombre, email, telefono, relacion, mensaje } = await request.json();

  if (!slug) return new Response(JSON.stringify({ error: 'Slug requerido' }), { status: 400 });

  // Check the listing exists in either collection
  const found = await findListingBySlug(env, slug);
  if (!found) {
    return new Response(JSON.stringify({ error: 'Ficha no encontrada' }), { status: 404 });
  }

  // Check if already claimed or pending
  const { firestoreQuery } = await import('../../../lib/firestore-rest');
  const existingClaims = await firestoreQuery(env, 'claims_asetemyt', 'slug', 'EQUAL', { stringValue: slug });
  const pendingOrApproved = existingClaims.find((c: any) => c.estado === 'pending' || c.estado === 'approved');
  if (pendingOrApproved) {
    return new Response(JSON.stringify({ error: 'Esta ficha ya tiene una reclamación pendiente o aprobada' }), { status: 409 });
  }

  // Create claim
  const claimId = `${slug}_${user.user_id}`;
  const ok = await firestoreCreate(env, 'claims_asetemyt', claimId, {
    slug: { stringValue: slug },
    uid: { stringValue: user.user_id },
    nombre: { stringValue: nombre || '' },
    email: { stringValue: email || user.email || '' },
    telefono: { stringValue: telefono || '' },
    relacion: { stringValue: relacion || '' },
    mensaje: { stringValue: mensaje || '' },
    estado: { stringValue: 'pending' },
    createdAt: { timestampValue: new Date().toISOString() },
  });

  if (!ok) return new Response(JSON.stringify({ error: 'Error creando solicitud' }), { status: 500 });
  return new Response(JSON.stringify({ success: true, message: 'Solicitud enviada. Revisaremos tu petición.' }), { status: 200 });
};
