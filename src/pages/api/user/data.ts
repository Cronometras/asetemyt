// GET /api/user/data — Get current user's subscriptions and claimed fichas
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreGet, firestoreCreate, firestoreUpdate, firestoreQuery, findListingBySlug } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user, error: authError } = await getAuthUser(request, apiKey);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  try {
    // 1. Get user doc + subscriptions in parallel
    const [userDoc, subs] = await Promise.all([
      firestoreGet(env, 'users_asetemyt', user.user_id),
      firestoreQuery(env, 'subscriptions_asetemyt', 'uid', 'EQUAL', { stringValue: user.user_id }),
    ]);

    // Auto-create user doc if missing
    if (!userDoc) {
      await firestoreCreate(env, 'users_asetemyt', user.user_id, {
        uid: { stringValue: user.user_id },
        email: { stringValue: user.email || '' },
        nombre: { stringValue: '' },
        createdAt: { timestampValue: new Date().toISOString() },
        stripeCustomerId: { stringValue: '' },
        fichasReclamadas: { arrayValue: { values: [] } },
      });
    }

    const fichasReclamadas: string[] = (userDoc?.fichasReclamadas || []);
    const fichasMap = new Map<string, any>();

    // 2. Look up each claimed slug (parallel)
    if (fichasReclamadas.length > 0) {
      const results = await Promise.all(
        fichasReclamadas.filter(s => s?.trim()).map(slug =>
          findListingBySlug(env, slug)
        )
      );
      for (const found of results) {
        if (!found) continue;
        const slug = found.listing.slug || found.listing.id;
        fichasMap.set(slug, {
          id: found.listing.id,
          slug,
          nombre: found.listing.nombre || slug,
          verificado: found.listing.verificado || false,
          collection: found.collection,
        });
      }
    }

    // 3. Fallback: search by ownerUid for any fichas not in fichasReclamadas (backwards compat)
    if (fichasMap.size === 0) {
      const [byUidC, byUidS] = await Promise.all([
        firestoreQuery(env, 'directorio_consultores_asetemyt', 'ownerUid', 'EQUAL', { stringValue: user.user_id }),
        firestoreQuery(env, 'directorio_software_asetemyt', 'ownerUid', 'EQUAL', { stringValue: user.user_id }),
      ]);

      for (const f of [...byUidC, ...byUidS]) {
        const slug = f.slug;
        if (!slug || fichasMap.has(slug)) continue;
        fichasMap.set(slug, {
          id: f.id, slug,
          nombre: f.nombre || slug,
          verificado: f.verificado || false,
          collection: f._from || 'directorio_consultores_asetemyt',
        });
        // Backfill: add to fichasReclamadas
        await firestoreUpdate(env, 'users_asetemyt', user.user_id, {
          fichasReclamadas: { arrayValue: { values: [...fichasReclamadas, slug].map(s => ({ stringValue: s })) } },
        }).catch(() => {});
        fichasReclamadas.push(slug);
      }
    }

    // 4. Also check by ownerEmail if still no results
    if (fichasMap.size === 0 && user.email) {
      const [byEmailC, byEmailS] = await Promise.all([
        firestoreQuery(env, 'directorio_consultores_asetemyt', 'ownerEmail', 'EQUAL', { stringValue: user.email }),
        firestoreQuery(env, 'directorio_software_asetemyt', 'ownerEmail', 'EQUAL', { stringValue: user.email }),
      ]);

      for (const f of [...byEmailC, ...byEmailS]) {
        const slug = f.slug;
        if (!slug || fichasMap.has(slug)) continue;
        fichasMap.set(slug, {
          id: f.id, slug,
          nombre: f.nombre || slug,
          verificado: f.verificado || false,
          collection: f._from || 'directorio_consultores_asetemyt',
        });
        // Backfill ownerUid + fichasReclamadas
        const collection = f._from || 'directorio_consultores_asetemyt';
        await firestoreUpdate(env, collection, f.id, {
          ownerUid: { stringValue: user.user_id },
        }).catch(() => {});
        await firestoreUpdate(env, 'users_asetemyt', user.user_id, {
          fichasReclamadas: { arrayValue: { values: [...fichasReclamadas, slug].map(s => ({ stringValue: s })) } },
        }).catch(() => {});
      }
    }

    const fichas = Array.from(fichasMap.values());

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
      fichas,
    }), { status: 200 });
  } catch (err: any) {
    console.error('Error in /api/user/data:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
