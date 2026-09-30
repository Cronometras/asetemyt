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
const trainingApi = await server.ssrLoadModule('/src/pages/api/user/formacion.ts');
const ownerFicha = await server.ssrLoadModule('/src/pages/api/user/ficha.ts');
const casesApi = await server.ssrLoadModule('/src/pages/api/cases/index.ts');
const jobsApi = await server.ssrLoadModule('/src/pages/api/jobs/index.ts');
const reviewsApi = await server.ssrLoadModule('/src/pages/api/reviews/get.ts');
const leadSubmit = await server.ssrLoadModule('/src/pages/api/leads/submit.ts');
const reviewSubmit = await server.ssrLoadModule('/src/pages/api/reviews/submit.ts');
const claimActions = await server.ssrLoadModule('/src/pages/api/admin/claim-action.ts');
const moderation = await server.ssrLoadModule('/src/pages/api/admin/moderation.ts');
const { validateListingUpdates } = await server.ssrLoadModule('/src/lib/listing-validation.ts');

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
  sqlite.exec(readFileSync('migrations/0004_software_parametros.sql', 'utf8'));
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

test('lead form rejects malformed JSON, field types and invalid email before storage', async () => {
  const valid = { slug: 'existing', contactName: 'Ana', contactEmail: 'ana@example.com' };
  for (const body of [null, [], { ...valid, slug: {} }, { ...valid, contactName: 1 },
    { ...valid, contactEmail: 'invalid' }, { ...valid, message: [] }, { ...valid, company: 'x'.repeat(201) }]) {
    const ctx = context({}, 'POST', valid);
    ctx.request = new Request(ctx.url, { method: 'POST', body: JSON.stringify(body) });
    assert.equal((await leadSubmit.POST(ctx)).status, 400);
  }
  const ctx = context({}, 'POST', valid);
  ctx.request = new Request(ctx.url, { method: 'POST', body: '{' });
  assert.equal((await leadSubmit.POST(ctx)).status, 400);
});

