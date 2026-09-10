import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const store = await server.ssrLoadModule('/src/lib/firestore-rest.ts');
const publicStore = await server.ssrLoadModule('/src/lib/d1.ts');
const { isAdmin } = await server.ssrLoadModule('/src/lib/admin.ts');
const fichas = await server.ssrLoadModule('/src/pages/api/admin/fichas.ts');
const { GET: stats } = await server.ssrLoadModule('/src/pages/api/admin/stats.ts');
const { GET: health } = await server.ssrLoadModule('/src/pages/api/admin/system-status.ts');
const { GET: claims } = await server.ssrLoadModule('/src/pages/api/admin/claim-action.ts');
const { GET: leads } = await server.ssrLoadModule('/src/pages/api/admin/leads.ts');
const { GET: subscribers } = await server.ssrLoadModule('/src/pages/api/admin/subscribers.ts');
const { GET: coupons } = await server.ssrLoadModule('/src/pages/api/admin/coupons.ts');
const { GET: outreach } = await server.ssrLoadModule('/src/pages/api/admin/outreach/list.ts');
const realFetch = globalThis.fetch;
let user = { email: 'micaot@gmail.com', emailVerified: true, localId: 'owner' };
globalThis.fetch = async (url) => {
  assert.ok(String(url).startsWith('https://identitytoolkit.googleapis.com/'), 'Unexpected external request: ' + url);
  return Response.json({ users: [user] });
};
after(async () => { globalThis.fetch = realFetch; await server.close(); });

