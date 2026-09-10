// GET /api/directorio/software
// Public listing of software. Reads from Cloudflare D1.
//
// 2026-09-10 migration: same pattern as consultores.ts — D1 mirror replaces
// Firestore REST + 24h KV cache. See consultores.ts header for full rationale.

import type { APIRoute } from 'astro';
import { getDB, listSoftware } from '../../../lib/d1';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = getDB(locals);
    const software = await listSoftware(db);
    return new Response(JSON.stringify({ software, count: software.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('directorio/software error:', err);
    return new Response(JSON.stringify({ error: 'Error cargando directorio software.' }), { status: 500 });
  }
};