test('lead notifications escape input, follow persistence and tolerate delivery failures', async () => {
  const { DB, sqlite } = database();
  const previousFetch = globalThis.fetch;
  let notifications = 0;
  const observed = [];
  try {
    globalThis.fetch = async (_url, options) => {
      notifications++;
      const saved = await store.firestoreListAll({ DB }, 'leads_asetemyt');
      const email = JSON.parse(options.body);
      observed.push({ count: saved.length, contactEmail: saved[0]?.contactEmail, html: email.html });
      return new Response('', { status: 503 });
    };
    const body = { slug: 'existing', contactName: 'Ana', contactEmail: ' ANA@example.com ', company: '<img src=x>', message: '<a href="https://evil.example">click</a>' };
    for (let i = 0; i < 5; i++) assert.equal((await leadSubmit.POST(context({ DB, RESEND_API_KEY: 'test' }, 'POST', body))).status, 201);
    assert.equal((await leadSubmit.POST(context({ DB, RESEND_API_KEY: 'test' }, 'POST', body))).status, 429);
    assert.equal(notifications, 5);
    assert.equal(observed.length, 5);
    observed.forEach((item, index) => {
      assert.equal(item.count, index + 1, 'lead must be saved before notification');
      assert.equal(item.contactEmail, 'ana@example.com');
      assert.match(item.html, /&lt;img/);
      assert.match(item.html, /&lt;a/);
      assert.doesNotMatch(item.html, /<img|<a href="https:\/\/evil/);
    });
  } finally { globalThis.fetch = previousFetch; sqlite.close(); }
});

test('failed lead persistence never sends a notification', async () => {
  const { DB, sqlite } = database();
  const previousFetch = globalThis.fetch;
  let notifications = 0;
  try {
    sqlite.exec("CREATE TRIGGER fail_lead BEFORE INSERT ON app_documents WHEN NEW.collection = 'leads_asetemyt' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;");
    globalThis.fetch = async () => { notifications++; return Response.json({}); };
    assert.equal((await leadSubmit.POST(context({ DB, RESEND_API_KEY: 'test' }, 'POST', { slug: 'existing', contactName: 'Ana', contactEmail: 'ana@example.com' }))).status, 500);
    assert.equal(notifications, 0);
    assert.equal((await store.firestoreListAll({ DB }, 'leads_asetemyt')).length, 0);
  } finally { globalThis.fetch = previousFetch; sqlite.close(); }
});

test('review statistics include all approved ratings while displaying only 50 reviews', async () => {
  const { DB, sqlite } = database();
  try {
    for (let i = 0; i < 60; i++) {
      await store.firestoreCreate({ DB }, 'reviews_asetemyt', `review-${i}`, fields({
        slug: 'existing', status: 'approved', rating: i < 50 ? 5 : 1,
        createdAt: i < 50 ? '2026-09-30' : '2026-09-01', authorEmail: 'private@example.com',
      }));
    }
    for (const [id, rating, status] of [['invalid', 'bad', 'approved'], ['fraction', 2.5, 'approved'], ['pending', 1, 'pending']]) {
      await store.firestoreCreate({ DB }, 'reviews_asetemyt', id, fields({ slug: 'existing', rating, status }));
    }
    const response = await reviewsApi.GET(context({ DB }, 'GET', undefined, '/api/reviews/get?slug=existing'));
    const payload = await response.json();
    assert.equal(payload.reviews.length, 50);
    assert.equal(payload.aggregate.totalReviews, 60);
    assert.equal(payload.aggregate.avgRating, 4.3);
    assert.deepEqual(payload.aggregate.ratingDistribution, { 1: 10, 2: 0, 3: 0, 4: 0, 5: 50 });
    assert.ok(payload.reviews.every(r => !Object.hasOwn(r, 'authorEmail')));
  } finally { sqlite.close(); }
});

test('review submission rejects malformed fields before accessing storage', async () => {
  const valid = { slug: 'existing', rating: 5, authorName: 'Ana', authorEmail: '', comment: '' };
  for (const body of [null, [], { ...valid, rating: '5' }, { ...valid, rating: 2.5 },
    { ...valid, slug: {} }, { ...valid, authorName: 3 }, { ...valid, authorName: '<b></b>' },
    { ...valid, authorEmail: {} }, { ...valid, authorEmail: 'invalid' }, { ...valid, comment: [] }]) {
    const ctx = context({}, 'POST', valid);
    ctx.request = new Request(ctx.url, { method: 'POST', body: JSON.stringify(body) });
    assert.equal((await reviewSubmit.POST(ctx)).status, 400);
  }
  const ctx = context({}, 'POST', valid);
  ctx.request = new Request(ctx.url, { method: 'POST', body: '{' });
  assert.equal((await reviewSubmit.POST(ctx)).status, 400);
});

test('valid reviews stay pending, normalize email and reject repeat submissions', async () => {
  const { DB, sqlite } = database();
  try {
    const body = { slug: 'existing', rating: 4, authorName: '<b>Ana</b>', authorEmail: ' ANA@example.com ', comment: '<b>Buen servicio</b>' };
    assert.equal((await reviewSubmit.POST(context({ DB }, 'POST', body))).status, 201);
    const [saved] = await store.firestoreListAll({ DB }, 'reviews_asetemyt');
    assert.equal(saved.status, 'pending');
    assert.equal(saved.authorEmail, 'ana@example.com');
    assert.equal(saved.authorName, 'Ana');
    assert.equal(saved.comment, 'Buen servicio');
    assert.ok(!saved.id.includes('example.com'));
    assert.equal((await reviewSubmit.POST(context({ DB }, 'POST', body))).status, 409);
  } finally { sqlite.close(); }
});

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
  const other = { email: 'other@example.com', emailVerified: true, uid: 'other-user' };
  assert.equal(await isAdmin(env, other), false);
  await store.firestoreCreate(env, 'admins_asetemyt', other.email, fields({ role: 'admin', uid: other.uid }));
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
test('admin identities must be verified and match the stored uid', async () => {
 const { DB, sqlite } = database(); const env = { DB, BOOTSTRAP_ADMIN_EMAILS: '' };
 await store.firestoreCreate(env, 'admins_asetemyt', 'admin@example.com', fields({ role:'admin', uid:'real' }));
 assert.equal(await isAdmin(env,{email:'admin@example.com',emailVerified:false,uid:'real'}),false);
 assert.equal(await isAdmin(env,{email:'admin@example.com',emailVerified:true,uid:'other'}),false);
 assert.equal(await isAdmin(env,{email:'admin@example.com',emailVerified:true}),false);
 assert.equal(await isAdmin(env,{email:'admin@example.com',emailVerified:true,uid:'real'}),true);
 sqlite.close();
});
test('case publication requires a session and listing ownership, and queues moderation', async () => {
 const { DB, sqlite }=database(); const env={DB}; user={email:'owner@example.com',emailVerified:true,localId:'owner'};
 const noAuth=context(env,'POST',{slug:'existing',title:'Case',description:'Description'}); noAuth.request.headers.delete('Authorization');
 assert.equal((await casesApi.POST(noAuth)).status,401);
 assert.equal((await casesApi.POST(context(env,'POST',{slug:'existing',title:'Case',description:'Description',authorUid:'owner'}))).status,403);
 await store.firestoreUpdate(env,'directorio_consultores_asetemyt','existing',fields({ownerUid:'owner'}));
 assert.equal((await casesApi.POST(context(env,'POST',{slug:'existing',title:'Case',description:'Description',authorUid:'forged'}))).status,201);
 const rows=await store.firestoreListAll(env,'casos_estudio_asetemyt'); assert.equal(rows[0].authorUid,'owner'); assert.equal(rows[0].status,'pending');
 sqlite.close();
});
test('public jobs and reviews exclude private fields and expired jobs',async()=>{
 const {DB,sqlite}=database(); const env={DB};
 for(const [id,date] of [['future','2099-01-01'],['expired','2000-01-01']]) await store.firestoreCreate(env,'jobs_asetemyt',id,fields({status:'active',title:id,ip:'private-ip',expiresAt:date}));
 await store.firestoreCreate(env,'reviews_asetemyt','email@example.com',fields({slug:'existing',status:'approved',rating:5,authorName:'Public name',authorEmail:'private@example.com',ip:'private-ip'}));
 const jobs=await (await jobsApi.GET(context(env))).json(); assert.equal(jobs.jobs.length,1);assert.equal(jobs.jobs[0].ip,undefined);
 const reviews=await (await reviewsApi.GET(context(env,'GET',null,'/api/reviews/get?slug=existing'))).json();assert.equal(reviews.reviews[0].authorEmail,undefined);assert.equal(reviews.reviews[0].ip,undefined);assert.equal(reviews.reviews[0].id,undefined);
 sqlite.close();
});
test('job and case forms reject invalid JSON and field types before storage', async () => {
  user = { email: 'owner@example.com', emailVerified: true, localId: 'owner' };
  for (const [api, valid, mutations] of [
    [jobsApi, { title: 'Técnico', company: 'Empresa', description: 'Oferta', contactEmail: 'hr@example.com' },
      [{ title: 4 }, { company: [] }, { location: {} }, { salary: 100 }, { type: 'invalid' }, { description: '<b></b>' }, { contactUrl: 'javascript:alert(1)' }]],
    [casesApi, { slug: 'existing', title: 'Caso', description: 'Descripción' },
      [{ slug: {} }, { title: 4 }, { results: [] }, { industry: null }, { method: false }, { description: 'x'.repeat(2001) }]],
  ]) {
    for (const body of [null, [], ...mutations.map(change => ({ ...valid, ...change }))]) {
      const ctx = context({}, 'POST', valid);
      ctx.request = new Request(ctx.url, { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body) });
      assert.equal((await api.POST(ctx)).status, 400);
    }
    const ctx = context({}, 'POST', valid);
    ctx.request = new Request(ctx.url, { method: 'POST', headers: { Authorization: 'Bearer test' }, body: '{' });
    assert.equal((await api.POST(ctx)).status, 400);
  }
});

