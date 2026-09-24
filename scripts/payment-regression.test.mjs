import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'vite';
import Stripe from 'stripe';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
const store = await server.ssrLoadModule('/src/lib/firestore-rest.ts');
const claims = await server.ssrLoadModule('/src/lib/claim-verification.ts');
const transactions = await server.ssrLoadModule('/src/lib/payment-store.ts');
const send = await server.ssrLoadModule('/src/pages/api/ficha/send-code.ts');
const verify = await server.ssrLoadModule('/src/pages/api/ficha/verify-code.ts');
const checkout = await server.ssrLoadModule('/src/pages/api/stripe/checkout.ts');
const webhook = await server.ssrLoadModule('/src/pages/api/stripe/webhook.ts');
const status = await server.ssrLoadModule('/src/pages/api/stripe/status.ts');
const userData = await server.ssrLoadModule('/src/pages/api/user/data.ts');
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await server.close(); });

function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_consultores.sql', '0002_software.sql', '0003_app_documents.sql']) sqlite.exec(readFileSync('migrations/' + file, 'utf8'));
  function statement(sql, values = []) {
    const prepared = sqlite.prepare(sql);
    const args = /\?\d/.test(sql) ? [Object.fromEntries(values.map((v, i) => [String(i + 1), v]))] : values;
    return { bind: (...next) => statement(sql, next),
      all: async () => ({ results: prepared.all(...args) }), first: async () => prepared.get(...args) || null,
      run: () => ({ success: true, meta: prepared.run(...args) }) };
  }
  let fail = false;
  const DB = { prepare: statement, batch: async statements => {
    if (fail) { fail = false; throw new Error('Injected storage outage'); }
    sqlite.exec('BEGIN');
    try { const result = []; for (const s of statements) result.push(s.run()); sqlite.exec('COMMIT'); return result; }
    catch (e) { sqlite.exec('ROLLBACK'); throw e; }
  } };
  return { DB, sqlite, failNext: () => { fail = true; } };
}
const collection = 'directorio_consultores_asetemyt';
const secret = 'whsec_isolated_test';
const signer = new Stripe('sk_test_isolated_fake');
function context(env, body, uid = 'owner', path = '/api/test') {
  return { locals: { runtime: { env } }, request: new Request('https://example.com' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(uid ? { Authorization: 'Bearer ' + uid } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }) };
}
async function setup(t) {
  const db = database(); t.after(() => db.sqlite.close());
  const env = { DB: db.DB, RESEND_API_KEY: 're_fake', FIREBASE_API_KEY: 'firebase_fake',
    STRIPE_SECRET_KEY: 'sk_test_isolated_fake', STRIPE_PRICE_ID: 'price_test', STRIPE_WEBHOOK_SECRET: secret };
  const fields = data => store.toFirestoreValue(data).mapValue.fields;
  const put = (c, id, data) => store.firestoreUpdate(env, c, id, fields(data));
  const get = (c, id) => store.firestoreGet(env, c, id);
  await put(collection, 'listing', { slug: 'listing', nombre: 'Empresa', tipo: 'consultor', verificado: false,
    contacto: { email: 'contact@empresa.example', web: 'https://empresa.example' } });
  const emails = [], sessions = new Map(), requests = [];
  let failStripe = false, failEmail = false;
  let authOverrides = {};
  const subscription = { id: 'sub_test', status: 'active', current_period_end: 1893456000,
    metadata: { type: 'ficha' }, latest_invoice: { paid: true, status: 'paid' } };
  globalThis.fetch = async (url, options = {}) => {
    const address = String(url);
    if (address.startsWith('https://identitytoolkit.googleapis.com/')) {
      const token = JSON.parse(options.body).idToken;
      return Response.json({ users: [{ localId: token, email: token + '@account.example', ...authOverrides }] });
    }
    if (address === 'https://api.resend.com/emails') {
      emails.push(JSON.parse(options.body));
      return Response.json({}, { status: failEmail ? 500 : 200 });
    }
    if (address.startsWith('https://api.stripe.com/')) {
      requests.push({ url: address, body: options.body, headers: options.headers });
      if (failStripe) return Response.json({ error: { message: 'Injected Stripe outage', type: 'invalid_request_error' } }, { status: 400 });
      if (address.includes('/subscriptions/')) return Response.json(subscription);
      if (address.endsWith('/coupons')) return Response.json({ id: 'coupon_test' });
      if (address.endsWith('/checkout/sessions')) {
        const headers = new Headers(options.headers);
        const key = headers.get('Idempotency-Key');
        assert.ok(key, 'Checkout must have an idempotency key');
        const params = new URLSearchParams(options.body);
        if (!sessions.has(key)) sessions.set(key, { id: 'cs_test_' + (sessions.size + 1), url: 'https://checkout.stripe.com/test', status: 'open',
          payment_status: 'paid', customer: 'cus_test', subscription: 'sub_test',
          metadata: { type: 'ficha', slug: params.get('metadata[slug]'), uid: params.get('metadata[uid]'), verificationId: params.get('metadata[verificationId]') } });
        return Response.json(sessions.get(key));
      }
      if (address.includes('/checkout/sessions/')) return Response.json([...sessions.values()][0]);
    }
    throw new Error('Unexpected external request: ' + address);
  };
  const body = { slug: 'listing', email: 'contact@empresa.example', nombre: 'Owner' };
  async function sendCode(extra = {}, uid = 'owner') {
    const response = await send.POST(context(env, { ...body, ...extra }, uid));
    const code = emails.at(-1)?.text.match(/\b\d{6}\b/)?.[0];
    return { response, code };
  }
  async function start(couponCode) {
    const { response, code } = await sendCode(); assert.equal(response.status, 200);
    const input = { ...body, code, ...(couponCode ? { couponCode } : {}) };
    const verified = await verify.POST(context(env, input));
    assert.equal(verified.status, 200, JSON.stringify(await verified.clone().json()));
    return { input, session: [...sessions.values()][0], verified };
  }
  async function event(type, object, id = 'evt_test', created = 1000) {
    const payload = JSON.stringify({ id, object: 'event', type, created, data: { object } });
    const signature = await signer.webhooks.generateTestHeaderStringAsync({ payload, secret });
    return webhook.POST({ locals: { runtime: { env } }, request: new Request('https://example.com/api/stripe/webhook', {
      method: 'POST', headers: { 'stripe-signature': signature }, body: payload,
    }) });
  }
  return { ...db, env, put, get, emails, sessions, requests, subscription, body, sendCode, start, event,
    auth: value => { authOverrides = value; }, failStripe: value => { failStripe = value; }, failEmail: value => { failEmail = value; } };
}

