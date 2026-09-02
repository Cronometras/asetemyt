// Build-time static sitemap. Prerendered to dist/sitemap.xml.
export const prerender = true;
import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDirectoryEntries } from '../lib/firebase';

export const GET: APIRoute = async () => {
  let entries: any[] = [];
  try {
    entries = await getDirectoryEntries();
  } catch (e) {
    console.error('Error fetching entries for sitemap:', e);
  }

  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'weekly' },
    { url: '/directorio', priority: '0.9', changefreq: 'daily' },
    { url: '/blog', priority: '0.8', changefreq: 'weekly' },
    { url: '/anadir', priority: '0.5', changefreq: 'monthly' },
    { url: '/glosario', priority: '0.8', changefreq: 'weekly' },
    { url: '/comparador', priority: '0.7', changefreq: 'weekly' },
    { url: '/empleo', priority: '0.6', changefreq: 'daily' },
    { url: '/software', priority: '0.9', changefreq: 'daily' },
    { url: '/newsletter', priority: '0.7', changefreq: 'monthly' },
    { url: '/estudio-metodos-tiempos', priority: '0.9', changefreq: 'monthly' },
  ];

  const directoryPages = entries
    .filter((e) => e.slug)
    .map((e) => {
      let lastmod: string | undefined;
      try {
        const d = e.updatedAt || e.createdAt;
        if (d) {
          const date = d instanceof Date ? d : new Date(d);
          if (!isNaN(date.getTime())) lastmod = date.toISOString().split('T')[0];
        }
      } catch {}
      return { url: `/directorio/${e.slug}`, priority: '0.7', changefreq: 'monthly', lastmod };
    });

  // Landing pages: countries and specialties
  const countries = new Map<string, number>();
  const specialties = new Map<string, number>();
  entries.forEach((e: any) => {
    const country = e.ubicacion?.pais?.toLowerCase()?.trim();
    if (country) countries.set(country, (countries.get(country) || 0) + 1);
    (e.especialidades || []).forEach((esp: string) => {
      const key = esp.toLowerCase().trim();
      specialties.set(key, (specialties.get(key) || 0) + 1);
    });
  });

  const landingPages: any[] = [];
  for (const [country, count] of countries) {
    if (count >= 2) {
      const slug = country.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
      landingPages.push({ url: `/directorio/pais/${slug}`, priority: '0.7', changefreq: 'weekly' });
    }
  }
  for (const [esp, count] of specialties) {
    if (count >= 2) {
      landingPages.push({ url: `/directorio/especialidad/${esp}`, priority: '0.7', changefreq: 'weekly' });
    }
  }

  // Glossary pages — read from filesystem (build-time safe, no self-fetch)
  let glossaryPages: any[] = [];
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'data', 'glossary.json'), 'utf-8');
    const glossaryTerms = JSON.parse(raw);
    glossaryPages = glossaryTerms.map((t: any) => ({
      url: `/glosario/${t.slug}`,
      priority: '0.6',
      changefreq: 'monthly',
    }));
  } catch (e) {
    console.error('Error reading glossary.json for sitemap:', e);
  }

  const allPages = [...staticPages, ...directoryPages, ...landingPages, ...glossaryPages];

  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  // ──────────────────────────────────────────────────────────────────────────
  // Fix indexación (2026-09-02): sitemap must point to the same URL the page
  // serves + declares as canonical. Astro/Cloudflare Pages normalizes everything
  // to trailing-slash via 308, so emitting without-slash causes Google to flag
  // every URL as "Página con redirección" (1.734 casos en Search Console).
  // We: (1) ensure trailing slash, (2) dedupe so the same URL never appears
  // twice (mix of slash/no-slash variants), (3) skip obviously empty paths.
  // ──────────────────────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const normalizedPages = allPages
    .map((p) => {
      const clean = (p.url || '').replace(/\/+$/, '');
      const withSlash = clean ? `${clean}/` : '/';
      return { ...p, url: withSlash };
    })
    .filter((p) => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${normalizedPages
  .map(
    (p) => `  <url>
    <loc>https://asetemyt.com${xmlEscape(p.url)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    ${p.lastmod ? `<lastmod>${xmlEscape(p.lastmod)}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
