// Run after npm run build. All writes use an isolated, in-memory D1 database.
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('built directory serves crawlable live data and consistent canonical URLs', async (t) => {
  const worker = new Miniflare({
    modules: ['index.js', ...readdirSync('dist/_worker.js', { recursive: true })
      .filter(path => /\.(mjs|js)$/.test(path) && path !== 'index.js')]
      .map(path => ({ type: 'ESModule', path: `dist/_worker.js/${path.replaceAll('\\', '/')}` })),
    compatibilityDate: '2025-09-01',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB'],
    kvNamespaces: ['SESSION'],
    serviceBindings: { ASSETS: () => new Response('Not found', { status: 404 }) },
  });
  try {
    const db = await worker.getD1Database('DB');
    for (const file of ['0001_consultores.sql', '0002_software.sql']) {
      const sql = readFileSync(`migrations/${file}`, 'utf8').replace(/--[^\n]*/g, '');
      for (const statement of sql.split(';').filter(s => s.trim())) await db.prepare(statement).run();
    }
    const insert = async (id, slug, name = 'ACMP Lean') => db.prepare(
      'INSERT INTO consultores (id, slug, nombre, tipo, descripcion, especialidades, ubicacion, contacto, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, slug, name, 'empresa', 'Procesos industriales </script><script>untrusted()</script>', '["lean"]', '{"pais":"España","ciudad":"Ansoáin"}', '{"email":"private@example.com"}', '2026-09-25T00:00:00Z').run();
    await insert('acmp', 'acmp-lean');
    await insert('other', 'otra-empresa', 'Otra empresa');
    const fetchPage = path => worker.dispatchFetch('https://asetemyt.com' + path, { redirect: 'manual' });

    await t.test('301 preserves filters and the canonical page does not redirect', async () => {
      for (const path of ['/directorio', '/directorio/acmp-lean', '/directorio/pais/espana', '/directorio/especialidad/lean']) {
        const response = await fetchPage(path + '?q=lean');
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('location'), path + '/?q=lean');
      }
      const response = await fetchPage('/directorio/acmp-lean/');
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.deepEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m => m[1]), ['https://asetemyt.com/directorio/acmp-lean/']);
    });

    await t.test('HTML contains actual profile links without fetching an API', async () => {
      const response = await fetchPage('/directorio/');
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /href="\/directorio\/acmp-lean\/"/);
      assert.match(html, /href="\/directorio\/otra-empresa\/"/);
      assert.doesNotMatch(html, /private@example.com/);
      const json = html.match(/<script id="directory-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
      const entries = JSON.parse(json);
      assert.equal(entries.length, 2);
      assert.match(entries[0].descripcion, /<\/script>/);
      assert.doesNotMatch(json, /<script>/);
    });

    await t.test('sitemap updates after writes, deduplicates and matches live landings', async () => {
      await insert('duplicate', 'acmp-lean');
      await insert('new', 'nueva-ficha');
      const response = await fetchPage('/sitemap.xml');
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /application\/xml/);
      const xml = await response.text();
      assert.equal((xml.match(/<loc>https:\/\/asetemyt.com\/directorio\/acmp-lean\/<\/loc>/g) || []).length, 1);
      assert.match(xml, /\/directorio\/nueva-ficha\/<\/loc>/);
      assert.match(xml, /<lastmod>2026-09-25<\/lastmod>/);
      for (const path of ['/directorio/pais/espana/', '/directorio/especialidad/lean/']) {
        assert.ok(xml.includes(`https://asetemyt.com${path}</loc>`));
        const landing = await fetchPage(path);
        assert.equal(landing.status, 200);
        assert.match(await landing.text(), /href="\/directorio\/nueva-ficha\/"/);
      }
      await db.prepare('DELETE FROM consultores WHERE id = ?').bind('new').run();
      assert.doesNotMatch(await (await fetchPage('/sitemap.xml')).text(), /\/directorio\/nueva-ficha\//);
    });

    await t.test('database failure returns 503 instead of a partial sitemap', async () => {
      await db.prepare('DROP TABLE software').run();
      const response = await fetchPage('/sitemap.xml');
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    });
  } finally {
    await worker.dispose();
  }
});
