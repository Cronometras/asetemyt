// GET /api/user/data — Get current user's subscriptions and claimed fichas
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreGet, firestoreQuery, findListingBySlug } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user, error: authError } = await getAuthUser(request, apiKey);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  try {
    // Get user document
    const userDoc = await firestoreGet(env, 'users_asetemyt', user.user_id);

    // Get subscriptions for this user
    const subs = await firestoreQuery(env, 'subscriptions_asetemyt', 'uid', 'EQUAL', { stringValue: user.user_id });

    // Get fichas details for each claimed slug
    const fichasReclamadas: string[] = userDoc?.fichasReclamadas || [];
    const fichas: any[] = [];

    for (const slug of fichasReclamadas) {
      const found = await findListingBySlug(env, slug);
      if (found) {
        fichas.push({
          id: found.listing.id,
          slug,
          nombre: found.listing.nombre || slug,
          verificado: found.listing.verificado || false,
          collection: found.collection,
        });
      }
    }

    // Filter out empty string values from fichasReclamadas
    const validFichasReclamadas = fichasReclamadas.filter((s: string) => s && s.trim());

    return new Response(JSON.stringify({
      user: {
        uid: user.user_id,
        email: user.email,
        stripeCustomerId: userDoc?.stripeCustomerId || null,
      },
      subscriptions: subs.map((s: any) => ({
        id: s.id,
        status: s.status,
        slug: s.slug,
        currentPeriodEnd: s.currentPeriodEnd,
        stripeSubscriptionId: s.stripeSubscriptionId,
      })),
      fichas: fichas.length > 0 ? fichas : validFichasReclamadas.map(slug => ({
        slug,
        nombre: slug,
        verificado: false,
      })),
    }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
