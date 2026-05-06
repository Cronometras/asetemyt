import type { APIRoute } from 'astro';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Init admin SDK
if (!getApps().length) {
  const sa = JSON.parse(process.env.FIREBASE_SA || '{}');
  initializeApp({ credential: cert(sa) });
}
const adminDb = getFirestore();

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { slug, rating, authorName, authorEmail, comment } = body;

    // Validate
    if (!slug || !rating || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'Datos inválidos. Rating debe ser 1-5.' }), { status: 400 });
    }

    if (!authorName || !authorName.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre requerido.' }), { status: 400 });
    }

    // Check the entry exists in either collection
    const [consultSnap, softSnap] = await Promise.all([
      adminDb.collection('directorio_consultores_asetemyt').where('slug', '==', slug).limit(1).get(),
      adminDb.collection('directorio_software_asetemyt').where('slug', '==', slug).limit(1).get(),
    ]);

    if (consultSnap.empty && softSnap.empty) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada.' }), { status: 404 });
    }

    // Anti-spam: max 1 review per email per slug
    if (authorEmail) {
      const existing = await adminDb.collection('reviews_asetemyt')
        .where('slug', '==', slug)
        .where('authorEmail', '==', authorEmail.toLowerCase().trim())
        .limit(1)
        .get();
      if (!existing.empty) {
        return new Response(JSON.stringify({ error: 'Ya has dejado una reseña para esta ficha.' }), { status: 409 });
      }
    }

    // Save review (pending moderation)
    const review = {
      slug,
      rating: Math.round(rating),
      authorName: authorName.trim().substring(0, 100),
      authorEmail: authorEmail ? authorEmail.toLowerCase().trim() : null,
      comment: (comment || '').trim().substring(0, 1000),
      status: 'pending', // pending | approved | rejected
      createdAt: new Date().toISOString(),
      ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown',
    };

    await adminDb.collection('reviews_asetemyt').add(review);

    return new Response(JSON.stringify({ success: true, message: 'Reseña enviada. Será publicada tras revisión.' }), { status: 201 });
  } catch (err: any) {
    console.error('Review submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
