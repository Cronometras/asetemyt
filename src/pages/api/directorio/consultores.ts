// GET /api/directorio/consultores
// Public listing of all consultores/empresas. Cached 24h in KV.
// Cache is invalidated by mutations (claim approval, admin edit, etc.)
// via CACHE_KEYS.directorioConsultores.
//
// Query params (client-side filtering kept simple — all data in payload):
//   - none for now; filtering happens in the browser to avoid cache fragmentation

import type { APIRoute } from 'astro';
import { firestoreListAll } from '../../../lib/firestore-rest';
import { getCached, CACHE_KEYS } from '../../../lib/cache';

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as any).runtime?.env || {};

  try {
    const consultores = await getCached(
      env,
      CACHE_KEYS.directorioConsultores,
      async () => {
        const docs = await firestoreListAll(env, 'directorio_consultores_asetemyt');
        // Normalize country names once at cache time (was done client-side before)
        const countryMap: Record<string, string> = {
          spain: 'España', españa: 'España',
          germany: 'Alemania', alemania: 'Alemania',
          mexico: 'México', 'méxico': 'México', méjico: 'México',
          peru: 'Perú', 'perú': 'Perú',
          usa: 'Estados Unidos', us: 'Estados Unidos',
          'united states': 'Estados Unidos', 'estados unidos': 'Estados Unidos',
          france: 'Francia', francia: 'Francia',
          italy: 'Italia', italia: 'Italia',
          portugal: 'Portugal',
          brazil: 'Brasil', brasil: 'Brasil',
          colombia: 'Colombia',
          argentina: 'Argentina',
          chile: 'Chile',
          uk: 'Reino Unido', 'united kingdom': 'Reino Unido', 'reino unido': 'Reino Unido',
          china: 'China',
          japan: 'Japón', 'japón': 'Japón',
          india: 'India',
        };
        return docs.map((e: any) => {
          if (e.ubicacion?.pais) {
            const norm = countryMap[e.ubicacion.pais.toLowerCase().trim()];
            if (norm) e.ubicacion.pais = norm;
          }
          return e;
        });
      },
      86400 // 24h TTL
    );

    return new Response(JSON.stringify({ consultores, count: consultores.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Browser/proxy cache is INTENTIONALLY short (60s) — KV is the
        // authoritative cache. Long max-age on a dynamic JSON endpoint
        // poisoned every visitor's browser for an hour when KV was
        // rebuilt with an empty array during the 429 incident.
        // With a 60s browser cache, a hard refresh gets fresh data
        // within a minute of the next KV repopulation.
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('directorio/consultores error:', err);
    return new Response(JSON.stringify({ error: 'Error cargando directorio.' }), { status: 500 });
  }
};
