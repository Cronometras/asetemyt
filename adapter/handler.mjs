// Standard Pages Fetch boundary. No credentials are copied or serialized.
export function createPagesHandler(app) {
 return {
  async fetch(request,env,context) {
   const route=app.match(request);
   if (!route || route.prerender) {
    const asset=await env.ASSETS.fetch(request);
    if (asset.status!==404) return asset;
   }
   const waitUntil=context?.waitUntil?.bind(context);
   const locals={runtime:{env,cf:request.cf,ctx:context,caches:globalThis.caches},cfContext:context};
   return app.render(request,{
    locals,clientAddress:request.headers.get('cf-connecting-ip')||undefined,
    addCookieHeader:true,waitUntil,
    prerenderedErrorPageFetch:(path)=>env.ASSETS.fetch(new Request(new URL(path,request.url),{method:'GET'})),
   });
  }
 };
}
