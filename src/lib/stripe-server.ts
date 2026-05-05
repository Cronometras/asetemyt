// Server-side Stripe helpers
import Stripe from 'stripe';

export function getStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as any });
}

// Verify Stripe webhook signature
export async function verifyStripeWebhook(
  body: string,
  signature: string,
  secret: string
): Promise<Stripe.Event> {
  const stripe = getStripe(process.env.STRIPE_SECRET_KEY || '');
  return stripe.webhooks.constructEvent(body, signature, secret);
}

// Create a Checkout Session for annual subscription (50€/year + IVA)
export async function createCheckoutSession(
  stripe: Stripe,
  slug: string,
  uid: string,
  email: string,
  origin: string,
  priceId: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    metadata: { slug, uid },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    automatic_tax: { enabled: true },
    success_url: `${origin}/mi-cuenta?success=1`,
    cancel_url: `${origin}/reclamar/${slug}?canceled=1`,
  });
}

// Create Stripe Customer Portal session
export async function createPortalSession(
  stripe: Stripe,
  customerId: string,
  origin: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/mi-cuenta`,
  });
}
