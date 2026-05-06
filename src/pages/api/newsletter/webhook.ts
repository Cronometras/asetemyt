// POST /api/newsletter/webhook — Handle Stripe events for newsletter subscriptions
import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe-server';
import { firestoreQuery, firestoreUpdate, firestoreCreate } from '../../../lib/firestore-rest';
import { incrementCouponUsage } from '../../../lib/coupons';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const stripe = getStripe(env.STRIPE_SECRET_KEY);

  const body = await request.text();
  const sig = request.headers.get('stripe-signature') || '';

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_NEWSLETTER_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
  }

  // Only handle newsletter events
  const metadata = event.data.object?.metadata;
  if (metadata?.type !== 'newsletter') {
    return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const email = session.metadata?.email || session.customer_email || session.customer_details?.email;
      const company = session.metadata?.company || '';
      const couponCode = session.metadata?.couponCode || '';
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!email) break;

      const normalizedEmail = email.toLowerCase().trim();

      // Upsert subscriber
      const existing = await firestoreQuery(env, 'newsletter_subscribers', 'email', 'EQUAL', { stringValue: normalizedEmail });

      if (existing.length > 0) {
        await firestoreUpdate(env, 'newsletter_subscribers', existing[0].id, {
          status: { stringValue: 'active' },
          company: { stringValue: company },
          stripeCustomerId: { stringValue: customerId },
          stripeSubscriptionId: { stringValue: subscriptionId },
          subscribedAt: { timestampValue: new Date().toISOString() },
          expiresAt: { timestampValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
          couponUsed: couponCode ? { stringValue: couponCode } : undefined,
        });
      } else {
        await firestoreCreate(env, 'newsletter_subscribers', normalizedEmail, {
          email: { stringValue: normalizedEmail },
          company: { stringValue: company },
          status: { stringValue: 'active' },
          plan: { stringValue: 'annual' },
          stripeCustomerId: { stringValue: customerId },
          stripeSubscriptionId: { stringValue: subscriptionId },
          couponUsed: { stringValue: couponCode },
          subscribedAt: { timestampValue: new Date().toISOString() },
          expiresAt: { timestampValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
        });
      }

      if (couponCode) {
        await incrementCouponUsage(env, couponCode);
      }

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      const status = subscription.status;

      const subs = await firestoreQuery(env, 'newsletter_subscribers', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        const updates: Record<string, any> = {
          status: { stringValue: status },
        };
        if (subscription.current_period_end) {
          updates.expiresAt = { timestampValue: new Date(subscription.current_period_end * 1000).toISOString() };
        }
        await firestoreUpdate(env, 'newsletter_subscribers', subs[0].id, updates);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;

      const subs = await firestoreQuery(env, 'newsletter_subscribers', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        await firestoreUpdate(env, 'newsletter_subscribers', subs[0].id, {
          status: { stringValue: 'canceled' },
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription as string;

      const subs = await firestoreQuery(env, 'newsletter_subscribers', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        await firestoreUpdate(env, 'newsletter_subscribers', subs[0].id, {
          status: { stringValue: 'past_due' },
        });
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
