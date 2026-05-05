// POST /api/ficha/verify-code — Verify email code and create Stripe Checkout session
import type { APIRoute } from 'astro';
import { firestoreGet, firestoreDelete, getAccessToken } from '../../../lib/firestore-rest';
import { getStripe } from '../../../lib/stripe-server';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 });
  }

  const { slug, email, code } = body;

  if (!slug || !email || !code) {
    return new Response(JSON.stringify({ error: 'Faltan campos: slug, email, code' }), { status: 400 });
  }

  // Read verification document
  const docId = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
  const doc = await firestoreGet(env, 'verification_codes_asetemyt', docId);

  if (!doc) {
    return new Response(JSON.stringify({ error: 'No se encontró un código para este email. Solicita uno nuevo.' }), { status: 404 });
  }

  // Check attempts
  const attempts = doc.attempts || 0;
  if (attempts >= 5) {
    await firestoreDelete(env, 'verification_codes_asetemyt', docId);
    return new Response(JSON.stringify({ error: 'Demasiados intentos. Solicita un nuevo código.' }), { status: 429 });
  }

  // Increment attempts
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';
  const token = await getAccessToken(env);
  await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/verification_codes_asetemyt/${docId}?updateMask.fieldPaths=attempts`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { attempts: { integerValue: String(attempts + 1) } } }),
    }
  );

  // Check expiration
  const expiresAt = new Date(doc.expiresAt);
  if (Date.now() > expiresAt.getTime()) {
    await firestoreDelete(env, 'verification_codes_asetemyt', docId);
    return new Response(JSON.stringify({ error: 'El código ha caducado. Solicita uno nuevo.' }), { status: 410 });
  }

  // Check code match
  if (doc.code !== code) {
    return new Response(JSON.stringify({ error: 'Código incorrecto' }), { status: 401 });
  }

  // Code is valid — create Stripe Checkout session
  const stripeSecretKey = env.STRIPE_SECRET_KEY;
  const priceId = env.STRIPE_PRICE_ID;

  if (!stripeSecretKey || !priceId) {
    return new Response(JSON.stringify({ error: 'Stripe no configurado correctamente' }), { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const stripe = getStripe(stripeSecretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      metadata: {
        slug: doc.slug,
        nombre: doc.nombre,
        email: doc.email,
        mensaje: doc.mensaje || '',
        uid: doc.uid || '',
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      automatic_tax: { enabled: true },
      success_url: `${origin}/mi-cuenta?success=true`,
      cancel_url: `${origin}/reclamar/${doc.slug}`,
    });

    // Delete the verification code (one-time use)
    await firestoreDelete(env, 'verification_codes_asetemyt', docId);

    return new Response(JSON.stringify({ success: true, checkoutUrl: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error creando sesión de pago: ' + (err.message || 'Error desconocido') }), { status: 500 });
  }
};
