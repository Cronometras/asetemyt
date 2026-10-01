import { firestoreListAll } from './firestore-rest';
export const EXCLUSIONS = 'bajas_asetemyt';
export function exclusionDomain(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  let raw = value.trim().toLowerCase().replace(/\\\./g, '.');
  if (!raw.includes('://') && raw.includes('@')) raw = raw.split('@').pop()!;
  try { const url = new URL(raw.includes('://') ? raw : 'https://' + raw); return url.hostname.replace(/^www\./, '').replace(/\.$/, ''); } catch { return ''; }
}
export function matchesExclusion(entry: any, exclusion: any): boolean {
  const domains = [entry.contacto?.web, entry.contacto?.email, entry.fichaEmail].map(exclusionDomain).filter(Boolean);
  const domain = exclusionDomain(exclusion.domain || exclusion.dominio || exclusion.id);
  const slug = exclusion.slug || exclusion.fichaSlug;
  return !!((domain && domains.some(d => d === domain || d.endsWith('.' + domain))) || (slug && entry.slug === slug));
}
export async function isDirectoryExcluded(env: any, entry: any): Promise<boolean> {
  return (await firestoreListAll(env, EXCLUSIONS)).some(e => matchesExclusion(entry, e));
}
