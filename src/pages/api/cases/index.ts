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
    const { slug, title, description, results, industry, method, authorUid } = body;

    if (!slug || !title?.trim() || !description?.trim()) {
      return new Response(JSON.stringify({ error: 'Título y descripción son obligatorios.' }), { status: 400 });
    }

    // Verify the entry exists and is verified
    const [consultSnap, softSnap] = await Promise.all([
      adminDb.collection('directorio_consultores_asetemyt').where('slug', '==', slug).limit(1).get(),
      adminDb.collection('directorio_software_asetemyt').where('slug', '==', slug).limit(1).get(),
    ]);

    const doc = !consultSnap.empty ? consultSnap.docs[0] : !softSnap.empty ? softSnap.docs[0] : null;
    if (!doc) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada.' }), { status: 404 });
    }

    if (!doc.data().verificado) {
      return new Response(JSON.stringify({ error: 'Solo fichas verificadas pueden publicar casos de estudio.' }), { status: 403 });
    }

    const caseStudy = {
      slug,
      title: title.trim().substring(0, 200),
      description: description.trim().substring(0, 2000),
      results: (results || '').trim().substring(0, 1000),
      industry: (industry || '').trim().substring(0, 100),
      method: (method || '').trim().substring(0, 100),
      authorUid: authorUid || null,
      status: 'published',
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection('casos_estudio_asetemyt').add(caseStudy);

    return new Response(JSON.stringify({ success: true, message: 'Caso de estudio publicado.' }), { status: 201 });
  } catch (err: any) {
    console.error('Case study submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug requerido.' }), { status: 400 });
    }

    const snap = await adminDb.collection('casos_estudio_asetemyt')
      .where('slug', '==', slug)
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const cases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return new Response(JSON.stringify({ cases }), { status: 200 });
  } catch (err: any) {
    console.error('Cases fetch error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
