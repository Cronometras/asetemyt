import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
const server = await createServer({ configFile:false, plugins:[{name:'test-astro-middleware',resolveId(id){if(id==='astro:middleware')return '\0test-astro-middleware';},load(id){if(id==='\0test-astro-middleware')return 'export const defineMiddleware = handler => handler;';}}], server:{middlewareMode:true}, appType:'custom' });
after(async () => server.close());
const { onRequest } = await server.ssrLoadModule('/src/middleware.ts');
for (const path of ['/_image', '/_image/', '/%5Fimage', '//_image', '/_image/nested']) {
  test('unused image endpoint is blocked before downstream work: '+path, async () => {
    const url = new URL('https://asetemyt.com'+path);
    let calls=0;
    const res=await onRequest({url,request:new Request(url),locals:{}},async()=>{calls++;throw new Error('unexpected downstream execution');});
    assert.equal(res.status,404);assert.equal(calls,0);assert.equal(res.headers.get('cache-control'),'no-store');
  });
}
for (const path of ['/api/admin/status','/admin/','/login/','/mi-cuenta/','/images/logo.png']) {
  test('authentication and ordinary image routes retain their downstream handler: '+path,async()=>{
    const url=new URL('https://asetemyt.com'+path);let calls=0;
    const res=await onRequest({url,request:new Request(url),locals:{}},async()=>{calls++;return new Response('downstream',{status:401});});
    assert.equal(calls,1);assert.equal(res.status,401);assert.equal(await res.text(),'downstream');
  });
}
test('form submissions retain their request body and downstream response',async()=>{
  const url=new URL('https://asetemyt.com/api/ficha/update');const request=new Request(url,{method:'POST',body:'fixture'});
  const res=await onRequest({url,request,locals:{}},async()=>{assert.equal(await request.text(),'fixture');return new Response(null,{status:403});});
  assert.equal(res.status,403);
});
