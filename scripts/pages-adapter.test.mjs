import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPagesHandler} from '../adapter/handler.mjs';
test('dynamic requests preserve body, authorization, cookies and per-request bindings',async()=>{
 const env={DB:{fixture:true},ASSETS:{fetch(){throw new Error('unexpected assets');}}};const context={waitUntil(){}};
 const request=new Request('https://asetemyt.com/api/stripe/webhook',{method:'POST',headers:{authorization:'Bearer fixture',cookie:'asetemyt_token=fixture','stripe-signature':'fixture','cf-connecting-ip':'192.0.2.1'},body:'untouched body'});
 const response=new Response('ok',{headers:{'Set-Cookie':'fixture=1; Secure; HttpOnly'}});
 const handler=createPagesHandler({match:()=>({prerender:false}),render:async(req,options)=>{
  assert.equal(req,request);assert.equal(await req.text(),'untouched body');assert.equal(req.headers.get('authorization'),'Bearer fixture');assert.equal(req.headers.get('cookie'),'asetemyt_token=fixture');assert.equal(options.locals.runtime.env,env);assert.equal(options.locals.cfContext,context);assert.equal(options.clientAddress,'192.0.2.1');assert.equal(options.addCookieHeader,true);return response;
 }});
 assert.equal(await handler.fetch(request,env,context),response);
});
for(const route of [undefined,{prerender:true}])test('static and prerendered assets use the host binding: '+String(route?.prerender),async()=>{
 const asset=new Response('asset',{headers:{'Cache-Control':'public, max-age=300'}});let calls=0;
 const handler=createPagesHandler({match:()=>route,render(){throw new Error('unexpected render');}});
 const response=await handler.fetch(new Request('https://asetemyt.com/'),{ASSETS:{fetch:async()=>{calls++;return asset;}}},{});assert.equal(response,asset);assert.equal(calls,1);
});
test('missing assets fall through to the application error handling',async()=>{
 let calls=0;const handler=createPagesHandler({match:()=>undefined,render:async()=>{calls++;return new Response('missing',{status:404});}});
 const response=await handler.fetch(new Request('https://asetemyt.com/missing'),{ASSETS:{fetch:async()=>new Response(null,{status:404})}},{});assert.equal(response.status,404);assert.equal(calls,1);
});
test('parallel requests retain separate runtime locals',async()=>{
 const seen=[];const handler=createPagesHandler({match:()=>({prerender:false}),render:async(req,opts)=>{seen.push(opts.locals);await Promise.resolve();return new Response(opts.locals.runtime.env.marker);}});
 const responses=await Promise.all(['a','b'].map(marker=>handler.fetch(new Request('https://asetemyt.com/api/test'),{marker},{})));
 assert.notEqual(seen[0],seen[1]);assert.deepEqual(await Promise.all(responses.map(r=>r.text())),['a','b']);
});
