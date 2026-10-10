import { defineMiddleware } from 'astro:middleware';
import { canonicalPath } from './lib/seo';
import { getDB } from './lib/d1';
import { getPublicCacheGeneration } from './lib/public-cache';

// 2026-10-10: HTML read-through cache (Workers Cache API) so heavy SSR pages
// are rendered at most once per TTL/generation instead of once per hit. This
// is what keeps per-request CPU under the Workers Free 10 ms limit — a cache
// HIT returns stored HTML without running the Astro render at all.
//
// Invalidation rides on the same 'public_cache_gen' counter as the D1 data
// cache (src/lib/public-cache.ts): any write to a public listing collection
// bumps it, which changes every HTML cache key globally and instantly. TTL is
// only garbage collection for abandoned keys.
//
// Safety rules (mirrors public-cache.ts):
// - only GET on a whitelist of public content routes (never /api, /admin,
//   /login, /mi-cuenta, /checkout, forms…);
// - query strings are cached only when every param is in a fixed allowlist
//   with a plain value — anything else BYPASSES the cache (arbitrary params
//   would flood the cache store);
// - requests carrying the session cookie (asetemyt_token) bypass the cache;
// - responses with Set-Cookie or non-200 are never stored.

const SESSION_COOKIE = /(?:^|;\s*)asetemyt_token=/;

const PUBLIC_PREFIXES = [
  '/directorio/',
  '/software/',
  '/glosario/',
  '/blog/',
  '/estudio-metodos-tiempos/',
  '/politica-',
];
const PUBLIC_EXACT = new Set([
  '/',
  '/comparador/',
  '/empleo/',
  '/criterios-inclusion/',
  '/sitemap.xml',
  '/llms.txt',
  '/llms-full.txt',
]);

const PARAM_ALLOWLIST = new Set(['q', 'tipo', 'especialidad', 'ubicacion', 'provincia', 'ciudad', 'orden', 'pagina']);
const PARAM_VALUE = /^[\p{L}\p{N} .,'+&%=-]{1,80}$/u;

function isCacheableRequest(url: URL): boolean {
  const path = url.pathname;
  const whitelisted = PUBLIC_EXACT.has(path) || PUBLIC_PREFIXES.some(p => path.startsWith(p));
  if (!whitelisted) return false;
  // Sitemap / llms feeds take no params; pages only take whitelisted params.
  if (path === '/sitemap.xml' || path === '/llms.txt' || path === '/llms-full.txt') {
    return url.searchParams.size === 0;
  }
  for (const [name, value] of url.searchParams) {
    if (!PARAM_ALLOWLIST.has(name)) return false;
    if (!PARAM_VALUE.test(value)) return false;
  }
  return true;
}

function isCacheableResponse(res: Response): boolean {
  if (res.status !== 200) return false;
  if (res.headers.has('set-cookie')) return false;
  const type = res.headers.get('content-type') || '';
  return type.includes('text/html') || type.includes('xml') || type.includes('text/plain');
}

export const onRequest = defineMiddleware(async ({ url, request, locals, redirect }, next) => {
  // Scope this to public directory pages; never redirect APIs or form submissions.
  if ((request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/directorio' || url.pathname.startsWith('/directorio/'))) {
    const preferred = canonicalPath(url.pathname);
    if (preferred !== url.pathname) return redirect(preferred + url.search, 301);
  }

  if (request.method !== 'GET' || !isCacheableRequest(url)) return next();
  if (SESSION_COOKIE.test(request.headers.get('cookie') || '')) return next();

  const cache = (globalThis as any).caches?.default;
  if (!cache) return next();

  try {
    const gen = await getPublicCacheGeneration(getDB(locals));
    const key = new Request(
      `https://asetemyt-public-cache.internal/html:${url.pathname}${url.search}/g${gen}`
    );
    const hit = await cache.match(key);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set('x-html-cache', 'HIT');
      const originalCc = headers.get('x-orig-cc') || 'public, max-age=0, must-revalidate';
      headers.set('Cache-Control', originalCc);
      headers.delete('x-orig-cc');
      return new Response(hit.body, { status: hit.status, headers });
    }

    const res = await next();
    if (isCacheableResponse(res)) {
      try {
        // Store with its own TTL headers: the page's Cache-Control
        // (max-age=0, must-revalidate) would make cache.put expire instantly.
        // The original policy is preserved in x-orig-cc and restored on serve.
        const stored = new Headers(res.headers);
        const originalCc = stored.get('cache-control') || 'public, max-age=0, must-revalidate';
        stored.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        stored.set('x-orig-cc', originalCc);
        await cache.put(key, new Response(res.clone().body, { status: res.status, headers: stored }));
      } catch {
        // cache write failure — never block the response
      }
      const headers = new Headers(res.headers);
      headers.set('x-html-cache', 'MISS');
      return new Response(res.body, { status: res.status, headers });
    }
    return res;
  } catch {
    // Any cache-layer failure falls back to a plain render.
    return next();
  }
});