test('job submissions normalize contact data, queue moderation and enforce daily limit', async () => {
  const { DB, sqlite } = database();
  try {
    const body = { title: 'Técnico', company: 'Empresa', description: 'Oferta', contactEmail: ' HR@example.com ', contactUrl: ' https://example.com/jobs ' };
    for (let i = 0; i < 3; i++) assert.equal((await jobsApi.POST(context({ DB }, 'POST', body))).status, 201);
    assert.equal((await jobsApi.POST(context({ DB }, 'POST', body))).status, 429);
    const rows = await store.firestoreListAll({ DB }, 'jobs_asetemyt');
    assert.equal(rows.length, 3);
    assert.ok(rows.every(row => row.status === 'pending' && row.contactEmail === 'hr@example.com' && row.contactUrl === 'https://example.com/jobs' && row.type === 'full-time'));
  } finally { sqlite.close(); }
});

test('job filters include matches beyond the first 100 and cases expose only public fields', async () => {
  const { DB, sqlite } = database();
  try {
    for (let i = 0; i < 101; i++) await store.firestoreCreate({ DB }, 'jobs_asetemyt', `job-${i}`, fields({ status: 'active', title: 'Recent', type: 'full-time', location: 'Madrid', createdAt: '2026-09-30' }));
    await store.firestoreCreate({ DB }, 'jobs_asetemyt', 'match', fields({ status: 'active', title: 'Match', type: 'freelance', location: 'Barcelona', createdAt: '2026-09-01' }));
    const jobs = await (await jobsApi.GET(context({ DB }, 'GET', undefined, '/api/jobs?type=freelance&location=barcelona'))).json();
    assert.deepEqual(jobs.jobs.map(job => job.title), ['Match']);
    await store.firestoreCreate({ DB }, 'casos_estudio_asetemyt', 'case', fields({ slug: 'existing', status: 'published', title: 'Caso', authorUid: 'private-owner', reviewedBy: 'private-admin', reviewedAt: 'private-date' }));
    const response = await casesApi.GET(context({ DB }, 'GET', undefined, '/api/cases?slug=existing'));
    assert.match(response.headers.get('Content-Type'), /application\/json/);
    assert.deepEqual((await response.json()).cases, [{ title: 'Caso' }]);
  } finally { sqlite.close(); }
});

