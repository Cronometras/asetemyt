// POST /api/ficha/verify-code — Verify email code and create Stripe Checkout session
// Now supports coupon codes: free coupons skip Stripe, discount/trial modify the session

import type { APIRoute } from 'astro';
import { firestoreGet, firestoreDelete, firestoreUpdate, findListingBySlug } from '../../../lib/firestore-rest';
import { getStripe } from '../../../lib/stripe-server';
import { validateCoupon, incrementCouponUsage } from '../../../lib/coupons';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 });
  }

  const { slug, email, code, couponCode } = body;

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
  await firestoreUpdate(env, 'verification_codes_asetemyt', docId, {
    attempts: { integerValue: String(attempts + 1) },
  });

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

  // Code is valid — check for coupon
  let couponData: any = null;
  if (couponCode) {
    const couponResult = await validateCoupon(env, couponCode);
    if (!couponResult.valid) {
      return new Response(JSON.stringify({ error: couponResult.error }), { status: 400 });
    }
    couponData = couponResult.coupon;
  }

  // Delete the verification code (one-time use)
  await firestoreDelete(env, 'verification_codes_asetemyt', docId);

  // FREE coupon → skip Stripe entirely, verify directly
  if (couponData?.type === 'free') {
    // Find the listing and mark as verified using the shared helper
    const found = await findListingBySlug(env, doc.slug);
    if (found) {
      await firestoreUpdate(env, found.collection, found.listing.id, {
        verificado: { booleanValue: true },
        ownerEmail: { stringValue: doc.email },
        ownerUid: { stringValue: doc.uid || '' },
        verifiedAt: { timestampValue: new Date().toISOString() },
        verificationType: { stringValue: 'coupon_free' },
        couponUsed: { stringValue: couponData.code },
      });
    }

    // Increment coupon usage
    await incrementCouponUsage(env, couponData.code);

    // Add ficha to user's fichasReclamadas (same as Stripe webhook does)
    if (doc.uid) {
      try {
        const userDoc = await firestoreGet(env, 'users_asetemyt', doc.uid);
        if (userDoc) {
          const currentSlugs: string[] = userDoc.fichasReclamadas || [];
          if (!currentSlugs.includes(doc.slug)) {
            await firestoreUpdate(env, 'users_asetemyt', doc.uid, {
              fichasReclamadas: { arrayValue: { values: [...currentSlugs, doc.slug].map((s: string) => ({ stringValue: s })) } },
            });
          }
        }
      } catch (e) {
        console.error('Error updating fichasReclamadas for free coupon:', e);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      free: true, 
      message: 'Ficha verificada gratuitamente con cupón' 
    }), { status: 200 });
  }

  // Paid (with or without coupon) → create Stripe Checkout session
  const stripeSecretKey = env.STRIPE_SECRET_KEY;
  const priceId = env.STRIPE_PRICE_ID;

  if (!stripeSecretKey || !priceId) {
    return new Response(JSON.stringify({ error: 'Stripe no configurado correctamente' }), { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const stripe = getStripe(stripeSecretKey);

  try {
    const sessionParams: any = {
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
    };

    // Apply coupon to Stripe session
    if (couponData) {
      sessionParams.metadata.couponCode = couponData.code;
      sessionParams.metadata.couponType = couponData.type;

      if (couponData.type === 'discount') {
        // Create a Stripe coupon on-the-fly for the discount percentage
        const stripeCoupon = await stripe.coupons.create({
          percent_off: couponData.value,
          duration: 'once',
        });
        sessionParams.discounts = [{ coupon: stripeCoupon.id }];
        // Remove line_items when using discounts (Stripe requirement)
        // Actually, discounts + line_items work together in Stripe
      } else if (couponData.type === 'trial') {
        // Add a free trial period
        const trialEnd = Math.floor(Date.now() / 1000) + (couponData.value * 30 * 24 * 60 * 60);
        sessionParams.subscription_data = {
          trial_end: trialEnd,
        };
        sessionParams.metadata.trialMonths = String(couponData.value);
        // Add a 0.01€ one-time charge to validate the card immediately
        sessionParams.line_items.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Validación de tarjeta',
              description: 'Cargo de 0,01€ para verificar el método de pago',
            },
            unit_amount: 1, // 0.01€ in cents
          },
          quantity: 1,
        });
      }

      // Increment coupon usage
      await incrementCouponUsage(env, couponData.code);
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ success: true, checkoutUrl: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error creando sesión de pago: ' + (err.message || 'Error desconocido') }), { status: 500 });
  }
};
