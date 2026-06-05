// GET /api/cases — List published case studies for a slug (public).
// Cached per-slug (24h TTL) — case studies are write-rare, read-often.
// Cache is invalidated when a new case is published via POST in this same file.
import type { APIRoute } from 'astro';
import { firestoreQuery, firestoreCreate, findListingBySlug } from '../../../lib/firestore-rest';
import { getCached, invalidate } from '../../../lib/cache';

const CASES_CACHE_KEY_PREFIX = 'cache:cases:slug:v1';
const CASES_CACHE_TTL = 86400; // 24h

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const body = await request.json();
    const { slug, title, description, results, industry, method, authorUid } = body;

    if (!slug || !title?.trim() || !description?.trim()) {
      return new Response(JSON.stringify({ error: 'Título y descripción son obligatorios.' }), { status: 400 });
    }

    // Verify the entry exists and is verified
    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada.' }), { status: 404 });
    }

    if (!found.listing.verificado) {
      return new Response(JSON.stringify({ error: 'Solo fichas verificadas pueden publicar casos de estudio.' }), { status: 403 });
    }

    const docId = `${slug}_${Date.now()}`;

    await firestoreCreate(env, 'casos_estudio_asetemyt', docId, {
      slug: { stringValue: slug },
      title: { stringValue: title.trim().substring(0, 200) },
      description: { stringValue: description.trim().substring(0, 2000) },
      results: { stringValue: (results || '').trim().substring(0, 1000) },
      industry: { stringValue: (industry || '').trim().substring(0, 100) },
      method: { stringValue: (method || '').trim().substring(0, 100) },
      authorUid: { stringValue: authorUid || '' },
      status: { stringValue: 'published' },
      createdAt: { timestampValue: new Date().toISOString() },
    });

    // Invalidate the per-slug cases cache so the new case shows up immediately.
    await invalidate(env, [`${CASES_CACHE_KEY_PREFIX}:${slug}`]);

    return new Response(JSON.stringify({ success: true, message: 'Caso de estudio publicado.' }), { status: 201 });
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
          .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 10);
      },
      CASES_CACHE_TTL
    );

    return new Response(JSON.stringify({ cases }), { status: 200 });
  } catch (err: any) {
    console.error('Cases fetch error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