test('claim approval changes ownership atomically without granting a paid verification',async()=>{
 const {DB,sqlite}=database(); const env={DB};user={email:'micaot@gmail.com',emailVerified:true,localId:'admin'};
 await store.firestoreUpdate(env,'directorio_consultores_asetemyt','existing',fields({verificado:false}));
 await store.firestoreCreate(env,'claims_asetemyt','claim',fields({slug:'existing',uid:'new-owner',estado:'pending'}));
 assert.equal((await claimActions.POST(context(env,'POST',{claimId:'claim',action:'approve'}))).status,200);
 const listing=await store.firestoreGet(env,'directorio_consultores_asetemyt','existing');assert.equal(listing.ownerUid,'new-owner');assert.equal(listing.verificado,false);
 assert.deepEqual((await store.firestoreGet(env,'users_asetemyt','new-owner')).fichasReclamadas,['existing']);
 await store.firestoreCreate(env,'claims_asetemyt','conflict',fields({slug:'existing',uid:'intruder',estado:'pending'}));
 assert.equal((await claimActions.POST(context(env,'POST',{claimId:'conflict',action:'approve'}))).status,409);
 assert.equal((await store.firestoreGet(env,'claims_asetemyt','conflict')).estado,'pending'); sqlite.close();
});
test('moderation requires admin and records approval audit',async()=>{
 const {DB,sqlite}=database();const env={DB};user={email:'user@example.com',emailVerified:true,localId:'normal'};
 assert.equal((await moderation.POST(context(env,'POST',{kind:'jobs',id:'job',action:'approve'}))).status,403);
 user={email:'micaot@gmail.com',emailVerified:true,localId:'admin'};
 await store.firestoreCreate(env,'jobs_asetemyt','job',fields({status:'pending',title:'Job'}));
 assert.equal((await moderation.POST(context(env,'POST',{kind:'jobs',id:'job',action:'approve'}))).status,200);
 assert.equal((await store.firestoreGet(env,'jobs_asetemyt','job')).status,'active');assert.equal((await store.firestoreListAll(env,'admin_audit')).length,1);sqlite.close();
});
test('listing validation rejects executable URLs and malformed fields',()=>{
 assert.ok(validateListingUpdates({logo:'javascript:alert(1)'}));assert.ok(validateListingUpdates({especialidades:'not-array'}));assert.ok(validateListingUpdates({contacto:{web:'data:text/html,x'}}));
 assert.equal(validateListingUpdates({descripcion:'Text',especialidades:['Lean'],contacto:{web:'https://example.com',email:'user@example.com'}}),null);
});


