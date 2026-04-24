import type { APIRoute } from 'astro';
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

  const allPages = [...staticPages, ...directoryPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>https://asetemyt.com${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    ${p.lastmod ? `<lastmod>${new Date(p.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