function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_consultores.sql', '0002_software.sql']) sqlite.exec(readFileSync('migrations/' + file, 'utf8'));
  sqlite.exec(`INSERT INTO consultores (id,slug,nombre,tipo,contacto,verificado) VALUES ('existing','existing','Existing','consultor','{"email":"public@example.com"}',1);`);
  sqlite.exec(readFileSync('migrations/0003_app_documents.sql', 'utf8'));
  function statement(sql, values = []) {
    const prepared = sqlite.prepare(sql);
    // D1 supports numbered and anonymous parameters. node:sqlite exposes the
    // numbered form as named bindings, so adapt only the binding transport.
    const args = /\?\d/.test(sql) ? [Object.fromEntries(values.map((v, i) => [String(i + 1), v]))] : values;
    return {
      bind: (...next) => statement(sql, next),
      all: async () => ({ results: prepared.all(...args), success: true }),
      first: async () => prepared.get(...args) || null,
      run: async () => ({ success: true, meta: prepared.run(...args) }),
    };
  }
  const DB = { prepare: statement, batch: async (statements) => {
    sqlite.exec('BEGIN');
    try { const result = []; for (const s of statements) result.push(await s.run()); sqlite.exec('COMMIT'); return result; }
    catch (e) { sqlite.exec('ROLLBACK'); throw e; }
  } };
  return { DB, sqlite };
}
function context(env, method = 'GET', body, path = '/api/admin/fichas') {
  const url = new URL('https://example.com' + path);
  return { locals: { runtime: { env } }, url, request: new Request(url, {
    method, headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) };
}
const fields = data => store.toFirestoreValue(data).mapValue.fields;

test('migration retains existing public rows and private fields never enter public output', async () => {
  const { DB, sqlite } = database();
  const env = { DB };
  const row = await store.firestoreGet(env, 'directorio_consultores_asetemyt', 'existing');
  assert.equal(row.nombre, 'Existing');
  assert.equal(row.verificado, true);
  await store.firestoreUpdate(env, 'directorio_consultores_asetemyt', 'existing', fields({ ownerUid: 'private-user', ownerEmail: 'private@example.com', contactoDesbloqueado: false, nombre: 'Edited' }));
  const publicRow = await publicStore.getConsultorBySlug(DB, 'existing');
  assert.equal(publicRow.nombre, 'Edited');
  assert.equal(publicRow.ownerUid, undefined);
  assert.equal(publicRow.ownerEmail, undefined);
  assert.equal((await store.firestoreGet(env, 'directorio_consultores_asetemyt', 'existing')).ownerUid, 'private-user');
  sqlite.close();
});

test('private records retain nulls, nested maps, arrays and unrelated fields across updates', async () => {
  const { DB, sqlite } = database(); const env = { DB };
  await store.firestoreCreate(env, 'users_asetemyt', 'one', fields({ name: 'Name', optional: null, flags: [true, 3], profile: { city: 'Madrid', country: 'ES' } }));
  await store.firestoreUpdate(env, 'users_asetemyt', 'one', fields({ 'profile.city': 'Barcelona', active: false }));
  const row = await store.firestoreGet(env, 'users_asetemyt', 'one');
  assert.deepEqual(row.profile, { city: 'Barcelona', country: 'ES' });
  assert.deepEqual(row.flags, [true, 3]); assert.equal(row.optional, null); assert.equal(row.active, false);
  assert.equal((await store.firestoreQuery(env, 'users_asetemyt', 'optional', 'EQUAL', { nullValue: null })).length, 1);
  assert.equal((await store.firestoreQuery(env, 'users_asetemyt', 'missing', 'EQUAL', { nullValue: null })).length, 0);
  assert.equal((await store.firestoreQuery(env, 'users_asetemyt', 'active', 'EQUAL', { booleanValue: false })).length, 1);
  await store.firestoreCreate(env, 'users_asetemyt', 'one', fields({ name: 'Replacement' }));
  assert.equal((await store.firestoreGet(env, 'users_asetemyt', 'one')).name, 'Name');
  sqlite.close();
});

test('admin CRUD and bulk operations update D1 and its public projection without Firebase credentials', async () => {
  const { DB, sqlite } = database(); const env = { DB, FIREBASE_API_KEY: 'test' };
  assert.equal((await fichas.POST(context(env, 'POST', { nombre: 'New', slug: 'new' }))).status, 201);
  assert.equal((await fichas.PATCH(context(env, 'PATCH', { slug: 'new', updates: { nombre: 'New name', slug: 'renamed' } }))).status, 200);
  assert.equal(await publicStore.getConsultorBySlug(DB, 'new'), null);
  assert.equal((await publicStore.getConsultorBySlug(DB, 'renamed')).nombre, 'New name');
  assert.equal((await fichas.POST(context(env, 'POST', { nombre: 'Software', slug: 'soft', seccion: 'software' }))).status, 201);
  assert.equal((await publicStore.getSoftwareBySlug(DB, 'soft')).nombre, 'Software');
  const lock = await (await fichas.PUT(context(env, 'PUT', { action: 'lock_all' }))).json();
  assert.equal(lock.updated, 2); assert.equal(lock.skipped, 1);
  assert.equal((await store.firestoreGet(env, 'directorio_consultores_asetemyt', 'new')).contactoDesbloqueado, false);
  assert.equal((await fichas.DELETE(context(env, 'DELETE', { slug: 'renamed' }))).status, 200);
  assert.equal(await publicStore.getConsultorBySlug(DB, 'renamed'), null);
  assert.equal(await store.firestoreGet(env, 'directorio_consultores_asetemyt', 'new'), null);
  assert.equal((await (await fichas.GET(context(env))).json()).fichas.length, 2);
  sqlite.close();
});

test('projection constraints roll back failed writes and bulk transactions', async () => {
  const { DB, sqlite } = database(); const env = { DB };
  await assert.rejects(store.firestoreUpdate(env, 'directorio_consultores_asetemyt', 'existing', fields({ nombre: null })));
  assert.equal((await store.firestoreGet(env, 'directorio_consultores_asetemyt', 'existing')).nombre, 'Existing');
  await assert.rejects(store.firestoreBatchUpdate(env, [
    { collection: 'directorio_consultores_asetemyt', docId: 'existing', fields: fields({ nombre: 'Should roll back' }) },
    { collection: 'directorio_consultores_asetemyt', docId: 'broken', fields: fields({ nombre: 'Missing slug' }) },
  ]));
  assert.equal((await publicStore.getConsultorBySlug(DB, 'existing')).nombre, 'Existing');
  sqlite.close();
});

test('other admins and revocation use D1, ignoring stale KV permissions', async () => {
  const { DB, sqlite } = database(); const env = { DB, BOOTSTRAP_ADMIN_EMAILS: '', CACHE: { get: async () => { throw new Error('KV should not be read'); } } };
  const other = { email: 'other@example.com', emailVerified: true };
  assert.equal(await isAdmin(env, other), false);
  await store.firestoreCreate(env, 'admins_asetemyt', other.email, fields({ role: 'admin' }));
  assert.equal(await isAdmin(env, other), true);
  await store.firestoreDelete(env, 'admins_asetemyt', other.email);
  assert.equal(await isAdmin(env, other), false);
  sqlite.close();
});

test('all migrated admin lists and dashboard load from D1 without service-account secrets', async () => {
  const { DB, sqlite } = database(); const env = { DB, FIREBASE_API_KEY: 'test' };
  await store.firestoreCreate(env, 'claims_asetemyt', 'claim', fields({ estado: 'pending', slug: 'existing' }));
  await store.firestoreCreate(env, 'leads_asetemyt', 'lead', fields({ status: 'new' }));
  await store.firestoreCreate(env, 'subscriptions_asetemyt', 'sub', fields({ status: 'active' }));
  const res = await stats(context(env)); assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.totals.consultores, 1); assert.equal(data.claims.pending, 1);
  assert.equal(data.leads.new, 1); assert.equal(data.subscriptions.active, 1);
  assert.deepEqual(data.unavailable, []); assert.equal(data.legacyPrivateDataImported, false);
  for (const endpoint of [claims, leads, subscribers, coupons, outreach]) {
    assert.equal((await endpoint(context(env))).status, 200);
  }
  const healthData = await (await health(context(env))).json();
  assert.equal(healthData.services.d1.ok, true);
  assert.equal(healthData.services.firestore, undefined);
  user = { email: 'unauthorized@example.com', emailVerified: true, localId: 'other' };
  assert.equal((await fichas.POST(context(env, 'POST', { nombre: 'Forbidden', slug: 'forbidden' }))).status, 403);
  user = { email: 'micaot@gmail.com', emailVerified: true, localId: 'owner' };
  sqlite.close();
});

