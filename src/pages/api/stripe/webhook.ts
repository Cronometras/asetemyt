// POST /api/stripe/webhook — Handle Stripe webhook events (ficha verification + newsletter)
import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe-server';
import { firestoreQuery, firestoreUpdate, firestoreCreate, firestoreGet, findListingBySlug } from '../../../lib/firestore-rest';
import { incrementCouponUsage } from '../../../lib/coupons';

// --- Newsletter event handler ---
async function handleNewsletterEvent(event: any, env: any): Promise<boolean> {
  const metadata = event.data.object?.metadata;
  if (metadata?.type !== 'newsletter') return false;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const email = metadata.email || session.customer_email || session.customer_details?.email;
      const company = metadata.company || '';
      const couponCode = metadata.couponCode || '';
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      if (!email) break;

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await firestoreQuery(env, 'newsletter_subscribers', 'email', 'EQUAL', { stringValue: normalizedEmail });

      if (existing.length > 0) {
        await firestoreUpdate(env, 'newsletter_subscribers', existing[0].id, {
          status: { stringValue: 'active' },
          company: { stringValue: company },
          stripeCustomerId: { stringValue: customerId },
          stripeSubscriptionId: { stringValue: subscriptionId },
          subscribedAt: { timestampValue: new Date().toISOString() },
          expiresAt: { timestampValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() },
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

      if (couponCode) await incrementCouponUsage(env, couponCode);
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status;
      const subs = await firestoreQuery(env, 'newsletter_subscribers', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscription.id });
      if (subs.length > 0) {
        const updates: Record<string, any> = { status: { stringValue: status } };
        if (subscription.current_period_end) {
          updates.expiresAt = { timestampValue: new Date(subscription.current_period_end * 1000).toISOString() };
        }
        await firestoreUpdate(env, 'newsletter_subscribers', subs[0].id, updates);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subs = await firestoreQuery(env, 'newsletter_subscribers', 'stripeSubscriptionId', 'EQUAL', { stringValue: invoice.subscription });
      if (subs.length > 0) {
        await firestoreUpdate(env, 'newsletter_subscribers', subs[0].id, { status: { stringValue: 'past_due' } });
      }
      break;
    }
  }

  return true;
}

// --- Main webhook handler ---
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

  // Route newsletter events to separate handler
  const isNewsletter = await handleNewsletterEvent(event, env);
  if (isNewsletter) {
    return new Response(JSON.stringify({ received: true, type: 'newsletter' }), { status: 200 });
  }

  // --- Ficha verification events ---
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { slug, uid } = session.metadata || {};
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!slug || !uid) break;

      // Update listing: mark as verified and set owner (search both collections)
      const found = await findListingBySlug(env, slug);
      if (found) {
        await firestoreUpdate(env, found.collection, found.listing.id, {
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
      let userDoc = await firestoreGet(env, 'users_asetemyt', uid);
      if (!userDoc) {
        await firestoreCreate(env, 'users_asetemyt', uid, {
          uid: { stringValue: uid },
          email: { stringValue: session.customer_email || session.customer_details?.email || '' },
          nombre: { stringValue: '' },
          createdAt: { timestampValue: new Date().toISOString() },
          stripeCustomerId: { stringValue: customerId },
          fichasReclamadas: { arrayValue: { values: [{ stringValue: slug }] } },
        });
      } else {
        const currentSlugs = userDoc.fichasReclamadas || [];
        if (!currentSlugs.includes(slug)) {
          await firestoreUpdate(env, 'users_asetemyt', uid, {
            stripeCustomerId: { stringValue: customerId },
            fichasReclamadas: { arrayValue: { values: [...currentSlugs, slug].map((s: string) => ({ stringValue: s })) } },
          });
        }
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
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription as string;
      const subs = await firestoreQuery(env, 'subscriptions_asetemyt', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        const currentEnd = new Date(subs[0].currentPeriodEnd || Date.now());
        const newEnd = currentEnd > new Date() ? currentEnd : new Date();
        await firestoreUpdate(env, 'subscriptions_asetemyt', subs[0].id, {
          status: { stringValue: 'active' },
          currentPeriodEnd: { timestampValue: new Date(newEnd.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString() },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      const status = subscription.status;
      const subs = await firestoreQuery(env, 'subscriptions_asetemyt', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        const updates: Record<string, any> = {
          status: { stringValue: status },
        };
        if (subscription.current_period_end) {
          updates.currentPeriodEnd = { timestampValue: new Date(subscription.current_period_end * 1000).toISOString() };
        }
        await firestoreUpdate(env, 'subscriptions_asetemyt', subs[0].id, updates);

        if (['canceled', 'unpaid'].includes(status)) {
          const sub = subs[0];
          const found = await findListingBySlug(env, sub.slug);
          if (found) {
            await firestoreUpdate(env, found.collection, found.listing.id, {
              verificado: { booleanValue: false },
            });
          }
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      const subs = await firestoreQuery(env, 'subscriptions_asetemyt', 'stripeSubscriptionId', 'EQUAL', { stringValue: subscriptionId });
      if (subs.length > 0) {
        const sub = subs[0];
        await firestoreUpdate(env, 'subscriptions_asetemyt', sub.id, {
          status: { stringValue: 'canceled' },
        });
        const found = await findListingBySlug(env, sub.slug);
        if (found) {
          await firestoreUpdate(env, found.collection, found.listing.id, {
            verificado: { booleanValue: false },
          });
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
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
