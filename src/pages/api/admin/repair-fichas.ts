// POST /api/admin/repair-fichas — Retroactively fix fichasReclamadas for verified fichas
// This repairs data where fichas were verified (free coupon) but the slug wasn't added to fichasReclamadas
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { firestoreGet, firestoreUpdate, getAccessToken } from '../../../lib/firestore-rest';

const ADMIN_UID = 'NCCrZqW3xuhK6E2wkBGDpylStFH3';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user, error: authError } = await getAuthUser(request, apiKey);
  if (!user || user.user_id !== ADMIN_UID) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
  }

  try {
    const projectId = env.FIREBASE_PROJECT_ID || 'asetemyt-ec205';
    const token = await getAccessToken(env);
    const results: any[] = [];

    // Query all verified fichas from both collections
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
                  field: { fieldPath: 'verificado' },
                  op: 'EQUAL',
                  value: { booleanValue: true },
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
        const ownerUid = fields.ownerUid?.stringValue || '';
        
        if (!ownerUid) {
          results.push({ slug, status: 'skipped', reason: 'no ownerUid' });
          continue;
        }

        // Check if the user already has this slug in fichasReclamadas
        const userDoc = await firestoreGet(env, 'users_asetemyt', ownerUid);
        if (!userDoc) {
          results.push({ slug, ownerUid, status: 'skipped', reason: 'user doc not found' });
          continue;
        }

        const currentSlugs: string[] = userDoc.fichasReclamadas || [];
        if (currentSlugs.includes(slug)) {
          results.push({ slug, ownerUid, status: 'ok', reason: 'already in fichasReclamadas' });
          continue;
        }

        // Add slug to fichasReclamadas
        await firestoreUpdate(env, 'users_asetemyt', ownerUid, {
          fichasReclamadas: { arrayValue: { values: [...currentSlugs, slug].map((s: string) => ({ stringValue: s })) } },
        });
        results.push({ slug, ownerUid, status: 'fixed', reason: 'added to fichasReclamadas' });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
