import type Stripe from 'stripe';
import { firestoreQuery } from './firestore-rest';
import { paymentTransaction, PaymentError } from './payment-store';
import { claimListing, redeemCoupon, VERIFICATIONS, RESERVATIONS, verificationId } from './claim-verification';

const objectId = (value: any): string => typeof value === 'string' ? value : value?.id || '';
export function subscriptionPeriodEnd(subscription: any): string {
  const ends = (subscription.items?.data || []).map((item: any) => item.current_period_end).filter(Number.isFinite);
  const end = subscription.current_period_end || (ends.length ? Math.min(...ends) : 0);
  if (!Number.isFinite(end) || end <= 0) throw new PaymentError(503, 'Stripe no ha facilitado el periodo de suscripción.');
  return new Date(end * 1000).toISOString();
}

export async function fulfillCheckout(env: any, stripe: Stripe, session: any) {
  if (!['paid', 'no_payment_required'].includes(session.payment_status)) {
    await updatePendingCheckout(env, session, false);
    return;
  }
  const metadata = session.metadata || {};
  if (metadata.type !== 'newsletter' && !metadata.slug) return;
  const subscriptionId = objectId(session.subscription);
  const customerId = objectId(session.customer);
  if (!subscriptionId || !customerId) throw new PaymentError(503, 'El pago no tiene una suscripción identificable.');
  if (metadata.type !== 'newsletter' && (!metadata.uid || !metadata.verificationId)) {
    // Legacy/unbound paid sessions need review; never acknowledge lost fulfillment.
    throw new PaymentError(503, 'Pago sin verificación de propiedad vinculada. Requiere revisión.');
  }
  const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);
  const end = subscriptionPeriodEnd(subscription);
  const entitled = ['active', 'trialing'].includes(subscription.status);
  const couponRows = metadata.type === 'newsletter' && metadata.couponCode
    ? await firestoreQuery(env, 'cupones_asetemyt', 'code', 'EQUAL', { stringValue: metadata.couponCode.trim().toUpperCase() }) : [];
  await paymentTransaction(env, async tx => {
    const receiptId = `checkout:${session.id}`;
    if (await tx.get('stripe_fulfillments', receiptId)) return;
    if (metadata.type === 'newsletter') {
      const email = (metadata.email || session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
      if (!email) throw new PaymentError(503, 'El pago no tiene un email asociado.');
      const current = await tx.get('newsletter_subscribers', email) || {};
      await tx.put('newsletter_subscribers', email, { ...current, email, company: metadata.company || '',
        status: subscription.status, plan: 'annual', stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId, subscribedAt: new Date().toISOString(), expiresAt: end });
      if (couponRows[0]) await redeemCoupon(tx, couponRows[0].id);
    } else {
      const proof = await tx.get('ficha_payment_intents', metadata.verificationId);
      if (!proof || proof.uid !== metadata.uid || proof.slug !== metadata.slug ||
          (proof.checkoutId && proof.checkoutId !== session.id)) {
        throw new PaymentError(503, 'La sesión de pago no corresponde a la verificación.');
      }
      if (proof.fulfilled && proof.checkoutId !== session.id) throw new PaymentError(503, 'Verificación utilizada por otro pago.');
      await claimListing(tx, proof.collection, proof.listingId, proof, {
        stripeSubscriptionId: subscriptionId, stripeCustomerId: customerId, verificationType: 'stripe',
        subscriptionStatus: subscription.status,
      });
      const listing = await tx.get(proof.collection, proof.listingId);
      await tx.put(proof.collection, proof.listingId, { ...listing, verificado: entitled });
      await tx.put('subscriptions_asetemyt', subscriptionId, {
        uid: proof.uid, slug: proof.slug, collection: proof.collection, listingId: proof.listingId,
        stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, status: subscription.status,
        currentPeriodEnd: end, createdAt: new Date().toISOString(),
      });
      if (proof.coupon?.id) await redeemCoupon(tx, proof.coupon.id, false, proof.nonce);
      await tx.put('ficha_payment_intents', metadata.verificationId, { ...proof, fulfilled: true, checkoutId: session.id });
      const id = await verificationId(proof.uid, proof.slug);
      const current = await tx.get(VERIFICATIONS, id);
      if (current?.nonce === proof.nonce) await tx.put(VERIFICATIONS, id, { ...current, fulfilled: true });
    }
    await tx.put('stripe_fulfillments', receiptId, { sessionId: session.id, processedAt: new Date().toISOString() });
  });
}

