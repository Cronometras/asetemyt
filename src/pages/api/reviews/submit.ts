import type { APIRoute } from 'astro';
import { firestoreQuery, firestoreCreate, findListingBySlug } from '../../../lib/firestore-rest';

/** Remove HTML tags from a string to prevent XSS */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

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
    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada.' }), { status: 404 });
    }

    // Anti-spam: max 1 review per email per slug
    if (authorEmail) {
      const existing = await firestoreQuery(env, 'reviews_asetemyt', 'authorEmail', 'EQUAL', { stringValue: authorEmail.toLowerCase().trim() });
      const forSlug = existing.filter((r: any) => r.slug === slug);
      if (forSlug.length > 0) {
        return new Response(JSON.stringify({ error: 'Ya has dejado una reseña para esta ficha.' }), { status: 409 });
      }
    }

    // Save review (pending moderation) — use email as doc ID for idempotency
    const docId = `${slug}_${(authorEmail || authorName).toLowerCase().trim().replace(/[^a-zA-Z0-9@._-]/g, '_')}_${Date.now()}`;

    await firestoreCreate(env, 'reviews_asetemyt', docId, {
      slug: { stringValue: slug },
      rating: { integerValue: String(Math.round(rating)) },
      authorName: { stringValue: stripHtml(authorName.trim().substring(0, 100)) },
      authorEmail: { stringValue: authorEmail ? authorEmail.toLowerCase().trim() : '' },
      comment: { stringValue: stripHtml((comment || '').trim().substring(0, 1000)) },
      status: { stringValue: 'pending' },
      createdAt: { timestampValue: new Date().toISOString() },
      ip: { stringValue: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown' },
    });

    return new Response(JSON.stringify({ success: true, message: 'Reseña enviada. Será publicada tras revisión.' }), { status: 201 });
  } catch (err: any) {
    console.error('Review submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
