import { defineMiddleware } from 'astro:middleware';
import { canonicalPath } from './lib/seo';

export const onRequest = defineMiddleware(({ url, request, redirect }, next) => {
  // Scope this to public directory pages; never redirect APIs or form submissions.
  if ((request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/directorio' || url.pathname.startsWith('/directorio/'))) {
    const preferred = canonicalPath(url.pathname);
    if (preferred !== url.pathname) return redirect(preferred + url.search, 301);
  }
  return next();
});
