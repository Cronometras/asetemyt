// POST /api/stripe/portal — Create Stripe Customer Portal session
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { getStripe, createPortalSession } from '../../../lib/stripe-server';
import { firestoreGet } from '../../../lib/firestore-rest';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';

  const user = await getAuthUser(request, projectId);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  // Get user's Stripe customer ID
  const userDoc = await firestoreGet(env, 'users_asetemyt', user.user_id);
  const customerId = userDoc?.stripeCustomerId;
  if (!customerId) {
    return new Response(JSON.stringify({ error: 'No tienes suscripción activa' }), { status: 400 });
  }

  const stripe = getStripe(env.STRIPE_SECRET_KEY);
  const origin = new URL(request.url).origin;

  try {
    const session = await createPortalSession(stripe, customerId, origin);
    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
