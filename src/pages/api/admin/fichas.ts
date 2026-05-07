// /api/admin/fichas — Admin CRUD for directory listings
// GET    → List all fichas (both collections)
// POST   → Create a new ficha directly (skip pending)
// PATCH  → Update any ficha (admin override)
// DELETE → Delete any ficha
// PUT    → Bulk operations (lock_all, unlock_all)

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import {
  firestoreListAll,
  firestoreCreate,
  firestoreUpdate,
  firestoreDelete,
  firestoreBatchUpdate,
  findListingBySlug,
  toFirestoreValue,
} from '../../../lib/firestore-rest';

const COLLECTION_CONSULTORES = 'directorio_consultores_asetemyt';
const COLLECTION_SOFTWARE = 'directorio_software_asetemyt';

// GET — List all fichas
export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const [consultores, software] = await Promise.all([
      firestoreListAll(env, COLLECTION_CONSULTORES),
      firestoreListAll(env, COLLECTION_SOFTWARE),
    ]);

    const all = [
      ...consultores.map((c: any) => ({ ...c, _collection: 'consultores' })),
      ...software.map((s: any) => ({ ...s, _collection: 'software' })),
    ].sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return new Response(JSON.stringify({ fichas: all }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// POST — Create a new ficha directly
export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { nombre, slug, tipo, especialidades, descripcion, servicios, ubicacion, contacto, logo, seccion, verificado } = body;

    if (!nombre?.trim() || !slug?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre y slug son obligatorios' }), { status: 400 });
    }

    const collection = seccion === 'software' ? COLLECTION_SOFTWARE : COLLECTION_CONSULTORES;

    const data = {
      nombre: nombre.trim(),
      slug: slug.trim().toLowerCase(),
      tipo: tipo || 'consultor',
      especialidades: especialidades || [],
      descripcion: descripcion || '',
      servicios: servicios || [],
      ubicacion: ubicacion || { pais: '', ciudad: '', direccion: '' },
      contacto: contacto || { email: '', telefono: '', web: '', linkedin: '' },
      logo: logo || '',
      verificado: verificado ?? false,
      contactoDesbloqueado: true, // New fichas are unlocked by default
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: user.user_id,
    };

    await firestoreCreate(env, collection, data.slug, toFirestoreValue(data));

    return new Response(JSON.stringify({ success: true, slug: data.slug }), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// PATCH — Update any ficha (admin override, no owner check)
export const PATCH: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const { slug, updates } = await request.json();
    if (!slug || !updates) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 });
    }

    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada' }), { status: 404 });
    }

    // Admin can update ALL fields
    const firestoreFields: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      firestoreFields[key] = toFirestoreValue(val);
    }

    if (Object.keys(firestoreFields).length === 0) {
      return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400 });
    }

    const ok = await firestoreUpdate(env, found.collection, found.listing.id, firestoreFields);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Error actualizando ficha' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// PUT — Bulk operations: lock_all (block unverified) or unlock_all
export const PUT: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const { action } = await request.json();

    if (action !== 'lock_all' && action !== 'unlock_all') {
      return new Response(JSON.stringify({ error: 'Acción inválida. Usa lock_all o unlock_all' }), { status: 400 });
    }

    const unlock = action === 'unlock_all';

    // Get all fichas from both collections
    const [consultores, software] = await Promise.all([
      firestoreListAll(env, COLLECTION_CONSULTORES),
      firestoreListAll(env, COLLECTION_SOFTWARE),
    ]);

    const all = [
      ...consultores.map((c: any) => ({ ...c, _col: COLLECTION_CONSULTORES })),
      ...software.map((s: any) => ({ ...s, _col: COLLECTION_SOFTWARE })),
    ];

    // Build batch update array
    const batchUpdates: Array<{ collection: string; docId: string; fields: Record<string, any> }> = [];
    let skipped = 0;

    for (const ficha of all) {
      if (unlock) {
        batchUpdates.push({
          collection: ficha._col,
          docId: ficha.id,
          fields: { contactoDesbloqueado: toFirestoreValue(true) },
        });
      } else {
        // Lock only UNVERIFIED fichas (verified ones stay unlocked)
        if (ficha.verificado) {
          skipped++;
          continue;
        }
        batchUpdates.push({
          collection: ficha._col,
          docId: ficha.id,
          fields: { contactoDesbloqueado: toFirestoreValue(false) },
        });
      }
    }

    // Execute batch (uses Firestore commit — few HTTP requests instead of 180+)
    const updated = await firestoreBatchUpdate(env, batchUpdates);

    return new Response(JSON.stringify({
      success: true,
      action,
      updated,
      skipped,
      total: all.length,
    }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// DELETE — Delete any ficha
export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  try {
    const { slug } = await request.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug requerido' }), { status: 400 });
    }

    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada' }), { status: 404 });
    }

    const ok = await firestoreDelete(env, found.collection, found.listing.id);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Error eliminando ficha' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
