// GET /api/admin/duplicates — Detect potential duplicate directory entries
import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../lib/auth-server';
import { isAdmin } from '../../../lib/admin';
import { firestoreListAll } from '../../../lib/firestore-rest';
import { getCached } from '../../../lib/cache';

const ADMIN_CACHE_TTL = 60; // seconds — admin sees ~fresh data, quota is protected
const ADMIN_CACHE_KEY_DUPLICATES = 'cache:admin:duplicates:v1';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';
  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });

  try {
    const { duplicates, totalScanned } = await getCached(
      env,
      ADMIN_CACHE_KEY_DUPLICATES,
      async () => {
        const [consultores, software] = await Promise.all([
          firestoreListAll(env, 'directorio_consultores_asetemyt'),
          firestoreListAll(env, 'directorio_software_asetemyt'),
        ]);
        const all = [...consultores, ...software];
        const dups: any[] = [];

        // Normalize function
        const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) {
            const a = all[i], b = all[j];
            // Same name normalized
            if (norm(a.nombre) === norm(b.nombre) && a.nombre?.length > 3) {
              dups.push({ type: 'name', a: { slug: a.slug, nombre: a.nombre, id: a.id }, b: { slug: b.slug, nombre: b.nombre, id: b.id } });
              continue;
            }
            // Same website
            const wa = norm(a.contacto?.web || '').replace(/^https?/, '');
            const wb = norm(b.contacto?.web || '').replace(/^https?/, '');
            if (wa && wb && wa === wb && wa.length > 5) {
              dups.push({ type: 'web', a: { slug: a.slug, nombre: a.nombre, web: a.contacto?.web, id: a.id }, b: { slug: b.slug, nombre: b.nombre, web: b.contacto?.web, id: b.id } });
            }
          }
        }

        return { duplicates: dups.slice(0, 50), totalScanned: all.length };
      },
      ADMIN_CACHE_TTL
    );

    return new Response(JSON.stringify({ duplicates, totalScanned }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