test('claim endpoints require authentication and legacy checkout cannot skip email verification', async t => {
  const s = await setup(t);
  for (const route of [send, verify, checkout]) assert.equal((await route.POST(context(s.env, s.body, null))).status, 401);
  assert.equal((await checkout.POST(context(s.env, s.body))).status, 409);
  assert.equal(s.requests.length, 0);
});

test('email ownership is bound to published contact/domain, uid comes from authentication and sends are throttled', async t => {
  const s = await setup(t);
  assert.equal((await s.sendCode({ email: 'attacker@unrelated.example' })).response.status, 403);
  const { response } = await s.sendCode({ uid: 'injected' }); assert.equal(response.status, 200);
  const proof = await s.get(claims.VERIFICATIONS, await claims.verificationId('owner', 'listing'));
  assert.equal(proof.uid, 'owner'); assert.ok(proof.codeHash); assert.equal(proof.code, undefined);
  assert.equal((await s.sendCode()).response.status, 429);
  assert.equal(claims.ownsListingEmail({ contacto: { email: 'public@gmail.com' } }, 'public@gmail.com'), true);
  assert.equal(claims.ownsListingEmail({ contacto: { email: 'public@gmail.com' } }, 'other@gmail.com'), false);
  assert.equal(claims.ownsListingEmail({ contacto: { web: 'https://linkedin.com/company/example' } }, 'x@linkedin.com'), false);
});

test('codes cannot be used for a different user, email or listing; wrong attempts are bounded', async t => {
  const s = await setup(t); const { code } = await s.sendCode();
  for (const [extra, uid] of [[{}, 'other'], [{ email: 'other@empresa.example' }, 'owner'], [{ slug: 'other' }, 'owner']]) {
    assert.equal((await verify.POST(context(s.env, { ...s.body, code, ...extra }, uid))).status, 404);
  }
  const bad = code === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i++) assert.equal((await verify.POST(context(s.env, { ...s.body, code: bad }))).status, 400);
  assert.equal((await verify.POST(context(s.env, { ...s.body, code }))).status, 429);
});

test('expired code fails and missing Stripe configuration preserves a retryable proof', async t => {
  const s = await setup(t); const { code } = await s.sendCode();
  const id = await claims.verificationId('owner', 'listing');
  delete s.env.STRIPE_PRICE_ID;
  assert.equal((await verify.POST(context(s.env, { ...s.body, code }))).status, 503);
  assert.ok(await s.get(claims.VERIFICATIONS, id));
  s.env.STRIPE_PRICE_ID = 'price_test';
  assert.equal((await verify.POST(context(s.env, { ...s.body, code }))).status, 200);
});

