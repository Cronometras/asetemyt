// POST /api/stripe/checkout — Create Stripe Checkout session for verified listing
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { getStripe, createCheckoutSession } from '../../../lib/stripe-server';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';

  const { user, error: authError } = await getAuthUser(request, projectId);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  const { slug } = await request.json();
  if (!slug) return new Response(JSON.stringify({ error: 'Slug requerido' }), { status: 400 });

  const stripe = getStripe(env.STRIPE_SECRET_KEY);
  const origin = new URL(request.url).origin;
  const priceId = env.STRIPE_PRICE_ID;

  if (!priceId) return new Response(JSON.stringify({ error: 'STRIPE_PRICE_ID no configurado' }), { status: 500 });

  try {
    const session = await createCheckoutSession(stripe, slug, user.user_id, user.email || '', origin, priceId);
    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
