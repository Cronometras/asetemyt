/** Only allow known listing flows as a post-login destination. */
export function claimReturnPath(search: string): string | null {
  const value = new URLSearchParams(search).get('next');
  if (value?.startsWith('/mi-cuenta/ficha/')) {
    try {
      const target = new URL(value, 'https://asetemyt.com');
      const slug = target.searchParams.get('slug');
      if (target.pathname !== '/mi-cuenta/ficha/' || target.hash || [...target.searchParams.keys()].some(key => key !== 'slug') || target.searchParams.getAll('slug').length !== 1 || !slug || slug.length > 200 || slug === '.' || slug === '..' || /[/\\\s\u0000-\u001f]/.test(slug)) return null;
      return `/mi-cuenta/ficha/?slug=${encodeURIComponent(slug)}`;
    } catch { return null; }
  }
  if (!value || !/^\/reclamar\/[^/\\?#\s]+\/?$/.test(value)) return null;
  try {
    const slug = decodeURIComponent(value.replace(/^\/reclamar\//, '').replace(/\/$/, ''));
    if (!slug || slug === '.' || slug === '..' || /[/\\\s\u0000-\u001f]/.test(slug)) return null;
    return `/reclamar/${encodeURIComponent(slug)}`;
  } catch { return null; }
}
