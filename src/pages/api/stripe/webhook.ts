// POST /api/stripe/webhook — Handle Stripe webhook events
import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe-server';
import { firestoreQuery, firestoreUpdate, firestoreCreate, firestoreGet, toFirestoreValue } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const stripe = getStripe(env.STRIPE_SECRET_KEY);

  const body = await request.text();
  const sig = request.headers.get('stripe-signature') || '';

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { slug, uid } = session.metadata || {};
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!slug || !uid) break;

      // Update listing: mark as verified and set owner
      const results = await firestoreQuery(env, 'directorio_asetemyt', 'slug', 'EQUAL', { stringValue: slug });
      if (results.length > 0) {
        await firestoreUpdate(env, 'directorio_asetemyt', results[0].id, {
          verificado: { booleanValue: true },
          ownerUid: { stringValue: uid },
          claimedAt: { timestampValue: new Date().toISOString() },
        });
      }

      // Create subscription record
      const subDocId = `${uid}_${slug}`;
      await firestoreCreate(env, 'subscriptions_asetemyt', subDocId, {
        uid: { stringValue: uid },
        slug: { stringValue: slug },
        stripeCustomerId: { stringValue: customerId },
        stripeSubscriptionId: { stringValue: subscriptionId },
        status: { stringValue: 'active' },
        currentPeriodEnd: { timestampValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
        createdAt: { timestampValue: new Date().toISOString() },
      });

      // Update user: add stripeCustomerId and ficha to list
      const userDoc = await firestoreGet(env, 'users_asetemyt', uid);
      if (userDoc) {
        const currentSlugs = userDoc.fichasReclamadas || [];
        await firestoreUpdate(env, 'users_asetemyt', uid, {
          stripeCustomerId: { stringValue: customerId },
          fichasReclamadas: { arrayValue: { values: [...currentSlugs, slug].map((s: string) => ({ stringValue: s })) } },
        });
      }

      // Update claim status
      const claimId = `${slug}_${uid}`;
      await firestoreUpdate(env, 'claims_asetemyt', claimId, {
        estado: { stringValue: 'approved' },
        reviewedAt: { timestampValue: new Date().toISOString() },
      });

      break;
    }

    case 'invoice.payment_succeeded': {
      // Renewal — extend the period
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription as string;
      const subs = await firestoreQuery(env, 'subscriptions_asetemyt', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        await firestoreUpdate(env, 'subscriptions_asetemyt', subs[0].id, {
          status: { stringValue: 'active' },
          currentPeriodEnd: { timestampValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      // Subscription canceled — remove verified status
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      const subs = await firestoreQuery(env, 'subscriptions_asetemyt', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        const sub = subs[0];
        await firestoreUpdate(env, 'subscriptions_asetemyt', sub.id, {
          status: { stringValue: 'canceled' },
        });
        // Remove verified status from listing
        const results = await firestoreQuery(env, 'directorio_asetemyt', 'slug', 'EQUAL', { stringValue: sub.slug });
        if (results.length > 0) {
          await firestoreUpdate(env, 'directorio_asetemyt', results[0].id, {
            verificado: { booleanValue: false },
          });
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      // Payment failed — mark subscription as past_due
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription as string;
      const subs = await firestoreQuery(env, 'subscriptions_asetemyt', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        await firestoreUpdate(env, 'subscriptions_asetemyt', subs[0].id, {
          status: { stringValue: 'past_due' },
        });
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
