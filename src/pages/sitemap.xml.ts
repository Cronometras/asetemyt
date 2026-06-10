import type { APIRoute } from 'astro';
import { getDirectoryEntries } from '../lib/firebase';
import { readFileSync } from 'fs';
import { join } from 'path';

const SITE = 'https://asetemyt.com';

// Normalize country names → ISO 3166-1 alpha-2 (for addressCountry schema use,
// and to dedupe landing page slugs)
const COUNTRY_TO_ISO: Record<string, string> = {
  'españa': 'ES', 'spain': 'ES',
  'alemania': 'DE', 'germany': 'DE',
  'méxico': 'MX', 'méjico': 'MX', 'mexico': 'MX',
  'perú': 'PE', 'peru': 'PE',
  'estados unidos': 'US', 'usa': 'US', 'us': 'US', 'united states': 'US',
  'francia': 'FR', 'france': 'FR',
  'italia': 'IT', 'italy': 'IT',
  'portugal': 'PT',
  'brasil': 'BR', 'brazil': 'BR',
  'colombia': 'CO',
  'argentina': 'AR',
  'chile': 'CL',
  'reino unido': 'GB', 'uk': 'GB', 'united kingdom': 'GB',
  'china': 'CN',
  'japón': 'JP', 'japan': 'JP',
  'india': 'IN',
};

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isoDate(d: any): string | undefined {
  if (!d) return undefined;
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

export const GET: APIRoute = async () => {
  let entries: any[] = [];
  let articles: any[] = [];
  let glossary: any[] = [];

  try {
    entries = await getDirectoryEntries();
  } catch (e) {
    console.error('Error fetching entries for sitemap:', e);
  }

  // Blog articles
  try {
    const data = readFileSync(join(process.cwd(), 'public', 'data', 'articles.json'), 'utf-8');
    articles = JSON.parse(data).filter((a: any) => a.status === 'published');
  } catch (e) {
    console.error('Sitemap: articles.json missing or invalid', e);
  }

  // Glossary
  try {
    const data = readFileSync(join(process.cwd(), 'public', 'data', 'glossary.json'), 'utf-8');
    glossary = JSON.parse(data);
  } catch (e) {
    console.error('Sitemap: glossary.json missing or invalid', e);
  }

  // --- Static pages with their (known) lastmod -------------------------
  const today = new Date().toISOString().split('T')[0];
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'weekly', lastmod: today },
    { url: '/directorio', priority: '0.9', changefreq: 'daily', lastmod: today },
    { url: '/blog', priority: '0.9', changefreq: 'daily', lastmod: today },
    { url: '/glosario', priority: '0.8', changefreq: 'weekly', lastmod: today },
    { url: '/software', priority: '0.9', changefreq: 'daily', lastmod: today },
    { url: '/comparador', priority: '0.7', changefreq: 'weekly', lastmod: today },
    { url: '/empleo', priority: '0.6', changefreq: 'daily', lastmod: today },
    { url: '/sobre', priority: '0.5', changefreq: 'monthly', lastmod: today },
    { url: '/anadir', priority: '0.5', changefreq: 'monthly', lastmod: today },
    { url: '/newsletter', priority: '0.5', changefreq: 'monthly', lastmod: today },
    { url: '/politica-de-privacidad', priority: '0.2', changefreq: 'yearly', lastmod: today },
    { url: '/politica-de-cookies', priority: '0.2', changefreq: 'yearly', lastmod: today },
  ];

  // --- Directory entries (consultores + software) ----------------------
  const directoryPages = entries
    .filter((e) => e.slug)
    .map((e) => ({
      url: `/directorio/${e.slug}`,
      priority: e.verificado ? '0.8' : '0.7',
      changefreq: 'monthly',
      lastmod: isoDate(e.updatedAt || e.createdAt),
    }));

  // --- Country, specialty, country+specialty landings -------------------
  const countries = new Map<string, number>();
  const cities = new Map<string, number>();
  const specialties = new Map<string, number>();

  entries.forEach((e: any) => {
    const countryRaw = e.ubicacion?.pais?.toLowerCase()?.trim();
    if (countryRaw) countries.set(countryRaw, (countries.get(countryRaw) || 0) + 1);
    const cityRaw = e.ubicacion?.ciudad?.toLowerCase()?.trim();
    if (cityRaw) cities.set(cityRaw, (cities.get(cityRaw) || 0) + 1);
    (e.especialidades || []).forEach((esp: string) => {
      const key = esp.toLowerCase().trim();
      specialties.set(key, (specialties.get(key) || 0) + 1);
    });
  });

  const landingPages: any[] = [];

  for (const [country, count] of countries) {
    if (count >= 2) {
      landingPages.push({
        url: `/directorio/pais/${toSlug(country)}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: today,
      });
    }
  }

  for (const [city, count] of cities) {
    if (count >= 2) {
      landingPages.push({
        url: `/directorio/ciudad/${toSlug(city)}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: today,
      });
    }
  }

  for (const [esp, count] of specialties) {
    if (count >= 2) {
      landingPages.push({
        url: `/directorio/especialidad/${toSlug(esp)}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: today,
      });
    }
  }

  // Country + specialty combos
  for (const [country, cCount] of countries) {
    if (cCount < 2) continue;
    for (const [esp, eCount] of specialties) {
      if (eCount < 2) continue;
      const matching = entries.filter((e: any) =>
        e.ubicacion?.pais?.toLowerCase()?.trim() === country &&
        (e.especialidades || []).some((s: string) => s.toLowerCase() === esp),
      );
      if (matching.length >= 2) {
        landingPages.push({
          url: `/directorio/pais/${toSlug(country)}/${toSlug(esp)}`,
          priority: '0.6',
          changefreq: 'weekly',
          lastmod: today,
        });
      }
    }
  }

  // --- Blog articles ----------------------------------------------------
  const blogPages = articles.map((a: any) => ({
    url: `/blog/${a.slug}`,
    priority: '0.7',
    changefreq: 'monthly',
    lastmod: isoDate(a.updatedAt || a.publishedAt),
  }));

  // --- Glossary ---------------------------------------------------------
  const glossaryPages = glossary.map((t: any) => ({
    url: `/glosario/${t.slug}`,
    priority: '0.6',
    changefreq: 'monthly',
    lastmod: today,
  }));

  const allPages = [
    ...staticPages,
    ...directoryPages,
    ...landingPages,
    ...blogPages,
    ...glossaryPages,
  ];

  // Build <url> entries with optional <image:image>
  const urls = allPages
    .map((p) => {
      const lastmod = p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : '';
      return `  <url>
    <loc>${SITE}${p.url}</loc>${lastmod}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Sitemap is generated from a 24h KV cache; safe to cache 1h in CDN.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
