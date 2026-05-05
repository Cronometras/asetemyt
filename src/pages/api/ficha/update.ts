// POST /api/ficha/update — Update a claimed listing (only by owner)
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreUpdate, toFirestoreValue, findListingBySlug } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';

  const { user, error: authError } = await getAuthUser(request, projectId);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { slug, updates } = await request.json();
  if (!slug || !updates) return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 });

  // Find the document by slug in either collection
  const found = await findListingBySlug(env, slug);
  if (!found) return new Response(JSON.stringify({ error: 'Ficha no encontrada' }), { status: 404 });

  if (found.listing.ownerUid !== user.user_id) {
    return new Response(JSON.stringify({ error: 'No eres el propietario de esta ficha' }), { status: 403 });
  }

  // Allowed editable fields
  const allowedFields = ['descripcion', 'especialidades', 'servicios', 'contacto', 'logo', 'ubicacion'];
  const firestoreFields: Record<string, any> = {};

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      firestoreFields[key] = toFirestoreValue(updates[key]);
    }
  }

  if (Object.keys(firestoreFields).length === 0) {
    return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400 });
  }

  // Update in the correct collection
  const ok = await firestoreUpdate(env, found.collection, found.listing.id, firestoreFields);

  if (!ok) return new Response(JSON.stringify({ error: 'Error actualizando ficha' }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
