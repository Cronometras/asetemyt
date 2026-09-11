import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: {middlewareMode: true}, appType: 'custom' });
const { fetchWithUserToken } = await server.ssrLoadModule('/src/lib/auth-fetch.ts');
const { authFailureResponse } = await server.ssrLoadModule('/src/lib/auth-server.ts');
const { GET: adminStatus } = await server.ssrLoadModule('/src/pages/api/admin/status.ts');
const originalFetch = globalThis.fetch;
const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
Object.defineProperty(globalThis, 'document', {value: {cookie: ''}, configurable: true});
after(async () => {
 globalThis.fetch = originalFetch;
 if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
 else delete globalThis.document;
 await server.close();
});

test('expired cached session refreshes once and regains admin status', async () => {
 const refreshes = [];
 let lookups = 0;
 const user = {getIdToken: async force => {refreshes.push(force); return force ? 'fresh-token' : 'expired-token';}};
 globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://identitytoolkit.googleapis.com')) {
   lookups++;
   if (JSON.parse(options.body).idToken === 'expired-token') return Response.json({error:{message:'TOKEN_EXPIRED'}},{status:400});
   return Response.json({users:[{localId:'test-owner',email:'micaot@gmail.com',emailVerified:true}]});
  }
  assert.equal(url, '/api/admin/status');
  return adminStatus({request:new Request('https://example.com'+url,options), locals:{runtime:{env:{FIREBASE_API_KEY:'test-key'}}}});
 };
 const res = await fetchWithUserToken(user, '/api/admin/status');
 assert.equal(res.status,200);
 assert.equal((await res.json()).admin,true);
 assert.deepEqual(refreshes,[false,true]);
 assert.equal(lookups,2);
 assert.ok(document.cookie.startsWith('asetemyt_token=fresh-token;'));
});

test('retry keeps request body and custom headers and stops after a second 401', async () => {
 let calls = 0;
 globalThis.fetch = async (url, options) => {
  calls++;
  assert.equal(options.method,'POST');
  assert.equal(options.body,'{"slug":"test"}');
  assert.equal(options.headers.get('Content-Type'),'application/json');
  return new Response(null,{status:401});
 };
 const res = await fetchWithUserToken({getIdToken:async ()=>'test'},'/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"slug":"test"}'});
 assert.equal(res.status,401);assert.equal(calls,2);
});

test('forbidden and unavailable responses never refresh or repeat a write', async () => {
 for(const status of [403,500,503]) {
  const refreshed=[];let requests=0;
  globalThis.fetch=async ()=>{requests++;return new Response(null,{status});};
  const res=await fetchWithUserToken({getIdToken:async force=>{refreshed.push(force);return 'test';}},'/api/test',{method:'POST'});
  assert.equal(res.status,status);assert.equal(requests,1);assert.deepEqual(refreshed,[false]);
 }
});

test('auth diagnostics distinguish service configuration from an expired session', async () => {
 for(const error of ['missing_firebase_api_key','lookup_failed_400: API_KEY_INVALID','lookup_failed_403: API_KEY_HTTP_REFERRER_BLOCKED']) {
  const res=authFailureResponse(error);assert.equal(res.status,503);assert.equal((await res.json()).code,'auth_configuration_error');
 }
 for(const error of ['no_token_found','lookup_failed_400: TOKEN_EXPIRED','token_invalid']) {
  const res=authFailureResponse(error);assert.equal(res.status,401);assert.equal(res.headers.get('Cache-Control'),'no-store');
 }
 assert.equal(authFailureResponse('lookup_failed_500: INTERNAL_ERROR').status,503);
});

test('server without Firebase env bindings uses the same public fallback as the browser', async () => {
 const {getAuthUser}=await server.ssrLoadModule('/src/lib/auth-server.ts');
 const {firebaseConfig}=await server.ssrLoadModule('/src/lib/firebase-config.ts');
 let requests=0;
 globalThis.fetch=async (url)=>{
  requests++;
  assert.equal(new URL(url).searchParams.get('key'),firebaseConfig.apiKey);
  return Response.json({users:[{localId:'test-owner',email:'micaot@gmail.com'}]});
 };
 const result=await getAuthUser(new Request('https://example.com/api/user/data',{headers:{Authorization:'Bearer test-token'}}),'');
 assert.equal(result.user.uid,'test-owner');assert.equal(requests,1);
});
