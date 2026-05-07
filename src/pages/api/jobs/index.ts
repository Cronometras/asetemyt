import type { APIRoute } from 'astro';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  const sa = JSON.parse(process.env.FIREBASE_SA || '{}');
  initializeApp({ credential: cert(sa) });
}
const adminDb = getFirestore();

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { title, company, location, description, requirements, salary, type, contactEmail, contactUrl } = body;

    if (!title?.trim() || !company?.trim() || !description?.trim() || !contactEmail?.trim()) {
      return new Response(JSON.stringify({ error: 'Título, empresa, descripción y email son obligatorios.' }), { status: 400 });
    }

    // Rate limit
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const recent = await adminDb.collection('jobs_asetemyt').where('ip', '==', ip).where('createdAt', '>', oneDayAgo).get();
    if (recent.size >= 3) {
      return new Response(JSON.stringify({ error: 'Máximo 3 ofertas por día.' }), { status: 429 });
    }

    const job = {
      title: title.trim().substring(0, 200),
      company: company.trim().substring(0, 200),
      location: (location || '').trim().substring(0, 200),
      description: description.trim().substring(0, 3000),
      requirements: (requirements || '').trim().substring(0, 2000),
      salary: (salary || '').trim().substring(0, 100),
      type: type || 'full-time', // full-time, part-time, contract, freelance
      contactEmail: contactEmail.toLowerCase().trim(),
      contactUrl: (contactUrl || '').trim(),
      status: 'active', // active | closed | expired
      ip,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(), // 90 days
    };

    await adminDb.collection('jobs_asetemyt').add(job);

    return new Response(JSON.stringify({ success: true, message: 'Oferta publicada correctamente.' }), { status: 201 });
  } catch (err: any) {
    console.error('Job submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const type = url.searchParams.get('type');
    const location = url.searchParams.get('location');

    // Avoid composite index requirement: fetch all, filter in-memory
    const snap = await adminDb.collection('jobs_asetemyt').orderBy('createdAt', 'desc').limit(100).get();
    let jobs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Filter active only (avoid composite index on status+createdAt)
    jobs = jobs.filter((j: any) => j.status === 'active');

    // Apply optional filters
    if (type) jobs = jobs.filter((j: any) => j.type === type);
    if (location) jobs = jobs.filter((j: any) => j.location?.toLowerCase().includes(location.toLowerCase()));

    return new Response(JSON.stringify({ jobs }), { status: 200 });
  } catch (err: any) {
    console.error('Jobs fetch error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.', details: err.message }), { status: 500 });
  }
};
