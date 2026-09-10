// GET /api/directorio/consultores
// Public listing of all consultores/empresas. Reads from Cloudflare D1.
//
// 2026-09-10 migration: was Firestore REST API + 24h KV cache (cache-bust-by-version-bump).
// Now: D1 mirror. Reads are unlimited in practice (5M rows/day free tier), no cache layer
// to invalidate. Firestore remains the source of truth for writes (claim, admin edits,
// ficha/update, anadir.astro). D1 sync happens out-of-band via the maintenance script
// scripts/sync-firestore-to-d1.py — invoked manually after batches, or via Firestore
// trigger if/when we wire it up.
//
// Country normalization: was done in-cache. D1 stores already-normalized values
// (migration script applies the same map). If a row was inserted directly into D1
// without going through the script, this normalization is a no-op pass-through.

import type { APIRoute } from 'astro';
import { getDB, listConsultores } from '../../../lib/d1';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = getDB(locals);
    const consultores = await listConsultores(db);
    return new Response(JSON.stringify({ consultores, count: consultores.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Short browser cache (60s) — D1 is fast enough that we don't need a long
        // max-age. stale-while-revalidate keeps the page snappy under bursts.
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('directorio/consultores error:', err);
    return new Response(JSON.stringify({ error: 'Error cargando directorio.' }), { status: 500 });
  }
};