test('owner workspace protects requests and project editing across listings', async () => {
 const {DB,sqlite}=database(); const env={DB};
 try {
  user={email:'owner@example.com',emailVerified:true,localId:'owner'};
  await store.firestoreUpdate(env,'directorio_consultores_asetemyt','existing',fields({ownerUid:'owner'}));
  await store.firestoreCreate(env,'leads_asetemyt','lead',fields({slug:'existing',contactName:'Ana',contactEmail:'ana@example.com',status:'new',ip:'private'}));
  const read=()=>ownerFicha.GET(context(env,'GET',undefined,'/api/user/ficha?slug=existing'));
  const anonymous=context(env,'GET',undefined,'/api/user/ficha?slug=existing');anonymous.request.headers.delete('Authorization');
  assert.equal((await ownerFicha.GET(anonymous)).status,401);
  assert.equal((await (await read()).json()).leads[0].ip,undefined);
  assert.equal((await ownerFicha.PATCH(context(env,'PATCH',{slug:'existing',id:'lead',status:'contacted',ownerNotes:'Llamar mañana'}))).status,200);
  assert.equal((await store.firestoreGet(env,'leads_asetemyt','lead')).ownerNotes,'Llamar mañana');
  await store.firestoreCreate(env,'leads_asetemyt','other',fields({slug:'other',status:'new'}));
  assert.equal((await ownerFicha.PATCH(context(env,'PATCH',{slug:'existing',id:'other',status:'closed',ownerNotes:''}))).status,404);
  const project={slug:'existing',title:'Trabajo',description:'Descripción',results:'Resultado',documents:[{label:'Informe',url:'https://example.com/report.pdf'}]};
  assert.equal((await casesApi.POST(context(env,'POST',{...project,documents:[{label:'Mal',url:'javascript:alert(1)'}]}))).status,400);
  assert.equal((await casesApi.POST(context(env,'POST',project))).status,201);
  const [saved]=await store.firestoreListAll(env,'casos_estudio_asetemyt');
  await store.firestoreUpdate(env,'casos_estudio_asetemyt',saved.id,fields({status:'published'}));
  const publicCases=()=>casesApi.GET(context(env,'GET',undefined,'/api/cases?slug=existing'));
  assert.deepEqual((await (await publicCases()).json()).cases[0].documents,project.documents);
  assert.equal((await casesApi.PATCH(context(env,'PATCH',{...project,id:saved.id,action:'edit',title:'Actualizado'}))).status,200);
  assert.equal((await store.firestoreGet(env,'casos_estudio_asetemyt',saved.id)).status,'pending');
  assert.equal((await (await publicCases()).json()).cases.length,0);
  user={email:'outsider@example.com',emailVerified:true,localId:'outsider'};
  assert.equal((await read()).status,403);
  assert.equal((await ownerFicha.PATCH(context(env,'PATCH',{slug:'existing',id:'lead',status:'closed',ownerNotes:''}))).status,403);
  assert.equal((await casesApi.PATCH(context(env,'PATCH',{slug:'existing',id:saved.id,action:'withdraw'}))).status,403);
  user={email:'owner@example.com',emailVerified:true,localId:'owner'};
  await store.firestoreUpdate(env,'directorio_consultores_asetemyt','existing',fields({verificado:false}));
  assert.equal((await casesApi.PATCH(context(env,'PATCH',{...project,id:saved.id,action:'edit'}))).status,403);
  assert.equal((await casesApi.PATCH(context(env,'PATCH',{slug:'existing',id:saved.id,action:'withdraw'}))).status,200);
  assert.equal((await store.firestoreGet(env,'casos_estudio_asetemyt',saved.id)).status,'archived');
 } finally {sqlite.close();}
});

