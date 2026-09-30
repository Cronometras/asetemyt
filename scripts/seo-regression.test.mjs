// Run after npm run build. All writes use an isolated, in-memory D1 database.
import { Miniflare } from 'miniflare';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('verification landing renders available benefits and subscription terms without JavaScript', () => {
  const html = readFileSync('dist/verificar-ficha/index.html', 'utf8');
  assert.match(html, /<h1[^>]*>Haz que te contacten/);
  assert.match(html, /https:\/\/asetemyt.com\/verificar-ficha\//);
  assert.match(html, /Suscripci|suscripci/);
  assert.match(html, /renovaci[oó]n autom[aá]tica|renueva autom[aá]ticamente/);
  assert.doesNotMatch(html, /Propuestas para futuras|No incluidas actualmente|Estadísticas de tu ficha/);
  assert.match(html, /proyectos y casos de estudio/);
  assert.match(html, /buzón de oportunidades/);
  assert.match(html, /50 €/);
  assert.match(html, /Impuestos no incluidos/);
  assert.match(html, /href="\/directorio\/"/);
  assert.match(html, /href="\/anadir"/);
  assert.doesNotMatch(html, /50€|clientes garantizados/);
});

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
    await db.prepare('CREATE TABLE app_documents (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(collection,id))').run();
    await db.prepare('ALTER TABLE software ADD COLUMN parametros TEXT').run();
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
      const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => { assert.doesNotMatch(match[1], /</); return JSON.parse(match[1]); });
      assert.ok(schemas.some(schema => schema.description?.includes('</script>')));
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

    await t.test('public catalog does not expose unverified contact data', async()=>{
      const response=await fetchPage('/api/directorio/consultores');
      assert.equal(response.status,200);
      const body=await response.text();assert.doesNotMatch(body,/private@example.com/);
      assert.deepEqual(JSON.parse(body).consultores[0].contacto,{});
    });

    await t.test('verified website is in server HTML and unverified website is absent', async () => {
      const website = 'https://seo-fixture.example/company';
      await db.prepare('UPDATE consultores SET contacto = ?, verificado = 0 WHERE id = ?').bind(JSON.stringify({web: website}), 'acmp').run();
      const locked = await (await fetchPage('/directorio/acmp-lean/')).text();
      assert.ok(!locked.includes('seo-fixture.example'));
      await db.prepare('UPDATE consultores SET verificado = 1 WHERE id = ?').bind('acmp').run();
      const verified = await (await fetchPage('/directorio/acmp-lean/')).text();
      const anchor = verified.match(/<a[^>]*href="https:\/\/seo-fixture\.example\/company"[^>]*>/)?.[0];
      assert.ok(anchor, 'Verified website must be crawlable without JavaScript');
      assert.match(anchor, /rel="[^"]*\bsponsored\b/);
    });

    await t.test('only approved training appears in profile HTML',async()=>{
      const payload={slug:'acmp-lean',description:'Formación industrial propia',courses:'Temario de cronometraje',methodology:'Prácticas supervisadas',format:'Presencial',status:'pending'};
      await db.prepare('INSERT INTO app_documents (collection,id,data) VALUES (?,?,?)').bind('formaciones_asetemyt','acmp-lean',JSON.stringify(payload)).run();
      assert.doesNotMatch(await (await fetchPage('/directorio/acmp-lean/')).text(),/Temario de cronometraje/);
      payload.status='published';
      await db.prepare('UPDATE app_documents SET data = ? WHERE collection = ? AND id = ?').bind(JSON.stringify(payload),'formaciones_asetemyt','acmp-lean').run();
      const html=await (await fetchPage('/directorio/acmp-lean/')).text();
      assert.match(html,/Formaciones que ofrecemos/);assert.match(html,/Temario de cronometraje/);assert.match(html,/Prácticas supervisadas/);
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
