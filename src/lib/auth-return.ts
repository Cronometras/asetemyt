/** Only allow the listing verification flow as a post-login destination. */
export function claimReturnPath(search: string): string | null {
  const value = new URLSearchParams(search).get('next');
  if (!value || !/^\/reclamar\/[^/\\?#\s]+\/?$/.test(value)) return null;
  try {
    const slug = decodeURIComponent(value.replace(/^\/reclamar\//, '').replace(/\/$/, ''));
    if (!slug || slug === '.' || slug === '..' || /[/\\\s\u0000-\u001f]/.test(slug)) return null;
    return `/reclamar/${encodeURIComponent(slug)}`;
  } catch { return null; }
}
