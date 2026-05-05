// POST /api/ficha/send-code — Send email verification code for claim flow
import type { APIRoute } from 'astro';
import { firestoreCreate, findListingBySlug } from '../../../lib/firestore-rest';
import { toFirestoreValue } from '../../../lib/firestore-rest';

const FREE_DOMAINS = new Set([
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'protonmail.com',
  'icloud.com', 'mail.com', 'live.com', 'aol.com', 'zoho.com', 'yandex.com',
  'tutanota.com', 'gmail.es', 'hotmail.es', 'yahoo.es',
]);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 });
  }

  const { slug, nombre, email, mensaje, uid } = body;

  if (!slug || !nombre || !email) {
    return new Response(JSON.stringify({ error: 'Faltan campos obligatorios: slug, nombre, email' }), { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: 'Email no válido' }), { status: 400 });
  }

  // Reject free email providers
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || FREE_DOMAINS.has(domain)) {
    return new Response(JSON.stringify({ error: 'Debes usar un email corporativo (no se aceptan proveedores gratuitos como Gmail, Outlook, etc.)' }), { status: 400 });
  }

  // Verify the listing exists
  const found = await findListingBySlug(env, slug);
  if (!found) {
    return new Response(JSON.stringify({ error: 'Ficha no encontrada' }), { status: 404 });
  }

  if (found.listing.verificado) {
    return new Response(JSON.stringify({ error: 'Esta ficha ya está verificada' }), { status: 409 });
  }

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

  // Store in Firestore (document ID = email, sanitized)
  const docId = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
  const ok = await firestoreCreate(env, 'verification_codes_asetemyt', docId, {
    code: { stringValue: code },
    slug: { stringValue: slug },
    nombre: { stringValue: nombre },
    email: { stringValue: email },
    mensaje: { stringValue: mensaje || '' },
    uid: { stringValue: uid || '' },
    createdAt: { timestampValue: now.toISOString() },
    expiresAt: { timestampValue: expiresAt.toISOString() },
    attempts: { integerValue: '0' },
  });

  if (!ok) {
    return new Response(JSON.stringify({ error: 'Error guardando el código' }), { status: 500 });
  }

  // Send email via Resend
  const resendKey = env.RESEND_API_KEY;
  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurada' }), { status: 500 });
  }

  let fromAddress = 'ASETEMYT <noreply@asetemyt.com>';
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a2332;">Tu código de verificación</h2>
      <p style="font-size: 18px;">Introduce este código para verificar tu ficha en ASETEMYT:</p>
      <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a2332;">${code}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Este código caduca en 10 minutos. Si no has solicitado este email, puedes ignorarlo.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">ASETEMYT — Directorio de Cronometraje Industrial</p>
    </div>
  `;

  async function sendEmail(from: string): Promise<boolean> {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Código de verificación ASETEMYT',
        html: emailHtml,
      }),
    });
    return resp.ok;
  }

  // Try with custom domain first, fallback to resend.dev
  let sent = await sendEmail(fromAddress);
  if (!sent) {
    fromAddress = 'ASETEMYT <onboarding@resend.dev>';
    sent = await sendEmail(fromAddress);
  }

  if (!sent) {
    return new Response(JSON.stringify({ error: 'Error enviando el email de verificación' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, message: 'Código enviado' }), { status: 200 });
};
