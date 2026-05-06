// GET /api/user/data — Get current user's subscriptions and claimed fichas
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreGet, firestoreCreate, firestoreUpdate, firestoreQuery, findListingBySlug, getAccessToken } from '../../../lib/firestore-rest';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user, error: authError } = await getAuthUser(request, apiKey);
  if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

  try {
    // Get or create user document
    let userDoc = await firestoreGet(env, 'users_asetemyt', user.user_id);
    if (!userDoc) {
      // Auto-create user doc if missing (e.g. user registered via Firebase Auth but never called /api/auth/register)
      await firestoreCreate(env, 'users_asetemyt', user.user_id, {
        uid: { stringValue: user.user_id },
        email: { stringValue: user.email || '' },
        nombre: { stringValue: '' },
        createdAt: { timestampValue: new Date().toISOString() },
        stripeCustomerId: { stringValue: '' },
        fichasReclamadas: { arrayValue: { values: [] } },
      });
      userDoc = { fichasReclamadas: [], stripeCustomerId: '' };
    }

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

          // Backfill fichasReclamadas so future queries are fast
          const currentSlugs: string[] = userDoc?.fichasReclamadas || [];
          if (!currentSlugs.includes(slug)) {
            try {
              await firestoreUpdate(env, 'users_asetemyt', user.user_id, {
                fichasReclamadas: { arrayValue: { values: [...currentSlugs, slug].map((s: string) => ({ stringValue: s })) } },
              });
              if (userDoc) userDoc.fichasReclamadas = [...currentSlugs, slug];
            } catch (e) {
              console.error('Error backfilling fichasReclamadas:', e);
            }
          }
        }
      }
    }

    // Also search by ownerEmail as additional fallback
    if (user.email) {
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
                    field: { fieldPath: 'ownerEmail' },
                    op: 'EQUAL',
                    value: { stringValue: user.email },
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

            // Backfill: also set ownerUid if missing
            if (!fields.ownerUid?.stringValue) {
              try {
                await firestoreUpdate(env, collection, doc.name.split('/').pop()!, {
                  ownerUid: { stringValue: user.user_id },
                });
              } catch (e) {
                console.error('Error setting ownerUid:', e);
              }
            }

            // Backfill fichasReclamadas
            const currentSlugs: string[] = userDoc?.fichasReclamadas || [];
            if (!currentSlugs.includes(slug)) {
              try {
                await firestoreUpdate(env, 'users_asetemyt', user.user_id, {
                  fichasReclamadas: { arrayValue: { values: [...currentSlugs, slug].map((s: string) => ({ stringValue: s })) } },
                });
                if (userDoc) userDoc.fichasReclamadas = [...currentSlugs, slug];
              } catch (e) {
                console.error('Error backfilling fichasReclamadas:', e);
              }
            }
          }
        }
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