export async function updatePendingCheckout(env: any, session: any, failed: boolean) {
  const { slug, verificationId: nonce } = session.metadata || {};
  if (!slug || !nonce) return;
  await paymentTransaction(env, async tx => {
    if (await tx.get('stripe_fulfillments', `checkout:${session.id}`)) return;
    const reservation = await tx.get(RESERVATIONS, slug);
    if (reservation?.nonce !== nonce) return;
    if (reservation.failed && !failed) return;
    await tx.put(RESERVATIONS, slug, { ...reservation, checkoutId: session.id,
      pending: !failed, failed, ...(failed ? { expiresAt: 0 } : {}) });
    const intent = await tx.get('ficha_payment_intents', nonce);
    if (intent?.coupon?.id) {
      const coupon = await tx.get('cupones_asetemyt', intent.coupon.id);
      if (coupon) {
        const reservations = { ...coupon.reservations };
        if (failed) delete reservations[nonce];
        else reservations[nonce] = Number.MAX_SAFE_INTEGER;
        await tx.put('cupones_asetemyt', intent.coupon.id, { ...coupon, reservations });
      }
    }
  });
}

export async function syncSubscription(env: any, stripe: Stripe, event: any) {
  const object = event.data.object;
  const id = event.type.startsWith('customer.subscription.') ? object.id
    : objectId(object.subscription || object.parent?.subscription_details?.subscription);
  if (!id) return; // One-off invoices do not affect ficha subscriptions.
  const subscription: any = await stripe.subscriptions.retrieve(id, { expand: ['latest_invoice'] });
  const [fichas, newsletters] = await Promise.all([
    firestoreQuery(env, 'subscriptions_asetemyt', 'stripeSubscriptionId', 'EQUAL', { stringValue: id }),
    firestoreQuery(env, 'newsletter_subscribers', 'stripeSubscriptionId', 'EQUAL', { stringValue: id }),
  ]);
  if (!fichas.length && !newsletters.length) {
    if (['ficha', 'newsletter'].includes(subscription.metadata?.type)) throw new PaymentError(503, 'Activación inicial pendiente. Reintentar el evento.');
    return;
  }
  const end = subscriptionPeriodEnd(subscription);
  // Refresh from Stripe rather than applying potentially out-of-order event data.
  const latestInvoice = subscription.latest_invoice;
  const entitled = subscription.status === 'trialing' || (subscription.status === 'active' &&
    (latestInvoice?.paid === true || latestInvoice?.status === 'paid'));
  await paymentTransaction(env, async tx => {
    for (const row of fichas) {
      const current = await tx.get('subscriptions_asetemyt', row.id);
      if (!current || (current.lastEventCreated || 0) > (event.created || 0)) continue;
      await tx.put('subscriptions_asetemyt', row.id, { ...current, status: subscription.status,
        currentPeriodEnd: end, lastEventCreated: event.created || 0 });
      // Legacy subscription rows have no listingId. Resolve their owned listing.
      const collections = current.collection ? [current.collection] : ['directorio_consultores_asetemyt', 'directorio_software_asetemyt'];
      for (const collection of collections) {
        const rows = current.listingId ? [{ id: current.listingId }] : await firestoreQuery(env, collection, 'slug', 'EQUAL', { stringValue: current.slug });
        for (const item of rows) {
          const listing = await tx.get(collection, item.id);
          if (listing?.ownerUid === current.uid && (!listing.stripeSubscriptionId || listing.stripeSubscriptionId === id)) {
            await tx.put(collection, item.id, { ...listing, verificado: entitled, subscriptionStatus: subscription.status });
          }
        }
      }
    }
    for (const row of newsletters) {
      const current = await tx.get('newsletter_subscribers', row.id);
      if (!current || current.stripeSubscriptionId !== id || (current.lastEventCreated || 0) > (event.created || 0)) continue;
      await tx.put('newsletter_subscribers', row.id, { ...current, status: subscription.status,
        expiresAt: end, lastEventCreated: event.created || 0 });
    }
  });
}
