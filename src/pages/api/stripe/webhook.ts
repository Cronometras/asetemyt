import type { APIRoute } from 'astro';
import { getStripe } from '../../../lib/stripe-server';
import { fulfillCheckout, syncSubscription, updatePendingCheckout } from '../../../lib/stripe-fulfillment';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.DB) {
    return Response.json({ error: 'Servicio de pagos no configurado.' }, { status: 503 });
  }
  const stripe = getStripe(env.STRIPE_SECRET_KEY);
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(),
      request.headers.get('stripe-signature') || '', env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: 'Firma de Stripe no válida.' }, { status: 400 });
  }
  try {
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      await fulfillCheckout(env, stripe, event.data.object);
    } else if (['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
      await updatePendingCheckout(env, event.data.object, true);
    } else if (['invoice.paid', 'invoice.payment_succeeded', 'invoice.payment_failed',
      'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      await syncSubscription(env, stripe, event);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe event requires retry:', event.id, error instanceof Error ? error.message : 'unknown');
    // Stripe must retry transient failures and surface permanently unbound payments.
    return Response.json({ error: 'No se ha podido registrar el evento de pago.' }, { status: 503 });
  }
};
