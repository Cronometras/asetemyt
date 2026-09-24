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
    const { paymentTransaction } = await server.ssrLoadModule('/src/lib/payment-store.ts');
    await paymentTransaction({ DB }, async tx => {
      await tx.put('audit_payments', 'counter', { value: 0 });
    });
    await Promise.all([1, 2].map(() => paymentTransaction({ DB }, async tx => {
      const record = await tx.get('audit_payments', 'counter');
      await tx.put('audit_payments', 'counter', { value: record.value + 1 });
    })));
    assert.equal((await store.firestoreGet({ DB }, 'audit_payments', 'counter')).value, 2);
    await assert.rejects(paymentTransaction({ DB }, async tx => {
      await tx.put('audit_payments', 'rollback', { value: 1 });
      await tx.put(collection, 'invalid-payment-listing', { nombre: 'Missing required slug' });
    }));
    assert.equal(await store.firestoreGet({ DB }, 'audit_payments', 'rollback'), null);
    await store.firestoreDelete({ DB }, collection, 'test');
    assert.equal(await DB.prepare('SELECT id FROM consultores WHERE id = ?').bind('test').first(), null);
  } finally {
    await server.close();
    await worker.dispose();
  }
});
