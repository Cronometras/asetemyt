import type { APIRoute } from 'astro';
import { firestoreQuery, firestoreCreate, findListingBySlug } from '../../../lib/firestore-rest';
import { validTextForm } from '../../../lib/form-validation';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

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
    if (!validTextForm(body, { slug: 200, targetName: 200, contactName: 100, contactEmail: 254,
      contactPhone: 30, company: 200, serviceNeeded: 300, message: 2000 }, ['slug', 'contactName', 'contactEmail']) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contactEmail.trim())) {
      return Response.json({ error: 'Datos no válidos.' }, { status: 400 });
    }
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
    const docId = crypto.randomUUID();

    const saved = await firestoreCreate(env, 'leads_asetemyt', docId, {
      slug: { stringValue: slug },
      targetName: { stringValue: found.listing.nombre || slug },
      contactName: { stringValue: stripHtml(contactName.trim().substring(0, 100)) },
      contactEmail: { stringValue: contactEmail.toLowerCase().trim() },
      contactPhone: { stringValue: stripHtml((contactPhone || '').trim().substring(0, 30)) },
      company: { stringValue: stripHtml((company || '').trim().substring(0, 200)) },
      serviceNeeded: { stringValue: stripHtml((serviceNeeded || '').trim().substring(0, 300)) },
      message: { stringValue: stripHtml((message || '').trim().substring(0, 2000)) },
      status: { stringValue: 'new' },
      ip: { stringValue: ip },
      createdAt: { timestampValue: new Date().toISOString() },
    });

    if (!saved) return Response.json({ error: 'No se ha podido guardar.' }, { status: 503 });

    // Notify only after persistence. Delivery failures must not lose the lead.
    if (env.RESEND_API_KEY) {
      const text = (value: string = '') => escapeHtml(value.trim());
      const adminHtml = `<div style="font-family:Arial,sans-serif;max-width:480px;padding:16px"><h2>📬 Nueva solicitud de presupuesto</h2><p><strong>Ficha:</strong> ${text(found.listing.nombre || slug)}</p><p><strong>Solicitante:</strong> ${text(contactName)} — ${text(contactEmail)}${contactPhone ? ' — ' + text(contactPhone) : ''}</p>${company ? `<p><strong>Empresa:</strong> ${text(company)}</p>` : ''}${serviceNeeded ? `<p><strong>Servicio:</strong> ${text(serviceNeeded)}</p>` : ''}${message ? `<p>${text(message)}</p>` : ''}<p><a href="https://asetemyt.com/admin/leads">Ver en el panel →</a></p></div>`;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'ASETEMYT <noreply@asetemyt.com>', to: ['info@asetemyt.com'], subject: `📬 Lead: ${stripHtml(contactName)} - ${stripHtml(found.listing.nombre || slug)}`, html: adminHtml }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) console.warn('Lead notification failed:', response.status);
      } catch { console.warn('Lead notification unavailable'); }
      try {
        const ownerEmail = found.listing.ownerEmail || found.listing.contacto?.email;
        if (found.listing.ownerUid && found.listing.verificado && typeof ownerEmail === 'string' &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
          const ownerResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'ASETEMYT <noreply@asetemyt.com>', to: [ownerEmail.trim()],
              subject: 'Nueva solicitud de presupuesto para tu ficha en ASETEMYT',
              html: adminHtml.replace('https://asetemyt.com/admin/leads', `https://asetemyt.com/mi-cuenta/ficha/?slug=${encodeURIComponent(slug)}`) }),
            signal: AbortSignal.timeout(5000),
          });
          if (!ownerResponse.ok) console.warn('Owner notification failed:', ownerResponse.status);
        }
      } catch { console.warn('Lead notification unavailable'); }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Solicitud enviada correctamente. El profesional te contactará pronto.',
    }), { status: 201 });
  } catch (err: any) {
    console.error('Lead submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
