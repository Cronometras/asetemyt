// GET /api/cases — List published case studies for a slug (public).
// Cached per-slug (24h TTL) — case studies are write-rare, read-often.
// Cache is invalidated when a new case is published via POST in this same file.
import type { APIRoute } from 'astro';
import { getAuthUser, authFailureResponse } from '../../../lib/auth-server';
import { firestoreQuery, firestoreCreate, findListingBySlug } from '../../../lib/firestore-rest';
import { getCached, invalidate } from '../../../lib/cache';
import { validTextForm } from '../../../lib/form-validation';
import { validCaseDocuments } from '../../../lib/case-documents';
import { paymentTransaction, PaymentError, paymentFailure } from '../../../lib/payment-store';

const CASES_CACHE_KEY_PREFIX = 'cache:cases:slug:v3';
const CASES_CACHE_TTL = 86400; // 24h

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  const { user, error } = await getAuthUser(request, env.FIREBASE_API_KEY || '');
  if (!user) return authFailureResponse(error);
  try {
    let body;
    try { body = await request.json(); }
    catch { return Response.json({ error: 'JSON no válido.' }, { status: 400 }); }
    if (!validTextForm(body, { slug: 200, title: 200, description: 2000, results: 1000, industry: 100, method: 100 },
      ['slug', 'title', 'description']) || !validCaseDocuments(body.documents)) return Response.json({ error: 'Datos no válidos.' }, { status: 400 });
    const { slug, title, description, results, industry, method } = body;

    if (!slug || !title?.trim() || !description?.trim()) {
      return new Response(JSON.stringify({ error: 'Título y descripción son obligatorios.' }), { status: 400 });
    }

    // Verify the entry exists and is verified
    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada.' }), { status: 404 });
    }

    if (found.listing.ownerUid !== user.user_id) return Response.json({ error: 'Solo el propietario puede publicar.' }, { status: 403 });
    if (!found.listing.verificado) {
      return new Response(JSON.stringify({ error: 'Solo fichas verificadas pueden publicar casos de estudio.' }), { status: 403 });
    }

    const docId = crypto.randomUUID();

    const saved = await firestoreCreate(env, 'casos_estudio_asetemyt', docId, {
      slug: { stringValue: slug },
      title: { stringValue: title.trim().substring(0, 200) },
      description: { stringValue: description.trim().substring(0, 2000) },
      results: { stringValue: (results || '').trim().substring(0, 1000) },
      industry: { stringValue: (industry || '').trim().substring(0, 100) },
      method: { stringValue: (method || '').trim().substring(0, 100) },
      authorUid: { stringValue: user.user_id },
      documents: { arrayValue: { values: (body.documents || []).map((document: any) => ({ mapValue: { fields: { label: { stringValue: document.label.trim() }, url: { stringValue: document.url.trim() } } } })) } },
      status: { stringValue: 'pending' },
      createdAt: { timestampValue: new Date().toISOString() },
    });

    if (!saved) return Response.json({ error: 'No se ha podido guardar.' }, { status: 503 });
    // Invalidate the per-slug cases cache so the new case shows up immediately.
    await invalidate(env, [`${CASES_CACHE_KEY_PREFIX}:${slug}`]);

    return new Response(JSON.stringify({ success: true, message: 'Caso enviado para revisión.' }), { status: 201 });
  } catch (err: any) {
    console.error('Case study submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug requerido.' }), { status: 400 });
    }

    // Cache the per-slug published case list. Cached for 24h, invalidated
    // by POST in this same file.
    const cases = await getCached(
      env,
      `${CASES_CACHE_KEY_PREFIX}:${slug}`,
      async () => {
        const allDocs = await firestoreQuery(env, 'casos_estudio_asetemyt', 'slug', 'EQUAL', { stringValue: slug });
        return allDocs
          .filter((c: any) => c.status === 'published')
          .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
          .slice(0, 10)
          .map(({ title, description, results, industry, method, documents, createdAt }: any) => ({ title, description, results, industry, method,
            documents: documents === undefined ? undefined : validCaseDocuments(documents) ? documents : [], createdAt }));
      },
      CASES_CACHE_TTL
    );

    return Response.json({ cases });
  } catch (err: any) {
    console.error('Cases fetch error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const { user, error } = await getAuthUser(request, env.FIREBASE_API_KEY);
  if (!user) return authFailureResponse(error);
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== 'string' || !body.id || typeof body.slug !== 'string' ||
      !['edit', 'withdraw'].includes(body.action)) throw new PaymentError(400, 'Datos no válidos.');
    if (body.action === 'edit' && (!validTextForm(body, { title: 200, description: 2000, results: 1000, industry: 100, method: 100 }, ['title', 'description']) || !validCaseDocuments(body.documents))) throw new PaymentError(400, 'Proyecto no válido.');
    const found = await findListingBySlug(env, body.slug);
    if (!found) throw new PaymentError(404, 'Ficha no encontrada.');
    await paymentTransaction(env, async tx => {
      const listing = await tx.get(found.collection, found.listing.id);
      if (listing?.ownerUid !== user.user_id) throw new PaymentError(403, 'No eres el propietario de esta ficha.');
      if (body.action === 'edit' && !listing.verificado) throw new PaymentError(403, 'Verifica tu ficha para publicar proyectos.');
      const project = await tx.get('casos_estudio_asetemyt', body.id);
      if (!project || project.slug !== body.slug) throw new PaymentError(404, 'Proyecto no encontrado.');
      const updates = body.action === 'edit' ? Object.fromEntries(['title', 'description', 'results', 'industry', 'method'].map(key => [key, (body[key] || '').trim()])) : {};
      await tx.put('casos_estudio_asetemyt', body.id, { ...project, ...updates,
        ...(body.action === 'edit' ? { documents: body.documents || [] } : {}),
        status: body.action === 'edit' ? 'pending' : 'archived', updatedAt: new Date().toISOString(), updatedBy: user.user_id });
    });
    await invalidate(env, [`${CASES_CACHE_KEY_PREFIX}:${body.slug}`]);
    return Response.json({ success: true });
  } catch (error) { return paymentFailure(error); }
};
