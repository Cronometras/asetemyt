import type { APIRoute } from 'astro';
import { firestoreQuery, firestoreCreate, findListingBySlug } from '../../../lib/firestore-rest';

/** Remove HTML tags from a string to prevent XSS */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    let body;
    try { body = await request.json(); }
    catch { return Response.json({ error: 'JSON no válido.' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ error: 'Datos no válidos.' }, { status: 400 });
    }
    const { slug, rating, authorName, authorEmail, comment } = body;

    // Validate
    if (typeof slug !== 'string' || !slug.trim() || slug.length > 200 ||
        typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'Datos inválidos. Rating debe ser 1-5.' }), { status: 400 });
    }

    if (typeof authorName !== 'string' || !stripHtml(authorName).trim() || authorName.length > 100) {
      return new Response(JSON.stringify({ error: 'Nombre requerido.' }), { status: 400 });
    }

    if ((authorEmail !== undefined && (typeof authorEmail !== 'string' || authorEmail.length > 254 ||
          (authorEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail.trim())))) ||
        (comment !== undefined && (typeof comment !== 'string' || comment.length > 1000))) {
      return Response.json({ error: 'Correo o comentario no válido.' }, { status: 400 });
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

    // Keep personal data out of document IDs and avoid timestamp collisions.
    const docId = crypto.randomUUID();

    const saved = await firestoreCreate(env, 'reviews_asetemyt', docId, {
      slug: { stringValue: slug },
      rating: { integerValue: String(Math.round(rating)) },
      authorName: { stringValue: stripHtml(authorName.trim().substring(0, 100)) },
      authorEmail: { stringValue: authorEmail ? authorEmail.toLowerCase().trim() : '' },
      comment: { stringValue: stripHtml((comment || '').trim().substring(0, 1000)) },
      status: { stringValue: 'pending' },
      createdAt: { timestampValue: new Date().toISOString() },
      ip: { stringValue: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown' },
    });

    if (!saved) return Response.json({ error: 'No se ha podido guardar.' }, { status: 503 });
    return new Response(JSON.stringify({ success: true, message: 'Reseña enviada. Será publicada tras revisión.' }), { status: 201 });
  } catch (err: any) {
    console.error('Review submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
