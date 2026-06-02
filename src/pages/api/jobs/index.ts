import type { APIRoute } from 'astro';
import { firestoreListAll, firestoreQuery, firestoreCreate } from '../../../lib/firestore-rest';

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

    // Fetch all jobs, filter and sort in-memory (avoids composite index)
    const allJobs = await firestoreListAll(env, 'jobs_asetemyt');

    // Filter active only
    let jobs = allJobs.filter((j: any) => j.status === 'active');

    // Sort by createdAt descending
    jobs.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // Limit to 100
    jobs = jobs.slice(0, 100);

    // Apply optional filters
    if (type) jobs = jobs.filter((j: any) => j.type === type);
    if (location) jobs = jobs.filter((j: any) => j.location?.toLowerCase().includes(location.toLowerCase()));

    return new Response(JSON.stringify({ jobs }), { status: 200 });
  } catch (err: any) {
    console.error('Jobs fetch error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.', details: err.message }), { status: 500 });
  }
};