test('Stripe failure and concurrent retries reuse one checkout and do not consume a coupon', async t => {
  const s = await setup(t);
  await s.put('cupones_asetemyt', 'discount', { code: 'SAVE', type: 'discount', value: 25, activo: true, maxUses: 3, usedCount: 0 });
  const { code } = await s.sendCode(); const input = { ...s.body, code, couponCode: 'SAVE' };
  s.failStripe(true);
  assert.equal((await verify.POST(context(s.env, input))).status, 503);
  assert.equal((await s.get('cupones_asetemyt', 'discount')).usedCount, 0);
  s.failStripe(false);
  const responses = await Promise.all([verify.POST(context(s.env, input)), verify.POST(context(s.env, input))]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]);
  assert.equal(s.sessions.size, 1);
  assert.equal((await s.get('cupones_asetemyt', 'discount')).usedCount, 0);
  assert.equal((await s.sendCode()).response.status, 200, 'return existing payment instead of sending another code');
  assert.equal(s.emails.length, 1);
});

test('free coupon verification is atomic and retry-safe, including creating a missing user profile', async t => {
  const s = await setup(t);
  await s.put('cupones_asetemyt', 'free', { code: 'FREE', type: 'free', value: 0, activo: true, maxUses: 1, usedCount: 0 });
  const { code } = await s.sendCode(); const input = { ...s.body, code, couponCode: 'FREE' };
  const responses = await Promise.all([verify.POST(context(s.env, input)), verify.POST(context(s.env, input))]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]);
  assert.equal((await s.get('cupones_asetemyt', 'free')).usedCount, 1);
  assert.equal((await s.get(collection, 'listing')).ownerUid, 'owner');
  assert.deepEqual((await s.get('users_asetemyt', 'owner')).fichasReclamadas, ['listing']);
  assert.equal(s.requests.length, 0);
});

test('signed paid checkout activates all records once; completed plus async replay consumes coupon once', async t => {
  const s = await setup(t);
  await s.put('cupones_asetemyt', 'discount', { code: 'SAVE', type: 'discount', value: 25, activo: true, maxUses: 3, usedCount: 0 });
  const { session } = await s.start('SAVE');
  assert.equal((await s.event('checkout.session.completed', { ...session, payment_status: 'unpaid' })).status, 200);
  assert.equal((await s.get(collection, 'listing')).verificado, false);
  assert.equal((await s.event('checkout.session.completed', session)).status, 200);
  assert.equal((await s.event('checkout.session.async_payment_succeeded', session, 'evt_other')).status, 200);
  assert.equal((await s.get(collection, 'listing')).verificado, true);
  assert.equal((await s.get('subscriptions_asetemyt', 'sub_test')).currentPeriodEnd, '2030-01-01T00:00:00.000Z');
  assert.equal((await s.get('cupones_asetemyt', 'discount')).usedCount, 1);
  assert.deepEqual((await s.get('users_asetemyt', 'owner')).fichasReclamadas, ['listing']);
  assert.equal((await s.get('claims_asetemyt', 'listing_owner')).estado, 'approved');
});

test('invalid signature is rejected; unbound paid sessions are not silently acknowledged', async t => {
  const s = await setup(t);
  assert.equal((await webhook.POST(context(s.env, { type: 'checkout.session.completed' }))).status, 400);
  const response = await s.event('checkout.session.completed', { id: 'cs_legacy', payment_status: 'paid', metadata: { slug: 'listing' }, subscription: 'sub_test', customer: 'cus_test' });
  assert.equal(response.status, 503);
  assert.equal((await s.get(collection, 'listing')).verificado, false);
});

test('database failure rolls back fulfillment and Stripe can retry without losing a paid activation', async t => {
  const s = await setup(t); const { session } = await s.start();
  s.failNext();
  assert.equal((await s.event('checkout.session.completed', session)).status, 503);
  assert.equal((await s.get(collection, 'listing')).verificado, false);
  assert.equal(await s.get('stripe_fulfillments', 'checkout:' + session.id), null);
  assert.equal((await s.event('checkout.session.completed', session)).status, 200);
  assert.equal((await s.get(collection, 'listing')).verificado, true);
});

test('renewals use absolute Stripe period; duplicates, cancellations and recovery do not add years', async t => {
  const s = await setup(t); const { session } = await s.start();
  await s.event('checkout.session.completed', session);
  s.subscription.current_period_end = 1924992000;
  const invoice = { subscription: 'sub_test' };
  await s.event('invoice.payment_succeeded', invoice);
  await s.event('invoice.payment_succeeded', invoice);
  assert.equal((await s.get('subscriptions_asetemyt', 'sub_test')).currentPeriodEnd, '2031-01-01T00:00:00.000Z');
  s.subscription.status = 'canceled';
  await s.event('customer.subscription.deleted', { id: 'sub_test' }, 'evt_cancel', 1001);
  assert.equal((await s.get(collection, 'listing')).verificado, false);
  s.subscription.status = 'active';
  await s.event('invoice.paid', { parent: { subscription_details: { subscription: 'sub_test' } } }, 'evt_restore', 1002);
  assert.equal((await s.get(collection, 'listing')).verificado, true);
});

