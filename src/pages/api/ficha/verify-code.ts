import type { APIRoute } from 'astro';
import { getAuthUser, authFailureResponse } from '../../../lib/auth-server';
import { getStripe } from '../../../lib/stripe-server';
import { validateCoupon } from '../../../lib/coupons';
import { paymentTransaction, PaymentError, paymentFailure } from '../../../lib/payment-store';
import { VERIFICATIONS, RESERVATIONS, digest, verificationId, normalizedEmail, ownsListingEmail,
  requireAvailableListing, claimListing, redeemCoupon, holdCoupon, activeReservation } from '../../../lib/claim-verification';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const { user, error } = await getAuthUser(request, env.FIREBASE_API_KEY);
  if (!user) return authFailureResponse(error);
  try {
    const body = await request.json().catch(() => null);
    const { slug, code } = body || {};
    const email = normalizedEmail(body?.email);
    const couponCode = typeof body?.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : '';
    if (typeof slug !== 'string' || !slug || typeof code !== 'string' || !/^\d{6}$/.test(code) || !email) {
      throw new PaymentError(400, 'Ficha, email o código no válido.');
    }
    const id = await verificationId(user.user_id, slug);
    // A successful validation remains retryable if Stripe is temporarily unavailable.
    const checked = await paymentTransaction(env, async tx => {
      const proof = await tx.get(VERIFICATIONS, id);
      if (!proof || proof.uid !== user.user_id || proof.slug !== slug || proof.email !== email) {
        throw new PaymentError(404, 'Solicita un código para esta ficha y este email.');
      }
      if (proof.attempts >= 5) throw new PaymentError(429, 'Demasiados intentos. Solicita otro código.');
      if (!proof.verifiedAt && proof.expiresAt <= Date.now()) throw new PaymentError(410, 'El código ha caducado.');
      if (await digest(proof.nonce + ':' + code) !== proof.codeHash) {
        await tx.put(VERIFICATIONS, id, { ...proof, attempts: proof.attempts + 1 });
        return { invalid: true, proof };
      }
      const updated = { ...proof, verifiedAt: proof.verifiedAt || Date.now() };
      await tx.put(VERIFICATIONS, id, updated);
      return { invalid: false, proof: updated };
    });
    if (checked.invalid) throw new PaymentError(400, 'Código incorrecto.');
    if (checked.proof.fulfilled) return Response.json({ success: true, free: checked.proof.free || false, checkoutUrl: '/mi-cuenta' });
    if (checked.proof.checkoutUrl && checked.proof.plan?.expires_at * 1000 > Date.now()) {
      if ((checked.proof.couponCode || '') !== couponCode) throw new PaymentError(409, 'Ya hay un pago preparado con otro cupón.');
      return Response.json({ success: true, checkoutUrl: checked.proof.checkoutUrl });
    }
    let coupon: any = null;
    if (couponCode && !checked.proof.plan) {
      const result = await validateCoupon(env, couponCode);
      if (!result.valid) throw new PaymentError(400, result.error || 'Cupón no válido.');
      coupon = result.coupon;
    }
    const outcome = await paymentTransaction(env, async tx => {
      const proof = await tx.get(VERIFICATIONS, id);
      if (!proof || proof.nonce !== checked.proof.nonce) throw new PaymentError(409, 'Se ha enviado un código nuevo.');
      if (proof.fulfilled) return { free: !!proof.free, proof };
      const listing = await tx.get(proof.collection, proof.listingId);
      requireAvailableListing(listing, proof.uid);
      if (!ownsListingEmail(listing, proof.email)) throw new PaymentError(403, 'El correo de la ficha ha cambiado. Solicita una revisión.');
      const reservation = await activeReservation(tx, env, slug);
      if (reservation && reservation.nonce !== proof.nonce) {
        throw new PaymentError(409, 'Esta ficha tiene otro pago en curso.');
      }
      if (proof.plan) {
        if (proof.couponCode !== couponCode) throw new PaymentError(409, 'Ya hay un pago preparado con otro cupón.');
        if (proof.plan.expires_at * 1000 <= Date.now()) throw new PaymentError(410, 'El pago ha caducado. Solicita otro código.');
        return { free: false, proof };
      }
      if (proof.expiresAt <= Date.now()) throw new PaymentError(410, 'El código ha caducado. Solicita otro código.');
      if (coupon?.type === 'free') {
        await redeemCoupon(tx, coupon.id, true);
        await claimListing(tx, proof.collection, proof.listingId, proof, { verificationType: 'coupon_free', couponUsed: coupon.code });
        await tx.put(VERIFICATIONS, id, { ...proof, fulfilled: true, free: true });
        return { free: true, proof };
      }
      if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID || !env.STRIPE_WEBHOOK_SECRET) {
        throw new PaymentError(503, 'El pago no está configurado. Puedes reintentar con este código.');
      }
      const origin = new URL(request.url).origin;
      const metadata = { type: 'ficha', slug, uid: proof.uid, verificationId: proof.nonce };
      const plan: any = {
        mode: 'subscription', customer_email: proof.email, metadata,
        subscription_data: { metadata },
        line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
        automatic_tax: { enabled: true },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        success_url: `${origin}/mi-cuenta?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/reclamar/${encodeURIComponent(slug)}?canceled=1`,
      };
      const profile = await tx.get('users_asetemyt', proof.uid);
      if (profile?.stripeCustomerId) {
        delete plan.customer_email;
        plan.customer = profile.stripeCustomerId;
        plan.customer_update = { address: 'auto' };
      }
      if (coupon?.type === 'trial') plan.subscription_data.trial_period_days = coupon.value * 30;
      if (coupon) await holdCoupon(tx, coupon, proof.nonce, plan.expires_at * 1000);
      const prepared = { ...proof, couponCode, coupon, plan };
      await tx.put(VERIFICATIONS, id, prepared);
      await tx.put('ficha_payment_intents', proof.nonce, prepared);
      await tx.put(RESERVATIONS, slug, { uid: proof.uid, nonce: proof.nonce, expiresAt: plan.expires_at * 1000 });
      return { free: false, proof: prepared };
    });
    if (outcome.free) return Response.json({ success: true, free: true });
    const proof = outcome.proof;
    const stripe = getStripe(env.STRIPE_SECRET_KEY);
    const params = structuredClone(proof.plan);
    if (proof.coupon?.type === 'discount') {
      const discount = await stripe.coupons.create({ percent_off: proof.coupon.value, duration: 'once' },
        { idempotencyKey: `ficha-coupon-${proof.nonce}` });
      params.discounts = [{ coupon: discount.id }];
    }
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: `ficha-checkout-${proof.nonce}` });
    if (!session.url) throw new PaymentError(503, 'El pago está pendiente de confirmación. Consulta Mi cuenta.');
    await paymentTransaction(env, async tx => {
      const current = await tx.get(VERIFICATIONS, id);
      if (current?.nonce === proof.nonce) await tx.put(VERIFICATIONS, id, { ...current, checkoutId: session.id, checkoutUrl: session.url });
      const intent = await tx.get('ficha_payment_intents', proof.nonce);
      await tx.put('ficha_payment_intents', proof.nonce, { ...intent, checkoutId: session.id });
      const reservation = await tx.get(RESERVATIONS, slug);
      if (reservation?.nonce === proof.nonce) await tx.put(RESERVATIONS, slug, { ...reservation, checkoutId: session.id });
    });
    return Response.json({ success: true, checkoutUrl: session.url });
  } catch (error) { return paymentFailure(error); }
};
