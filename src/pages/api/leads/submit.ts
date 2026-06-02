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
    const { slug, targetName, contactName, contactEmail, contactPhone, company, serviceNeeded, message } = body;

    if (!slug || !contactName?.trim() || !contactEmail?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre y email son obligatorios.' }), { status: 400 });
    }

    // Verify the target entry exists
    const found = await findListingBySlug(env, slug);
    if (!found) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada.' }), { status: 404 });
    }

    // Rate limit: max 5 requests per IP per hour
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const recentLeads = await firestoreQuery(env, 'leads_asetemyt', 'ip', 'EQUAL', { stringValue: ip });
    const recentInWindow = recentLeads.filter((l: any) => l.createdAt > oneHourAgo);

    if (recentInWindow.length >= 5) {
      return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' }), { status: 429 });
    }

    // Save lead — strip HTML from all text fields
    const docId = `${slug}_${Date.now()}`;

    await firestoreCreate(env, 'leads_asetemyt', docId, {
      slug: { stringValue: slug },
      targetName: { stringValue: stripHtml(targetName || slug) },
      contactName: { stringValue: stripHtml(contactName.trim().substring(0, 100)) },
      contactEmail: { stringValue: contactEmail.toLowerCase().trim().substring(0, 200) },
      contactPhone: { stringValue: stripHtml((contactPhone || '').trim().substring(0, 30)) },
      company: { stringValue: stripHtml((company || '').trim().substring(0, 200)) },
      serviceNeeded: { stringValue: stripHtml((serviceNeeded || '').trim().substring(0, 300)) },
      message: { stringValue: stripHtml((message || '').trim().substring(0, 2000)) },
      status: { stringValue: 'new' },
      ip: { stringValue: ip },
      createdAt: { timestampValue: new Date().toISOString() },
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Solicitud enviada correctamente. El profesional te contactará pronto.',
    }), { status: 201 });
  } catch (err: any) {
    console.error('Lead submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
