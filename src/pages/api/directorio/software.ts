// GET /api/directorio/software
// Public listing of software. Cached 24h in KV.

import type { APIRoute } from 'astro';
import { firestoreListAll } from '../../../lib/firestore-rest';
import { getCached, CACHE_KEYS } from '../../../lib/cache';

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const software = await getCached(
      env,
      CACHE_KEYS.directorioSoftware,
      async () => {
        return await firestoreListAll(env, 'directorio_software_asetemyt');
      },
      86400
    );

    return new Response(JSON.stringify({ software, count: software.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Short browser cache — KV is authoritative (see consultores.ts).
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('directorio/software error:', err);
    return new Response(JSON.stringify({ error: 'Error cargando software.' }), { status: 500 });
  }
};