test('a return URL cannot fake success; payment status is private and waits for fulfillment', async t => {
  const s = await setup(t); const { session } = await s.start();
  const ctx = uid => context(s.env, undefined, uid, '/api/stripe/status?session_id=' + session.id);
  assert.equal((await status.GET(ctx('other'))).status, 403);
  assert.equal((await (await status.GET(ctx('owner'))).json()).status, 'pending');
  await s.event('checkout.session.completed', session);
  assert.equal((await (await status.GET(ctx('owner'))).json()).status, 'verified');
});

test('D1 optimistic transaction retries a conflict without losing another write', async t => {
  const s = await setup(t); await s.put('audit', 'counter', { value: 0 });
  await Promise.all([1, 2].map(() => transactions.paymentTransaction(s.env, async tx => {
    const row = await tx.get('audit', 'counter');
    await tx.put('audit', 'counter', { value: row.value + 1 });
  })));
  assert.equal((await s.get('audit', 'counter')).value, 2);
});


test('legacy email recovery cannot steal a ficha from an authenticated owner', async t => {
  const s = await setup(t);
  await s.put(collection, 'listing', { ownerUid: 'actual-owner', ownerEmail: 'contact@empresa.example', verificado: true });
  for (const emailVerified of [false, true]) {
    s.auth({ email: 'contact@empresa.example', emailVerified });
    const response = await userData.GET(context(s.env, undefined, 'attacker'));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).fichas, []);
    assert.equal((await s.get(collection, 'listing')).ownerUid, 'actual-owner');
  }
});

test('actually expired codes are rejected without creating a payment', async t => {
  const s = await setup(t); const { code } = await s.sendCode();
  const id = await claims.verificationId('owner', 'listing');
  await s.put(claims.VERIFICATIONS, id, { expiresAt: Date.now() - 1000 });
  assert.equal((await verify.POST(context(s.env, { ...s.body, code }))).status, 410);
  assert.equal(s.sessions.size, 0);
});

test('trial uses a zero-upfront subscription, without an invalid one-cent card charge', async t => {
  const s = await setup(t);
  await s.put('cupones_asetemyt', 'trial', { code: 'TRIAL', type: 'trial', value: 3, activo: true, usedCount: 0 });
  const { session } = await s.start('TRIAL');
  const request = s.requests.find(r => r.url.endsWith('/checkout/sessions'));
  const params = new URLSearchParams(request.body);
  assert.equal(params.get('subscription_data[trial_period_days]'), '90');
  assert.equal(params.get('line_items[1][price_data][unit_amount]'), null);
  assert.equal(params.get('payment_method_types[0]'), null);
  s.subscription.status = 'trialing';
  assert.equal((await s.event('checkout.session.completed', { ...session, payment_status: 'no_payment_required' })).status, 200);
  assert.equal((await s.get(collection, 'listing')).verificado, true);
});

test('limited coupons reserve availability without recording a use before payment', async t => {
  const s = await setup(t);
  await s.put('cupones_asetemyt', 'last', { code: 'LAST', type: 'discount', value: 25, activo: true, maxUses: 1, usedCount: 0 });
  await s.start('LAST');
  await s.put(collection, 'second', { slug: 'second', nombre: 'Second', tipo: 'consultor', contacto: { email: 'second@empresa.example' }, verificado: false });
  const body = { slug: 'second', email: 'second@empresa.example' };
  const { response, code } = await s.sendCode(body, 'other');
  assert.equal(response.status, 200);
  assert.equal((await verify.POST(context(s.env, { ...body, code, couponCode: 'LAST' }, 'other'))).status, 409);
  assert.equal((await s.get('cupones_asetemyt', 'last')).usedCount, 0);
});

test('pending asynchronous payment blocks a second checkout until failure releases its reservation', async t => {
  const s = await setup(t); const { session } = await s.start();
  await s.event('checkout.session.completed', { ...session, payment_status: 'unpaid' });
  await s.put(claims.RESERVATIONS, 'listing', { expiresAt: 0 });
  assert.equal((await s.sendCode()).response.status, 409);
  await s.event('checkout.session.async_payment_failed', session);
  await s.put('ficha_email_limits', await claims.digest(s.body.email), { lastSent: 0 });
  assert.equal((await s.sendCode()).response.status, 200);
  assert.equal((await s.get(collection, 'listing')).verificado, false);
});
