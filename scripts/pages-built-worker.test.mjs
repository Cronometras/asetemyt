import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
import {test} from 'node:test';
test('built Pages worker preserves public routes, access controls and signed raw webhook bodies',async()=>{
 const root=resolve('dist');let externalCalls=0;
 const worker=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:resolve('dist/_worker.js/index.js'),compatibilityDate:'2026-11-10',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{STRIPE_SECRET_KEY:'sk_test_fixture_only',STRIPE_WEBHOOK_SECRET:'whsec_fixture_only'},outboundService:()=>{externalCalls++;return new Response('Network disabled in fixture',{status:503});},serviceBindings:{ASSETS:async request=>{
  const pathname=decodeURIComponent(new URL(request.url).pathname);const path=resolve(root,'.'+pathname);
  if((path!==root&&!path.startsWith(root+'/'))||path.includes('/_worker.js/'))return new Response(null,{status:404});
  for(const candidate of [path,path+'/index.html'])try {const body=await readFile(candidate);return new Response(body,{headers:{'content-type':extname(candidate)==='.html'?'text/html':extname(candidate)==='.css'?'text/css':'application/octet-stream'}});}catch{}
  return new Response(null,{status:404});
 }}}));
 try{
  const DB=await worker.getD1Database('DB');
  for(const name of ['0001_consultores.sql','0002_software.sql','0003_app_documents.sql']){
   const sql=(await readFile('migrations/'+name,'utf8')).replace(/--[^\n]*/g,'');
   for(const statement of sql.match(/\s*CREATE TRIGGER[\s\S]*?\nEND;|[^;]+;/g)||[])await DB.prepare(statement).run();
  }
  const observations=[];
  for(const path of ['/','/directorio/','/login/','/api/admin/status','/_image?href=https://example.com/test.png']){
   const r=await worker.dispatchFetch('https://asetemyt.com'+path);const body=await r.text();observations.push({path,status:r.status,bytes:body.length});
   if(path.startsWith('/api/admin/'))assert.equal(r.status,401);
   else if(path.startsWith('/_image'))assert.equal(r.status,404);
   else {assert.equal(r.status,200,path+' '+body.slice(0,150));assert.match(body,/<html/);
    const assets=[...body.matchAll(/(?:href|src)=["'](\/_astro\/[^"']+\.(?:css|js))["']/g)].map(x=>x[1]);assert.ok(assets.some(x=>x.endsWith('.css')),'page must link styles');
    for(const asset of assets){const response=await worker.dispatchFetch('https://asetemyt.com'+asset);assert.equal(response.status,200,asset);const text=await response.text();if(asset.endsWith('.css'))assert.match(text,/\.hidden[{:]/);}
   }
  }
  const payload=JSON.stringify({id:'evt_fixture_only',type:'fixture.unhandled',data:{object:{}}});
  const timestamp=Math.floor(Date.now()/1000);const signature=createHmac('sha256','whsec_fixture_only').update(timestamp+'.'+payload).digest('hex');
  for(const [sig,status] of [[`t=${timestamp},v1=${signature}`,200],['invalid',400]]){
   const r=await worker.dispatchFetch('https://asetemyt.com/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':sig,'content-type':'application/json'},body:payload});assert.equal(r.status,status,await r.text());
  }
  assert.equal(externalCalls,0);console.log(JSON.stringify({observations,externalCalls,webhook:'signed=200 invalid=400'}));
 }finally{await worker.dispose();}
});