test('bulk lock groups 1,000 records into ten D1 statements', async () => {
  const { DB, sqlite } = database();
  const insert = sqlite.prepare('INSERT INTO app_documents (collection,id,data) VALUES (?,?,?)');
  const collection = 'directorio_consultores_asetemyt';
  const updates = [];
  for (let i = 0; i < 1000; i++) {
    const id = 'bulk-' + i;
    insert.run(collection, id, JSON.stringify({ slug: id, nombre: id, tipo: 'consultor' }));
    updates.push({ collection, docId: id, fields: fields({ contactoDesbloqueado: false }) });
  }
  let queries = 0;
  const batch = DB.batch;
  DB.batch = async statements => { queries += statements.length; return batch(statements); };
  assert.equal(await store.firestoreBatchUpdate({ DB }, updates), 1000);
  assert.equal(queries, 10);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM app_documents WHERE json_extract(data,'$.contactoDesbloqueado') = 0").get().n, 1000);
  sqlite.close();
});

test('contact visibility changes on the next request after bulk actions without a rebuild', async () => {
  const { GET: contact } = await server.ssrLoadModule('/src/pages/api/ficha/contact.ts');
  const { DB, sqlite } = database();
  const env = { DB, FIREBASE_API_KEY: 'test' };
  await store.firestoreCreate(env, 'directorio_consultores_asetemyt', 'unverified', fields({
    slug: 'unverified', nombre: 'Unverified', tipo: 'consultor', verificado: false,
    contactoDesbloqueado: false, contacto: { email: 'contact@example.com' },
  }));
  const read = slug => contact(context(env, 'GET', undefined, '/api/ficha/contact?slug=' + slug));
  assert.deepEqual(await (await read('unverified')).json(), { locked: true, contacto: null });
  assert.equal((await fichas.PUT(context(env, 'PUT', { action: 'unlock_all' }))).status, 200);
  const unlocked = await read('unverified');
  assert.equal(unlocked.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await unlocked.json(), { locked: false, contacto: { email: 'contact@example.com' } });
  assert.equal((await fichas.PUT(context(env, 'PUT', { action: 'lock_all' }))).status, 200);
  const locked = await read('unverified');
  assert.equal(locked.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await locked.json(), { locked: true, contacto: null });
  assert.equal((await (await read('existing')).json()).locked, false, 'Verified listings remain visible');
  sqlite.close();
});