test('owner receives a saved opportunity even if admin notification fails', async()=>{
 const {DB,sqlite}=database();const previousFetch=globalThis.fetch;const recipients=[];
 try {
  await store.firestoreUpdate({DB},'directorio_consultores_asetemyt','existing',fields({ownerUid:'owner',ownerEmail:'owner@example.com'}));
  globalThis.fetch=async(url,options)=>{
   const payload=JSON.parse(options.body);recipients.push(payload.to[0]);
   assert.equal((await store.firestoreListAll({DB},'leads_asetemyt')).length,1);
   if(payload.to[0]==='info@asetemyt.com') throw new Error('Unavailable');
   assert.match(payload.html,/mi-cuenta\/ficha/);return Response.json({id:'sent'});
  };
  assert.equal((await leadSubmit.POST(context({DB,RESEND_API_KEY:'test'},'POST',{slug:'existing',contactName:'Ana',contactEmail:'ana@example.com'}))).status,201);
  assert.deepEqual(recipients,['info@asetemyt.com','owner@example.com']);
 } finally {globalThis.fetch=previousFetch;sqlite.close();}
});


test('training belongs to its listing owner and requires review after edits',async()=>{
 const {DB,sqlite}=database();const env={DB};
 try{
  user={email:'owner@example.com',emailVerified:true,localId:'owner'};
  const body={slug:'existing',action:'edit',description:'Formación a medida',courses:'Curso Lean: diagnóstico y ejercicios',methodology:'Casos prácticos',format:'Online'};
  assert.equal((await trainingApi.PATCH(context(env,'PATCH',body))).status,403);
  await store.firestoreUpdate(env,'directorio_consultores_asetemyt','existing',fields({ownerUid:'owner'}));
  assert.equal((await trainingApi.PATCH(context(env,'PATCH',{...body,courses:[]}))).status,400);
  assert.equal((await trainingApi.PATCH(context(env,'PATCH',body))).status,200);
  assert.equal((await store.firestoreGet(env,'formaciones_asetemyt','existing')).status,'pending');
  user={email:'micaot@gmail.com',emailVerified:true,localId:'admin'};
  assert.equal((await moderation.POST(context(env,'POST',{kind:'training',id:'existing',action:'approve'}))).status,200);
  assert.equal((await store.firestoreGet(env,'formaciones_asetemyt','existing')).status,'published');
  user={email:'owner@example.com',emailVerified:true,localId:'owner'};
  assert.equal((await trainingApi.PATCH(context(env,'PATCH',body))).status,200);
  assert.equal((await store.firestoreGet(env,'formaciones_asetemyt','existing')).status,'pending');
  await store.firestoreUpdate(env,'directorio_consultores_asetemyt','existing',fields({verificado:false}));
  assert.equal((await trainingApi.PATCH(context(env,'PATCH',body))).status,403);
  assert.equal((await trainingApi.PATCH(context(env,'PATCH',{slug:'existing',action:'withdraw'}))).status,200);
  user={email:'micaot@gmail.com',emailVerified:true,localId:'admin'};
  assert.equal((await moderation.POST(context(env,'POST',{kind:'training',id:'existing',action:'approve'}))).status,409);
 }finally{sqlite.close();}
});
