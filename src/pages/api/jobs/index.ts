import type { APIRoute } from 'astro';
import { firestoreListAll, firestoreQuery, firestoreCreate } from '../../../lib/firestore-rest';
import { getCached, invalidate, CACHE_KEYS } from '../../../lib/cache';

/** Remove HTML tags from a string to prevent XSS */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const body = await request.json();
    const { title, company, location, description, requirements, salary, type, contactEmail, contactUrl } = body;

    if (!title?.trim() || !company?.trim() || !description?.trim() || !contactEmail?.trim()) {
      return new Response(JSON.stringify({ error: 'Título, empresa, descripción y email son obligatorios.' }), { status: 400 });
    }

    // Rate limit: max 3 jobs per IP per day
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

    const recentFromIp = await firestoreQuery(env, 'jobs_asetemyt', 'ip', 'EQUAL', { stringValue: ip });
    const recentToday = recentFromIp.filter((j: any) => j.createdAt > oneDayAgo);

    if (recentToday.length >= 3) {
      return new Response(JSON.stringify({ error: 'Máximo 3 ofertas por día.' }), { status: 429 });
    }

    // Save job
    const docId = `${company.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    await firestoreCreate(env, 'jobs_asetemyt', docId, {
      title: { stringValue: stripHtml(title.trim().substring(0, 200)) },
      company: { stringValue: stripHtml(company.trim().substring(0, 200)) },
      location: { stringValue: stripHtml((location || '').trim().substring(0, 200)) },
      description: { stringValue: stripHtml(description.trim().substring(0, 3000)) },
      requirements: { stringValue: stripHtml((requirements || '').trim().substring(0, 2000)) },
      salary: { stringValue: (salary || '').trim().substring(0, 100) },
      type: { stringValue: type || 'full-time' },
      contactEmail: { stringValue: contactEmail.toLowerCase().trim() },
      contactUrl: { stringValue: (contactUrl || '').trim() },
      status: { stringValue: 'active' },
      ip: { stringValue: ip },
      createdAt: { timestampValue: new Date().toISOString() },
      expiresAt: { timestampValue: new Date(Date.now() + 90 * 86400000).toISOString() },
    });

    // Invalidate the public active-jobs cache so the new offer shows up immediately
    await invalidate(env, [CACHE_KEYS.jobsActive]);

    return new Response(JSON.stringify({ success: true, message: 'Oferta publicada correctamente.' }), { status: 201 });
  } catch (err: any) {
    console.error('Job submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ url, locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const type = url.searchParams.get('type');
    const location = url.searchParams.get('location');

    // Cache only the unfiltered, sorted, active-jobs list. Filtering by
    // type/location happens in-memory after the cache hit. This means a
    // single cache key serves every visitor regardless of URL params,
    // and we get cache hits even with combinations of filters.
    let jobs = await getCached(
      env,
      CACHE_KEYS.jobsActive,
      async () => {
        const all = await firestoreListAll(env, 'jobs_asetemyt');
        return all
          .filter((j: any) => j.status === 'active')
          .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 100);
      },
      3600 // 1h TTL — jobs are time-sensitive, refresh more often than 24h
    );

    // Apply optional filters (post-cache — they're cheap)
    if (type) jobs = jobs.filter((j: any) => j.type === type);
    if (location) jobs = jobs.filter((j: any) => j.location?.toLowerCase().includes(location.toLowerCase()));

    return new Response(JSON.stringify({ jobs }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3300',
      },
    });
  } catch (err: any) {
    console.error('Jobs fetch error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.', details: err.message }), { status: 500 });
  }
};
