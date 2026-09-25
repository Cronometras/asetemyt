export const SITE_URL = 'https://asetemyt.com';

/** One preferred URL for HTML pages, independent of the requested slash variant. */
export function canonicalPath(path: string): string {
  const pathname = new URL(path, SITE_URL).pathname;
  return pathname === '/' ? '/' : `${pathname.replace(/\/+$/, '')}/`;
}

export function canonicalUrl(path: string): string {
  return SITE_URL + canonicalPath(path);
}

export function countrySlug(country: string): string {
  return country.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
}
