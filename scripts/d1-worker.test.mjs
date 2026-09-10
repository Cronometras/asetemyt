import { Miniflare } from 'miniflare';
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('Cloudflare D1 binding executes migrations, parameterized patches and projection triggers', async () => {
  const worker = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok"); } }', d1Databases: ['DB'] });
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  try {
    const DB = await worker.getD1Database('DB');
    for (const name of ['0001_consultores.sql', '0002_software.sql', '0003_app_documents.sql']) {
      const sql = readFileSync('migrations/' + name, 'utf8').replace(/--[^\n]*/g, '');
      const statements = sql.match(/\s*CREATE TRIGGER[\s\S]*?\nEND;|[^;]+;/g) || [];
      for (const statement of statements) await DB.prepare(statement).run();
    }
    const store = await server.ssrLoadModule('/src/lib/firestore-rest.ts');
    const fields = data => store.toFirestoreValue(data).mapValue.fields;
    const collection = 'directorio_consultores_asetemyt';
    await store.firestoreCreate({ DB }, collection, 'test', fields({ slug: 'test', nombre: 'Original', tipo: 'consultor' }));
    await store.firestoreUpdate({ DB }, collection, 'test', fields({ nombre: 'Updated', ownerUid: 'private' }));
    assert.equal((await DB.prepare('SELECT nombre FROM consultores WHERE id = ?').bind('test').first()).nombre, 'Updated');
    await store.firestoreBatchUpdate({ DB }, [{ collection, docId: 'test', fields: fields({ contactoDesbloqueado: false }) }]);
    const found = await store.findListingBySlug({ DB }, 'test');
    assert.equal(found.listing.ownerUid, 'private');
    assert.equal(found.listing.contactoDesbloqueado, false);
    await store.firestoreDelete({ DB }, collection, 'test');
    assert.equal(await DB.prepare('SELECT id FROM consultores WHERE id = ?').bind('test').first(), null);
  } finally {
    await server.close();
    await worker.dispose();
  }
});
