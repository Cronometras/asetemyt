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
    const { slug, targetName, contactName, contactEmail, contactPhone, company, serviceNeeded, message } = body;

    if (!slug || !contactName?.trim() || !contactEmail?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre y email son obligatorios.' }), { status: 400 });
    }

    // Verify the target entry exists
    const [consultSnap, softSnap] = await Promise.all([
      adminDb.collection('directorio_consultores_asetemyt').where('slug', '==', slug).limit(1).get(),
      adminDb.collection('directorio_software_asetemyt').where('slug', '==', slug).limit(1).get(),
    ]);

    if (consultSnap.empty && softSnap.empty) {
      return new Response(JSON.stringify({ error: 'Ficha no encontrada.' }), { status: 404 });
    }

    // Rate limit: max 5 requests per IP per hour
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const recentLeads = await adminDb.collection('leads_asetemyt')
      .where('ip', '==', ip)
      .where('createdAt', '>', oneHourAgo)
      .get();

    if (recentLeads.size >= 5) {
      return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' }), { status: 429 });
    }

    // Save lead
    const lead = {
      slug,
      targetName: targetName || slug,
      contactName: contactName.trim().substring(0, 100),
      contactEmail: contactEmail.toLowerCase().trim().substring(0, 200),
      contactPhone: (contactPhone || '').trim().substring(0, 30),
      company: (company || '').trim().substring(0, 200),
      serviceNeeded: (serviceNeeded || '').trim().substring(0, 300),
      message: (message || '').trim().substring(0, 2000),
      status: 'new', // new | sent | contacted | closed
      ip,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection('leads_asetemyt').add(lead);

    // TODO: Send notification email to the entry owner if they have email on file

    return new Response(JSON.stringify({
      success: true,
      message: 'Solicitud enviada correctamente. El profesional te contactará pronto.',
    }), { status: 201 });
  } catch (err: any) {
    console.error('Lead submit error:', err);
    return new Response(JSON.stringify({ error: 'Error interno.' }), { status: 500 });
  }
};
