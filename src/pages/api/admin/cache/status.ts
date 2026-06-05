// GET /api/admin/cache/status
// Returns info about the KV cache: how many keys, total bytes, last write times.
// Useful for the admin dashboard "Cache" panel.

import type { APIRoute } from 'astro';
import { getAuthUser } from '../../../../lib/auth-server';
import { isAdmin } from '../../../../lib/admin';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env || {};
  const apiKey = env.FIREBASE_API_KEY || '';

  const { user } = await getAuthUser(request, apiKey);
  if (!user || !(await isAdmin(env, user))) {
    return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
  }

  const kv = env.CACHE || env.ASETEMYT_CACHE;
  if (!kv) {
    return new Response(JSON.stringify({
      bound: false,
      message: 'No hay KV namespace bindeada (¿local dev?).',
    }), { status: 200 });
  }

  try {
    // List all keys with the cache: prefix
    const allKeys = await kv.list({ prefix: 'cache:' });
    const keys = allKeys.keys.map((k: { name: string; expiration?: number }) => ({
      name: k.name,
      // KV returns expiration as Unix seconds; convert to ISO
      expiresAt: k.expiration ? new Date(k.expiration * 1000).toISOString() : null,
    }));

    return new Response(JSON.stringify({
      bound: true,
      count: keys.length,
      keys: keys.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
