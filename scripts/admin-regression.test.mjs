import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, define: { 'import.meta.env.PUBLIC_FIREBASE_API_KEY': JSON.stringify('test-public-key') }, server: { middlewareMode: true }, appType: 'custom' });
const { getAuthUser } = await server.ssrLoadModule('/src/lib/auth-server.ts');
const { isAdmin, isBootstrapAdmin } = await server.ssrLoadModule('/src/lib/admin.ts');
const { firestoreGet, firestoreListAll, firestoreQuery } = await server.ssrLoadModule('/src/lib/firestore-rest.ts');
const { GET: stats } = await server.ssrLoadModule('/src/pages/api/admin/stats.ts');
const { GET: status } = await server.ssrLoadModule('/src/pages/api/admin/status.ts');
const { POST: createFicha } = await server.ssrLoadModule('/src/pages/api/admin/fichas.ts');
const realFetch = globalThis.fetch;
after(async () => { globalThis.fetch = realFetch; await server.close(); });

const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const privateKey = Buffer.from(await crypto.subtle.exportKey('pkcs8', keys.privateKey)).toString('base64');
const env = {
  FIREBASE_API_KEY: 'test-key',
  FIREBASE_SERVICE_ACCOUNT_EMAIL: 'test@example.com',
  FIREBASE_SERVICE_ACCOUNT_KEY: `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`,
};
const owner = { email: 'micaot@gmail.com', emailVerified: true, localId: 'owner-id' };
let firestoreStatus = 429;
let authUser = owner;
let calls = [];
function mockFetch() {
  calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('oauth2.googleapis.com')) return Response.json({ access_token: 'test-access', expires_in: 3600 });
    if (String(url).includes('identitytoolkit')) return Response.json({ users: [authUser] });
    if (String(url).includes('firestore.googleapis.com')) return Response.json({ error: { message: 'quota exceeded' } }, { status: firestoreStatus });
    throw new Error('Unexpected request: ' + url);
  };
}
const request = () => new Request('https://example.com/api/admin/status', { headers: { Authorization: 'Bearer test' } });

test('session validation uses the configured public key when the runtime binding is missing', async () => {
  mockFetch();
  const { user } = await getAuthUser(request(), '');
  assert.equal(user.email, owner.email);
  assert.equal(calls[0].url.endsWith('?key=test-public-key'), true);
});

test('bootstrap access requires a verified, exactly allowed email and never reads Firestore', async () => {
  mockFetch();
  assert.equal(await isAdmin(env, owner), true);
  assert.equal(calls.length, 0);
  assert.equal(isBootstrapAdmin(env, { ...owner, emailVerified: false }), false);
  assert.equal(isBootstrapAdmin(env, { ...owner, email: 'attacker@gmail.com' }), false);
  assert.equal(isBootstrapAdmin({ BOOTSTRAP_ADMIN_EMAILS: '' }, owner), false);
  assert.equal(isBootstrapAdmin({ BOOTSTRAP_ADMIN_EMAILS: ' ADMIN@example.com ' }, { email: 'admin@example.com', emailVerified: true }), true);
});

test('Firestore quota errors propagate for get, list and query; only 404 is a missing document', async () => {
  mockFetch(); firestoreStatus = 429;
  await assert.rejects(firestoreGet(env, 'admins_asetemyt', 'other@example.com'), /HTTP 429/);
  await assert.rejects(firestoreListAll(env, 'leads_asetemyt'), /HTTP 429/);
  await assert.rejects(firestoreQuery(env, 'claims_asetemyt', 'estado', 'EQUAL', { stringValue: 'pending' }), /HTTP 429/);
  firestoreStatus = 404;
  assert.equal(await firestoreGet(env, 'admins_asetemyt', 'missing@example.com'), null);
});

test('an admin lookup outage returns 503 and does not cache a false role', async () => {
  mockFetch(); firestoreStatus = 429; authUser = { ...owner, email: 'other@example.com' };
  let puts = 0;
  const CACHE = { get: async () => null, put: async () => { puts++; } };
  const res = await status({ request: request(), locals: { runtime: { env: { ...env, CACHE } } } });
  assert.equal(res.status, 503);
  assert.equal(puts, 0);
  assert.equal((await res.json()).admin, undefined);
});

test('dashboard keeps the directory visible if private data queries fail', async () => {
  mockFetch(); firestoreStatus = 429; authUser = owner;
  const DB = { prepare: (sql) => {
    if (sql.includes('app_documents')) throw new Error('Private data unavailable');
    return {
      first: async () => ({ value: 'false' }),
      all: async () => ({ results: sql.includes('FROM consultores') ? [{ id: 'one', nombre: 'Consultor', created_at: new Date().toISOString() }] : [{ id: 'two', nombre: 'Software' }] }),
    };
  } };
  const res = await stats({ request: request(), locals: { runtime: { env: { ...env, DB } } } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data.totals, { consultores: 1, software: 1, total: 2 });
  assert.equal(data.claims.pending, null);
  assert.equal(data.leads.total, null);
  assert.equal(data.subscriptions.active, null);
  assert.deepEqual(data.unavailable.sort(), ['claims', 'leads', 'subscriptions']);
  assert.equal(calls.some(c => c.options?.body?.includes('directorio_consultores_asetemyt')), false);
  assert.equal(calls.some(c => c.url.includes('/admins_asetemyt/')), false);
});

test('D1 failure is a server error, not an access denial or an empty successful dashboard', async () => {
  mockFetch(); firestoreStatus = 429; authUser = owner;
  const DB = { prepare: () => { throw new Error('D1 unavailable'); } };
  const res = await stats({ request: request(), locals: { runtime: { env: { ...env, DB } } } });
  assert.equal(res.status, 500);
});

test('creating a ficha sends Firestore fields rather than a nested mapValue document', async () => {
  mockFetch(); firestoreStatus = 200; authUser = owner;
  const req = new Request('https://example.com/api/admin/fichas', {
    method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Test ficha', slug: 'test-ficha' }),
  });
  const res = await createFicha({ request: req, locals: { runtime: { env } } });
  assert.equal(res.status, 201);
  const write = calls.find(c => c.url.includes('?documentId='));
  const payload = JSON.parse(write.options.body);
  assert.deepEqual(payload.fields.nombre, { stringValue: 'Test ficha' });
  assert.equal(payload.fields.mapValue, undefined);
});
