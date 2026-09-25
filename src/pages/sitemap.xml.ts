// Live sitemap: use the same D1 projections as the public profile routes.
export const prerender = false;
import type { APIRoute } from 'astro';
import { getDB, listConsultores, listSoftware } from '../lib/d1';
import { canonicalPath, countrySlug } from '../lib/seo';
import glossaryTerms from '../../public/data/glossary.json';
import articles from '../../public/data/articles.json';

export const GET: APIRoute = async ({ locals }) => {
  let consultores: any[];
  let entries: any[];
  try {
    const db = getDB(locals);
    const [people, software] = await Promise.all([listConsultores(db), listSoftware(db)]);
    consultores = people;
    entries = [...people, ...software];
  } catch (error) {
    // Do not replace a valid sitemap with an empty one during a database outage.
    console.error('Error fetching entries for sitemap:', error);
    return new Response('Sitemap temporalmente no disponible', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
    });
  }

  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'weekly' },
    { url: '/directorio', priority: '0.9', changefreq: 'daily' },
    { url: '/directorio/especialidades', priority: '0.7', changefreq: 'weekly' },
    { url: '/directorio/ciudades', priority: '0.7', changefreq: 'weekly' },
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
      return { url: `/directorio/${encodeURIComponent(e.slug)}`, priority: '0.7', changefreq: 'monthly', lastmod };
    });

  // Landing pages: countries and specialties
  const countries = new Map<string, number>();
  const specialties = new Map<string, number>();
  consultores.forEach((e: any) => {
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
      const slug = countrySlug(country);
      landingPages.push({ url: `/directorio/pais/${encodeURIComponent(slug)}`, priority: '0.7', changefreq: 'weekly' });
    }
  }
  for (const [esp, count] of specialties) {
    if (count >= 2) {
      landingPages.push({ url: `/directorio/especialidad/${encodeURIComponent(esp)}`, priority: '0.7', changefreq: 'weekly' });
    }
  }

  // JSON is bundled at build time; no filesystem access in the edge runtime.
  const glossaryPages = glossaryTerms.map(t => ({
    url: `/glosario/${encodeURIComponent(t.slug)}`, priority: '0.6', changefreq: 'monthly',
  }));
  const blogPages = articles.filter(article => article.status === 'published').map(article => ({
    url: `/blog/${encodeURIComponent(article.slug)}`, priority: '0.7', changefreq: 'monthly',
  }));
  const allPages = [...staticPages, ...directoryPages, ...landingPages, ...glossaryPages, ...blogPages];

  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  const seen = new Set<string>();
  const normalizedPages = allPages
    .map(p => ({ ...p, url: canonicalPath(p.url) }))
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
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};
