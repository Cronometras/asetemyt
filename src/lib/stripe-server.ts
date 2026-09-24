// Keep the deployed API version while handling both legacy and current webhook shapes.
import Stripe from 'stripe';
export function getStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' as any, httpClient: Stripe.createFetchHttpClient() });
}
export async function createPortalSession(stripe: Stripe, customerId: string, origin: string): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/mi-cuenta` });
}
