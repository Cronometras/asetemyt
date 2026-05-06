// GET /api/user/data — Get current user's subscriptions and claimed fichas
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreGet, firestoreQuery, findListingBySlug, getAccessToken } from '../../../lib/firestore-rest';

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

    // Get fichas details from fichasReclamadas list
    const fichasReclamadas: string[] = userDoc?.fichasReclamadas || [];
    const fichasMap = new Map<string, any>();

    for (const slug of fichasReclamadas) {
      if (!slug || !slug.trim()) continue;
      const found = await findListingBySlug(env, slug);
      if (found) {
        fichasMap.set(slug, {
          id: found.listing.id,
          slug,
          nombre: found.listing.nombre || slug,
          verificado: found.listing.verificado || false,
          collection: found.collection,
        });
      }
    }

    // Also search for fichas where ownerUid matches this user (fallback for free coupon verifications)
    const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';
    const token = await getAccessToken(env);
    for (const collection of ['directorio_consultores_asetemyt', 'directorio_software_asetemyt']) {
      const resp = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: collection }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'ownerUid' },
                  op: 'EQUAL',
                  value: { stringValue: user.user_id },
                },
              },
            },
          }),
        }
      );
      const data = await resp.json();
      for (const row of data) {
        if (!row.document) continue;
        const doc = row.document;
        const fields = doc.fields || {};
        const slug = fields.slug?.stringValue || doc.name.split('/').pop();
        if (slug && !fichasMap.has(slug)) {
          fichasMap.set(slug, {
            id: doc.name.split('/').pop(),
            slug,
            nombre: fields.nombre?.stringValue || slug,
            verificado: fields.verificado?.booleanValue || false,
            collection,
          });

          // Also backfill fichasReclamadas so future queries are fast
          if (userDoc) {
            const currentSlugs: string[] = userDoc.fichasReclamadas || [];
            if (!currentSlugs.includes(slug)) {
              const { firestoreUpdate } = await import('../../../lib/firestore-rest');
              await firestoreUpdate(env, 'users_asetemyt', user.user_id, {
                fichasReclamadas: { arrayValue: { values: [...currentSlugs, slug].map((s: string) => ({ stringValue: s })) } },
              });
              userDoc.fichasReclamadas = [...currentSlugs, slug];
            }
          }
        }
      }
    }

    const fichas = Array.from(fichasMap.values());

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
