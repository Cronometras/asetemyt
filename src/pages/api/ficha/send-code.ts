import type { APIRoute } from 'astro';
import { getAuthUser, authFailureResponse } from '../../../lib/auth-server';
import { findListingBySlug } from '../../../lib/firestore-rest';
import { paymentTransaction, PaymentError, paymentFailure } from '../../../lib/payment-store';
import { VERIFICATIONS, activeReservation, digest, verificationId, normalizedEmail, ownsListingEmail, requireAvailableListing } from '../../../lib/claim-verification';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const { user, error } = await getAuthUser(request, env.FIREBASE_API_KEY);
  if (!user) return authFailureResponse(error);
  try {
    const body = await request.json().catch(() => null);
    const slug = body?.slug;
    const email = normalizedEmail(body?.email);
    if (typeof slug !== 'string' || !slug || slug.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new PaymentError(400, 'Ficha o email no válido.');
    }
    if (!env.RESEND_API_KEY) throw new PaymentError(503, 'El envío de correo no está configurado.');
    const found = await findListingBySlug(env, slug);
    if (!found) throw new PaymentError(404, 'Ficha no encontrada.');
    const id = await verificationId(user.user_id, slug);
    const code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
    const nonce = crypto.randomUUID();
    const codeHash = await digest(nonce + ':' + code);
    const rateId = await digest(email);
    const now = Date.now();
    const outcome = await paymentTransaction(env, async tx => {
      const listing = await tx.get(found.collection, found.listing.id);
      requireAvailableListing(listing, user.user_id);
      if (!ownsListingEmail(listing, email)) throw new PaymentError(403,
        'Usa el correo publicado en la ficha o uno de su dominio corporativo. Si no tienes acceso, solicita una revisión a info@asetemyt.com.');
      const reservation = await activeReservation(tx, env, slug);
      if (reservation) {
        if (reservation.uid !== user.user_id) throw new PaymentError(409, 'Esta ficha tiene un pago en curso.');
        const existing = await tx.get(VERIFICATIONS, id);
        if (reservation.pending) throw new PaymentError(409, 'El pago está pendiente de confirmación. Consulta Mi cuenta.');
        if (existing?.checkoutUrl) return { success: true, checkoutUrl: existing.checkoutUrl };
        throw new PaymentError(409, 'La verificación está en curso. Reintenta con el código recibido.');
      }
      const rate = await tx.get('ficha_email_limits', rateId);
      if (rate?.lastSent > now - 60000) throw new PaymentError(429, 'Espera un minuto antes de solicitar otro código.');
      const count = rate?.windowStart > now - 3600000 ? Number(rate.count || 0) : 0;
      if (count >= 5) throw new PaymentError(429, 'Has alcanzado el límite de envíos. Inténtalo dentro de una hora.');
      await tx.put('ficha_email_limits', rateId, { lastSent: now, windowStart: count ? rate.windowStart : now, count: count + 1 });
      await tx.put(VERIFICATIONS, id, { uid: user.user_id, slug, email, nonce, codeHash,
        nombre: typeof body.nombre === 'string' ? body.nombre.trim().slice(0, 200) : '',
        mensaje: typeof body.mensaje === 'string' ? body.mensaje.trim().slice(0, 2000) : '',
        collection: found.collection, listingId: found.listing.id,
        createdAt: now, expiresAt: now + 10 * 60000, attempts: 0 });
      return { success: true, checkoutUrl: undefined };
    });
    if (outcome.checkoutUrl) return Response.json(outcome);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'ASETEMYT <noreply@asetemyt.com>', to: [email],
        subject: 'Código de verificación ASETEMYT',
        text: `Tu código de verificación es ${code}. Caduca en 10 minutos. Si no has solicitado este correo, puedes ignorarlo.` }),
    });
    if (!response.ok) throw new PaymentError(503, 'No se pudo enviar el correo. Espera un minuto y solicita otro código.');
    return Response.json({ success: true, message: 'Código enviado' });
  } catch (error) { return paymentFailure(error); }
};
